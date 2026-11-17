/* Local music player. Files are read only after the visitor explicitly selects them. */
(() => {
  const audio = document.getElementById("localMusicAudio");
  const openButton = document.getElementById("openMusicLibrary");
  const closeButton = document.getElementById("closeMusicLibrary");
  const reopenButton = document.getElementById("reopenMusicLibrary");
  const libraryPanel = document.getElementById("musicLibraryPanel");
  const status = document.getElementById("musicLibraryStatus");
  const trackList = document.getElementById("musicTrackList");
  const folderButton = document.getElementById("chooseMusicFolder");
  const fallbackInput = document.getElementById("musicFolderFallback");
  const dock = document.getElementById("musicPlayerDock");
  const cardNowPlaying = document.getElementById("musicCardNowPlaying");
  const cardTrack = document.getElementById("musicCardTrack");
  const dockTitle = document.getElementById("dockTrackTitle");
  const dockSource = document.getElementById("dockTrackSource");
  const playPauseButton = document.getElementById("playPauseTrack");
  const stopButton = document.getElementById("stopTrack");
  const previousButton = document.getElementById("previousTrack");
  const nextButton = document.getElementById("nextTrack");
  const shuffleButton = document.getElementById("shuffleTracks");
  const progress = document.getElementById("musicProgress");
  const currentTimeLabel = document.getElementById("musicCurrentTime");
  const durationLabel = document.getElementById("musicDuration");

  const supportedExtensions = /\.(mp3|wav|ogg|m4a|aac|flac|opus|webm)$/i;
  let tracks = [];
  let currentIndex = -1;
  let shuffle = false;
  let lastObjectUrl = null;

  function setLibraryOpen(open) {
    libraryPanel.hidden = !open;
    openButton.setAttribute("aria-expanded", String(open));
    openButton.hidden = open;
    if (open) closeButton.focus();
    else openButton.focus();
  }

  function formatTime(seconds) {
    if (!Number.isFinite(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60).toString().padStart(2, "0");
    return `${mins}:${secs}`;
  }

  function renderTracks() {
    trackList.replaceChildren();
    tracks.forEach((track, index) => {
      const item = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.className = "music-track-button";
      button.setAttribute("aria-label", `Play ${track.name}`);
      const number = document.createElement("span");
      number.className = "music-track-number";
      number.textContent = String(index + 1).padStart(2, "0");
      const name = document.createElement("span");
      name.className = "music-track-name";
      name.textContent = track.name;
      const play = document.createElement("span");
      play.className = "music-track-play";
      play.textContent = "PLAY  ▶";
      button.append(number, name, play);
      button.addEventListener("click", () => playTrack(index));
      item.appendChild(button);
      trackList.appendChild(item);
    });
  }

  function setTracks(files, sourceLabel) {
    const audioFiles = Array.from(files).filter(file => file && (file.type.startsWith("audio/") || supportedExtensions.test(file.name)));
    audioFiles.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" }));
    if (!audioFiles.length) {
      status.textContent = "No supported audio files were found in that folder. Try MP3, WAV, OGG, M4A, AAC or FLAC files.";
      return;
    }
    stopAndReleaseCurrent();
    dock.hidden = true;
    cardNowPlaying.hidden = true;
    progress.value = "0";
    currentTimeLabel.textContent = "0:00";
    durationLabel.textContent = "0:00";
    tracks = audioFiles.map(file => ({ file, name: file.name.replace(/\.[^.]+$/, ""), source: sourceLabel }));
    currentIndex = -1;
    renderTracks();
    status.textContent = `${tracks.length} track${tracks.length === 1 ? "" : "s"} ready. Select a song to start listening.`;
  }

  function stopAndReleaseCurrent() {
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
    if (lastObjectUrl) URL.revokeObjectURL(lastObjectUrl);
    lastObjectUrl = null;
  }

  async function chooseFolder() {
    if (typeof window.showDirectoryPicker !== "function") {
      status.textContent = "Folder picking is not available in this browser. Use the compatibility folder picker below.";
      fallbackInput.click();
      return;
    }
    try {
      const directory = await window.showDirectoryPicker({ mode: "read" });
      const files = [];
      async function collectAudioFiles(folder) {
        for await (const entry of folder.values()) {
          if (entry.kind === "file" && supportedExtensions.test(entry.name)) {
            files.push(await entry.getFile());
          } else if (entry.kind === "directory") {
            await collectAudioFiles(entry);
          }
        }
      }
      await collectAudioFiles(directory);
      setTracks(files, directory.name || "Selected local folder");
    } catch (error) {
      if (error && error.name === "AbortError") {
        status.textContent = "Folder selection cancelled.";
      } else {
        status.textContent = "The folder could not be read. You can try the compatibility folder picker instead.";
      }
    }
  }

  async function playTrack(index) {
    if (!tracks.length || index < 0 || index >= tracks.length) return;
    currentIndex = index;
    stopAndReleaseCurrent();
    const track = tracks[currentIndex];
    lastObjectUrl = URL.createObjectURL(track.file);
    audio.src = lastObjectUrl;
    dockTitle.textContent = track.name;
    dockSource.textContent = `Local file · ${track.source}`;
    cardTrack.textContent = track.name;
    cardNowPlaying.hidden = false;
    dock.hidden = false;
    playPauseButton.textContent = "Ⅱ";
    playPauseButton.setAttribute("aria-label", "Pause");
    try {
      await audio.play();
      setLibraryOpen(false);
      status.textContent = `Now playing: ${track.name}`;
    } catch (error) {
      playPauseButton.textContent = "▶";
      playPauseButton.setAttribute("aria-label", "Play");
      status.textContent = "Playback was blocked. Press Play in the player to start the selected track.";
    }
  }

  function nextTrack() {
    if (!tracks.length) return;
    let next = currentIndex < 0 ? 0 : (currentIndex + 1) % tracks.length;
    if (shuffle && tracks.length > 1) {
      do { next = Math.floor(Math.random() * tracks.length); } while (next === currentIndex);
    }
    playTrack(next);
  }

  function previousTrack() {
    if (!tracks.length) return;
    const previous = currentIndex <= 0 ? tracks.length - 1 : currentIndex - 1;
    playTrack(previous);
  }

  openButton.addEventListener("click", () => setLibraryOpen(true));
  closeButton.addEventListener("click", () => setLibraryOpen(false));
  reopenButton.addEventListener("click", () => setLibraryOpen(true));
  folderButton.addEventListener("click", chooseFolder);
  fallbackInput.addEventListener("change", event => {
    const files = Array.from(event.target.files || []);
    setTracks(files, "Selected folder");
    event.target.value = "";
  });

  playPauseButton.addEventListener("click", async () => {
    if (!audio.src && currentIndex >= 0) return playTrack(currentIndex);
    if (!audio.src && tracks.length) return playTrack(0);
    if (audio.paused) {
      try { await audio.play(); } catch (_) { status.textContent = "Press Play again to resume playback."; }
    } else audio.pause();
  });
  stopButton.addEventListener("click", () => {
    audio.pause();
    audio.currentTime = 0;
    playPauseButton.textContent = "▶";
    playPauseButton.setAttribute("aria-label", "Play");
  });
  previousButton.addEventListener("click", previousTrack);
  nextButton.addEventListener("click", nextTrack);
  shuffleButton.addEventListener("click", () => {
    shuffle = !shuffle;
    shuffleButton.classList.toggle("active", shuffle);
    shuffleButton.setAttribute("aria-pressed", String(shuffle));
    shuffleButton.setAttribute("aria-label", shuffle ? "Disable shuffle" : "Enable shuffle");
  });
  cardNowPlaying.addEventListener("click", event => {
    if (event.target === cardNowPlaying) setLibraryOpen(true);
  });
  progress.addEventListener("input", () => {
    if (Number.isFinite(audio.duration) && audio.duration > 0) audio.currentTime = (Number(progress.value) / 1000) * audio.duration;
  });
  audio.addEventListener("timeupdate", () => {
    if (!Number.isFinite(audio.duration) || audio.duration <= 0) return;
    progress.value = String(Math.round((audio.currentTime / audio.duration) * 1000));
    currentTimeLabel.textContent = formatTime(audio.currentTime);
    durationLabel.textContent = formatTime(audio.duration);
  });
  audio.addEventListener("loadedmetadata", () => {
    durationLabel.textContent = formatTime(audio.duration);
    progress.value = "0";
  });
  audio.addEventListener("play", () => {
    playPauseButton.textContent = "Ⅱ";
    playPauseButton.setAttribute("aria-label", "Pause");
  });
  audio.addEventListener("pause", () => {
    playPauseButton.textContent = "▶";
    playPauseButton.setAttribute("aria-label", "Play");
  });
  audio.addEventListener("ended", nextTrack);
  audio.addEventListener("error", () => {
    status.textContent = "This audio file could not be played by the browser. Try another supported audio format.";
  });

})();
