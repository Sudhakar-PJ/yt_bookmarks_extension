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

  const newVideoLoaded = () => {
    const bookmarkBtnExists = document.querySelector(".bookmark-btn");

    fetchBookmarks((bookmarks) => {
      currentVideoBookmarks = bookmarks;
    });

    if (!bookmarkBtnExists) {
      youtubeLeftControls = document.querySelector(".ytp-left-controls");
      youtubePlayer = document.querySelector("video");

      if (!youtubeLeftControls || !youtubePlayer) return;

      const bookmarkBtn = document.createElement("button");
      bookmarkBtn.className = "ytp-button bookmark-btn";
      bookmarkBtn.title = "Click to bookmark current timestamp (Alt+B)";
      bookmarkBtn.style.display = "inline-flex";
      bookmarkBtn.style.alignItems = "center";
      bookmarkBtn.style.justifyContent = "center";
      bookmarkBtn.style.verticalAlign = "top";
      
      bookmarkBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#ff0000" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0 0 3px rgba(0,0,0,0.8));">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
        </svg>
      `;

      bookmarkBtn.style.transition = "transform 0.1s ease-in-out";
      bookmarkBtn.onmouseenter = () => { bookmarkBtn.style.transform = "scale(1.15)"; };
      bookmarkBtn.onmouseleave = () => { bookmarkBtn.style.transform = "scale(1)"; };

      youtubeLeftControls.appendChild(bookmarkBtn);
      bookmarkBtn.addEventListener("click", addNewBookmarkEventHandler);
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

  // Initial check if we are already on a video page
  const urlParams = new URLSearchParams(window.location.search);
  const v = urlParams.get("v");
  if (v) {
    currentVideo = v;
    newVideoLoaded();
  }
})();

const getTime = (t) => {
  const date = new Date(0);
  date.setSeconds(t);
  const timeString = date.toISOString().slice(11, 19);
  return timeString.startsWith("00:") ? timeString.slice(3) : timeString;
};
