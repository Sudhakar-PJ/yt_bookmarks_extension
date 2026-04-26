import { getActiveTabURL } from "./utils.js";

const viewBookmarks = (currentBookmarks = []) => {
  const bookmarksElement = document.getElementById("bookmarks");
  const headerActions = document.getElementById("header-actions");
  bookmarksElement.innerHTML = "";

  if (currentBookmarks.length > 0) {
    headerActions.style.display = "block";
    currentBookmarks.forEach((bookmark) => {
      addNewBookmark(bookmarksElement, bookmark);
    });
  } else {
    headerActions.style.display = "none";
    bookmarksElement.innerHTML = `
      <div class="empty-state">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
        <p>No bookmarks yet. Click the icon on the video player to add one!</p>
      </div>
    `;
  }
};

const addNewBookmark = (bookmarksElement, bookmark) => {
  const bookmarkElement = document.createElement("div");
  bookmarkElement.className = "bookmark";
  bookmarkElement.id = "bookmark-" + bookmark.time;
  bookmarkElement.setAttribute("timestamp", bookmark.time);

  bookmarkElement.innerHTML = `
    <div class="bookmark-header">
      <div class="bookmark-title" contenteditable="true" title="Click to rename">${bookmark.desc}</div>
      <div class="bookmark-controls">
        <button class="play" title="Play from here">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
        </button>
        <button class="delete" title="Delete bookmark">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
        </button>
      </div>
    </div>
    <div class="bookmark-footer">
      <span class="timestamp">${getTime(bookmark.time)}</span>
    </div>
  `;

  // Play button event
  bookmarkElement.querySelector(".play").addEventListener("click", onPlay);
  
  // Delete button event
  bookmarkElement.querySelector(".delete").addEventListener("click", onDelete);

  // Rename event
  const titleElement = bookmarkElement.querySelector(".bookmark-title");
  titleElement.addEventListener("blur", (e) => onRename(e, bookmark.time));
  titleElement.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      titleElement.blur();
    }
  });

  bookmarksElement.appendChild(bookmarkElement);
};

const onPlay = async (e) => {
  const bookmarkElement = e.target.closest(".bookmark");
  const bookmarkTime = bookmarkElement.getAttribute("timestamp");
  const activeTab = await getActiveTabURL();

  chrome.tabs.sendMessage(activeTab.id, {
    type: "PLAY",
    value: bookmarkTime,
  });
};

const onDelete = async (e) => {
  const activeTab = await getActiveTabURL();
  const bookmarkElement = e.target.closest(".bookmark");
  const bookmarkTime = bookmarkElement.getAttribute("timestamp");

  chrome.tabs.sendMessage(activeTab.id, {
    type: "DELETE",
    value: bookmarkTime,
  }, (response) => {
    // Re-fetch and view bookmarks after deletion
    const queryParameters = activeTab.url.split("?")[1];
    const urlParameters = new URLSearchParams(queryParameters);
    const currentVideo = urlParameters.get("v");
    
    chrome.storage.sync.get([currentVideo], (data) => {
      const currentVideoBookmarks = data[currentVideo] ? JSON.parse(data[currentVideo]) : [];
      viewBookmarks(currentVideoBookmarks);
    });
  });
};

const onRename = async (e, timestamp) => {
  const newTitle = e.target.textContent;
  const activeTab = await getActiveTabURL();
  const queryParameters = activeTab.url.split("?")[1];
  const urlParameters = new URLSearchParams(queryParameters);
  const currentVideo = urlParameters.get("v");

  chrome.storage.sync.get([currentVideo], (data) => {
    let bookmarks = data[currentVideo] ? JSON.parse(data[currentVideo]) : [];
    bookmarks = bookmarks.map(b => {
      if (b.time === timestamp) {
        return { ...b, desc: newTitle };
      }
      return b;
    });

    chrome.storage.sync.set({
      [currentVideo]: JSON.stringify(bookmarks)
    });
  });
};

const getTime = (t) => {
  const date = new Date(0);
  date.setSeconds(t);
  const timeString = date.toISOString().slice(11, 19);
  return timeString.startsWith("00:") ? timeString.slice(3) : timeString;
};

document.addEventListener("DOMContentLoaded", async () => {
  const activeTab = await getActiveTabURL();
  const queryParameters = activeTab.url.split("?")[1];
  const urlParameters = new URLSearchParams(queryParameters);

  const currentVideo = urlParameters.get("v");

  if (activeTab.url.includes("youtube.com/watch") && currentVideo) {
    chrome.storage.sync.get([currentVideo], (data) => {
      const currentVideoBookmarks = data[currentVideo] ? JSON.parse(data[currentVideo]) : [];
      viewBookmarks(currentVideoBookmarks);
    });
  } else {
    const container = document.querySelector(".container");
    container.innerHTML = `
      <div class="not-youtube">
        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#ff0000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"></path><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"></polygon></svg>
        <h2 class="title" style="margin-top: 20px;">Not a YouTube Video</h2>
        <p>Please open a YouTube video to start bookmarking moments.</p>
      </div>
    `;
  }

  // Clear All functionality
  document.getElementById("clear-all")?.addEventListener("click", async () => {
    if (confirm("Are you sure you want to delete all bookmarks for this video?")) {
      const activeTab = await getActiveTabURL();
      const queryParameters = activeTab.url.split("?")[1];
      const urlParameters = new URLSearchParams(queryParameters);
      const currentVideo = urlParameters.get("v");

      chrome.storage.sync.remove([currentVideo], () => {
        viewBookmarks([]);
      });
    }
  });
});
