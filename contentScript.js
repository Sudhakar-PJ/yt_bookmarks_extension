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
      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
      </svg>
    `;

    Object.assign(bookmarkBtn.style, {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      background: "transparent",
      border: "none",
      width: "40px",
      height: "40px",
      cursor: "pointer",
      margin: "0 4px",
      transition: "transform 0.2s ease",
      zIndex: "9999",
      color: "white"
    });

    bookmarkBtn.onmouseenter = () => { bookmarkBtn.style.transform = "scale(1.2)"; };
    bookmarkBtn.onmouseleave = () => { bookmarkBtn.style.transform = "scale(1)"; };
    
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
