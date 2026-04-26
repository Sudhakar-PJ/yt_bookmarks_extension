(() => {
  let youtubeLeftControls, youtubePlayer;
  let currentVideo = "";
  let currentVideoBookmarks = [];

  const fetchBookmarks = (cb) => {
    try {
      chrome.storage.sync.get([currentVideo], (obj) => {
        cb(obj[currentVideo] ? JSON.parse(obj[currentVideo]) : []);
      });
    } catch {
      cb([]);
    }
  };

  const addNewBookmarkEventHandler = () => {
    if (!youtubePlayer || !currentVideo) return;

    const currentTime = youtubePlayer.currentTime;
    const newBookmark = {
      time: currentTime,
      desc: "Bookmark at " + getTime(currentTime),
    };

    fetchBookmarks((bookmarks) => {
      // Avoid duplicate bookmarks at exactly the same time
      if (bookmarks.some(b => Math.floor(b.time) === Math.floor(currentTime))) {
        showToast("Bookmark already exists for this second!");
        return;
      }

      const updated = [...bookmarks, newBookmark].sort((a, b) => a.time - b.time);

      chrome.storage.sync.set({
        [currentVideo]: JSON.stringify(updated),
      });

      currentVideoBookmarks = updated;
      showToast("Bookmark added at " + getTime(currentTime));
    });
  };

  const injectBookmarkButton = () => {
    const youtubeLeftControls = document.querySelector(".ytp-left-controls");
    const youtubePlayer = document.querySelector("video");

    if (!youtubeLeftControls || !youtubePlayer || document.querySelector(".bookmark-btn")) return;

    const bookmarkBtn = document.createElement("button");
    bookmarkBtn.className = "bookmark-btn";
    bookmarkBtn.title = "Save Moment (Alt+B)";
    
    bookmarkBtn.innerHTML = `
      <span style="font-size: 32px; line-height: 1;">🔖</span>
    `;

    Object.assign(bookmarkBtn.style, {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      background: "rgba(0, 0, 0, 0.6)",
      border: "2px solid #ff4d4d",
      borderRadius: "12px",
      width: "52px",
      height: "52px",
      cursor: "pointer",
      margin: "0 12px",
      transition: "all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
      zIndex: "9999",
      boxShadow: "0 0 10px rgba(255, 77, 77, 0.3)"
    });

    bookmarkBtn.onmouseenter = () => { 
      bookmarkBtn.style.transform = "scale(1.2)";
      bookmarkBtn.style.background = "rgba(0, 0, 0, 0.8)";
      bookmarkBtn.style.boxShadow = "0 0 20px rgba(255, 77, 77, 0.6)";
    };
    bookmarkBtn.onmouseleave = () => { 
      bookmarkBtn.style.transform = "scale(1)";
      bookmarkBtn.style.background = "rgba(0, 0, 0, 0.6)";
      bookmarkBtn.style.boxShadow = "0 0 10px rgba(255, 77, 77, 0.3)";
    };
    
    bookmarkBtn.addEventListener("click", addNewBookmarkEventHandler);
    youtubeLeftControls.appendChild(bookmarkBtn);
  };

  const newVideoLoaded = () => {
    fetchBookmarks((bookmarks) => {
      currentVideoBookmarks = bookmarks;
    });
    injectBookmarkButton();
  };

  const observer = new MutationObserver(() => {
    if (!document.querySelector(".bookmark-btn")) {
      injectBookmarkButton();
    }
  });

  const startObserver = () => {
    const controls = document.querySelector(".ytp-left-controls");
    if (controls) {
      observer.observe(controls, { childList: true });
    } else {
      setTimeout(startObserver, 1000);
    }
  };

  const showToast = (message) => {
    let toast = document.querySelector(".yt-bookmarker-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.className = "yt-bookmarker-toast";
      document.body.appendChild(toast);

      const style = document.createElement("style");
      style.textContent = `
        .yt-bookmarker-toast {
          position: fixed;
          bottom: 100px;
          left: 50%;
          transform: translateX(-50%);
          background-color: rgba(0, 0, 0, 0.85);
          color: white;
          padding: 10px 20px;
          border-radius: 25px;
          font-family: Roboto, Arial, sans-serif;
          font-size: 14px;
          z-index: 9999;
          opacity: 0;
          transition: opacity 0.3s, bottom 0.3s;
          pointer-events: none;
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 4px 15px rgba(0,0,0,0.5);
        }
        .yt-bookmarker-toast.show {
          opacity: 1;
          bottom: 120px;
        }
      `;
      document.head.appendChild(style);
    }

    toast.textContent = message;
    toast.classList.add("show");
    
    setTimeout(() => {
      toast.classList.remove("show");
    }, 3000);
  };

  // Keyboard shortcut listener
  document.addEventListener("keydown", (e) => {
    if (e.altKey && e.key.toLowerCase() === "b") {
      addNewBookmarkEventHandler();
    }
  });

  chrome.runtime.onMessage.addListener((obj, sender, response) => {
    const { type, value, videoId } = obj;

    if (type === "NEW") {
      currentVideo = videoId;
      newVideoLoaded();
      startObserver();
    } else if (type === "PLAY") {
      if (youtubePlayer) youtubePlayer.currentTime = value;
    } else if (type === "DELETE") {
      currentVideoBookmarks = currentVideoBookmarks.filter((b) => b.time != value);
      chrome.storage.sync.set({
        [currentVideo]: JSON.stringify(currentVideoBookmarks),
      });
      if (response) response(currentVideoBookmarks);
    }
  });

  // Initial check
  const urlParams = new URLSearchParams(window.location.search);
  const v = urlParams.get("v");
  if (v) {
    currentVideo = v;
    newVideoLoaded();
    startObserver();
  }
})();

const getTime = (t) => {
  const date = new Date(0);
  date.setSeconds(t);
  const timeString = date.toISOString().slice(11, 19);
  return timeString.startsWith("00:") ? timeString.slice(3) : timeString;
};
