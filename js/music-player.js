/* IPM Audio — local music library and virtual cassette player.
   Audio files and embedded artwork are read locally after the visitor chooses a folder. */
(() => {
  const audio = document.getElementById("localMusicAudio");

  const openButton = document.getElementById("openMusicLibrary");
  const closeButton = document.getElementById("closeMusicLibrary");
  const libraryPanel = document.getElementById("musicLibraryPanel");
  const status = document.getElementById("musicLibraryStatus");
  const trackList = document.getElementById("musicTrackList");
  const folderButton = document.getElementById("chooseMusicFolder");
  const fallbackInput = document.getElementById("musicFolderFallback");

  const cassettePlayer = document.getElementById("cassettePlayer");
  const cassetteSongTitle = document.getElementById("cassetteSongTitle");
  const cassetteArtist = document.getElementById("cassetteArtist");
  const cassetteProgress = document.getElementById("cassetteProgress");
  const cassetteCurrentTime = document.getElementById("cassetteCurrentTime");
  const cassetteDuration = document.getElementById("cassetteDuration");
  const cassetteAlbumArt = document.getElementById("cassetteAlbumArt");
  const cassetteArtworkPlaceholder = document.getElementById("cassetteArtworkPlaceholder");
  const cassetteEject = document.getElementById("cassetteEject");
  const cassetteButtons = document.querySelectorAll("[data-cassette-action]");

  const supportedExtensions = /\.(mp3|wav|ogg|m4a|aac|flac|opus|webm)$/i;

  let tracks = [];
  let currentIndex = -1;
  let lastObjectUrl = null;
  let artworkObjectUrl = null;
  let artworkRequestId = 0;

  function formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60).toString().padStart(2, "0");
    return `${minutes}:${remainingSeconds}`;
  }

  function setLibraryOpen(open) {
    libraryPanel.hidden = !open;
    openButton.setAttribute("aria-expanded", String(open));
    openButton.hidden = open;

    if (open) closeButton.focus();
    else openButton.focus();
  }

  function clearCassetteArtwork() {
    artworkRequestId += 1;
    cassetteAlbumArt.hidden = true;
    cassetteAlbumArt.removeAttribute("src");
    cassetteArtworkPlaceholder.hidden = false;

    if (artworkObjectUrl) {
      URL.revokeObjectURL(artworkObjectUrl);
      artworkObjectUrl = null;
    }
  }

  function showCassetteArtwork(blob) {
    if (artworkObjectUrl) URL.revokeObjectURL(artworkObjectUrl);
    artworkObjectUrl = URL.createObjectURL(blob);
    cassetteAlbumArt.src = artworkObjectUrl;
    cassetteAlbumArt.hidden = false;
    cassetteArtworkPlaceholder.hidden = true;
  }

  cassetteAlbumArt.addEventListener("error", () => {
    cassetteAlbumArt.hidden = true;
    cassetteAlbumArt.removeAttribute("src");
    cassetteArtworkPlaceholder.hidden = false;
    if (artworkObjectUrl) {
      URL.revokeObjectURL(artworkObjectUrl);
      artworkObjectUrl = null;
    }
  });

  function updateCassetteTrack(track) {
    cassetteSongTitle.textContent = track ? track.name : "Nothing playing";
    cassetteArtist.textContent = track
      ? (track.artist ? track.artist : `LOCAL LIBRARY · ${track.source}`)
      : "Choose a song from your library";
    clearCassetteArtwork();
  }

  function resetCassetteProgress() {
    cassetteProgress.style.width = "0%";
    cassetteCurrentTime.textContent = "0:00";
    cassetteDuration.textContent = "0:00";
  }

  function updateCassetteProgress() {
    const duration = audio.duration;

    if (!Number.isFinite(duration) || duration <= 0) {
      cassetteProgress.style.width = "0%";
      return;
    }

    const percentage = Math.min(100, (audio.currentTime / duration) * 100);
    cassetteProgress.style.width = `${percentage}%`;
    cassetteCurrentTime.textContent = formatTime(audio.currentTime);
    cassetteDuration.textContent = formatTime(duration);
  }

  function readUint32(view, offset) {
    return view.getUint32(offset, false);
  }

  function readSynchsafe(view, offset) {
    return (view.getUint8(offset) << 21) |
      (view.getUint8(offset + 1) << 14) |
      (view.getUint8(offset + 2) << 7) |
      view.getUint8(offset + 3);
  }

  async function extractFlacArtwork(file) {
    const header = new Uint8Array(await file.slice(0, 10).arrayBuffer());
    let offset = 0;

    // Some FLAC files have an ID3 tag before the native FLAC marker.
    if (header[0] === 0x49 && header[1] === 0x44 && header[2] === 0x33 && header.length >= 10) {
      const view = new DataView(header.buffer, header.byteOffset, header.byteLength);
      offset = 10 + readSynchsafe(view, 6);
    }

    const marker = new Uint8Array(await file.slice(offset, offset + 4).arrayBuffer());
    if (marker.length < 4 || marker[0] !== 0x66 || marker[1] !== 0x4c || marker[2] !== 0x61 || marker[3] !== 0x43) {
      return null;
    }

    offset += 4;
    while (offset + 4 <= file.size) {
      const blockHeader = new Uint8Array(await file.slice(offset, offset + 4).arrayBuffer());
      if (blockHeader.length < 4) return null;

      const isLastBlock = (blockHeader[0] & 0x80) !== 0;
      const blockType = blockHeader[0] & 0x7f;
      const blockLength = (blockHeader[1] << 16) | (blockHeader[2] << 8) | blockHeader[3];
      const dataStart = offset + 4;

      if (blockType === 6 && blockLength >= 32) {
        const picture = await file.slice(dataStart, dataStart + blockLength).arrayBuffer();
        const view = new DataView(picture);
        let cursor = 4; // Picture type.
        if (cursor + 4 > view.byteLength) return null;
        const mimeLength = readUint32(view, cursor);
        cursor += 4 + mimeLength;
        if (cursor + 4 > view.byteLength) return null;
        const descriptionLength = readUint32(view, cursor);
        cursor += 4 + descriptionLength;
        if (cursor + 20 > view.byteLength) return null;
        cursor += 16; // Width, height, color depth, indexed colors.
        const imageLength = readUint32(view, cursor);
        cursor += 4;
        if (!imageLength || cursor + imageLength > view.byteLength) return null;

        const mimeBytes = new Uint8Array(picture, 8, mimeLength);
        const mime = new TextDecoder().decode(mimeBytes) || "image/jpeg";
        return new Blob([picture.slice(cursor, cursor + imageLength)], { type: mime });
      }

      offset = dataStart + blockLength;
      if (isLastBlock) break;
    }

    return null;
  }

  async function extractId3Artwork(file) {
    const headerBuffer = await file.slice(0, 10).arrayBuffer();
    const header = new Uint8Array(headerBuffer);
    if (header.length < 10 || header[0] !== 0x49 || header[1] !== 0x44 || header[2] !== 0x33) return null;

    const headerView = new DataView(headerBuffer);
    const majorVersion = header[3];
    if (majorVersion < 2 || majorVersion > 4) return null;

    const tagSize = readSynchsafe(headerView, 6);
    const tagBuffer = await file.slice(10, 10 + tagSize).arrayBuffer();
    const bytes = new Uint8Array(tagBuffer);
    let offset = 0;
    const hasExtendedHeader = (header[5] & 0x40) !== 0;

    if (hasExtendedHeader && bytes.length >= 4) {
      const extendedView = new DataView(tagBuffer);
      offset = majorVersion === 4
        ? readSynchsafe(extendedView, 0)
        : readUint32(extendedView, 0);
    }

    while (offset + 10 <= bytes.length) {
      const frameId = String.fromCharCode(...bytes.slice(offset, offset + 4));
      if (!frameId.trim() || frameId.charCodeAt(0) === 0) break;

      const frameView = new DataView(tagBuffer, offset, 10);
      const frameSize = majorVersion === 4
        ? readSynchsafe(frameView, 4)
        : readUint32(frameView, 4);
      const frameStart = offset + 10;
      const frameEnd = frameStart + frameSize;
      if (frameSize <= 0 || frameEnd > bytes.length) break;

      if (frameId === "APIC" && frameSize > 5) {
        const frame = bytes.slice(frameStart, frameEnd);
        const encoding = frame[0];
        let cursor = 1;
        const mimeEnd = frame.indexOf(0, cursor);
        if (mimeEnd < 0) return null;
        const mime = new TextDecoder().decode(frame.slice(cursor, mimeEnd)) || "image/jpeg";
        cursor = mimeEnd + 2; // MIME terminator and picture type byte.

        if (encoding === 1 || encoding === 2) {
          while (cursor + 1 < frame.length && !(frame[cursor] === 0 && frame[cursor + 1] === 0)) cursor += 2;
          cursor += 2;
        } else {
          const descriptionEnd = frame.indexOf(0, cursor);
          if (descriptionEnd < 0) return null;
          cursor = descriptionEnd + 1;
        }

        if (cursor < frame.length) {
          return new Blob([frame.slice(cursor)], { type: mime });
        }
        return null;
      }

      offset = frameEnd;
    }

    return null;
  }

  async function extractEmbeddedArtwork(file) {
    const extension = (file.name.match(/\.([^.]+)$/) || ["", ""])[1].toLowerCase();
    try {
      if (extension === "flac") return await extractFlacArtwork(file);
      if (extension === "mp3") return await extractId3Artwork(file);
    } catch (error) {
      // Artwork is optional; a malformed or unsupported tag should not interrupt playback.
      return null;
    }
    return null;
  }

  async function loadCassetteArtwork(track) {
    const requestId = ++artworkRequestId;
    if (!track.file) return;
    const artwork = await extractEmbeddedArtwork(track.file);
    if (requestId !== artworkRequestId || !artwork) return;
    showCassetteArtwork(artwork);
  }

  function stopAndReleaseCurrent() {
    audio.pause();
    audio.removeAttribute("src");
    audio.load();

    if (lastObjectUrl) {
      URL.revokeObjectURL(lastObjectUrl);
      lastObjectUrl = null;
    }
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
      play.textContent = index === currentIndex ? "SELECTED" : "PLAY  ▶";

      button.setAttribute("aria-current", index === currentIndex ? "true" : "false");
      button.addEventListener("click", () => playTrack(index));

      button.append(number, name, play);
      item.appendChild(button);
      trackList.appendChild(item);
    });
  }

  function setTracks(files, sourceLabel) {
    const audioFiles = Array.from(files).filter(file =>
      file && ((file.type && file.type.startsWith("audio/")) || supportedExtensions.test(file.name))
    );

    audioFiles.sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" })
    );

    if (!audioFiles.length) {
      status.textContent = "No supported audio files were found. Try MP3, WAV, OGG, M4A, AAC or FLAC files.";
      return;
    }

    stopAndReleaseCurrent();
    tracks = audioFiles.map(file => ({
      file,
      name: file.name.replace(/\.[^.]+$/, ""),
      source: sourceLabel
    }));
    currentIndex = -1;

    updateCassetteTrack(null);
    resetCassetteProgress();
    renderTracks();

    status.textContent = `${tracks.length} track${tracks.length === 1 ? "" : "s"} ready. Select a song to load it into the cassette.`;
  }


  async function chooseFolder() {
    if (typeof window.showDirectoryPicker !== "function") {
      status.textContent = "Folder picking is not available in this browser. Use the compatibility folder picker.";
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
        status.textContent = "The folder could not be read. Try the compatibility folder picker.";
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

    updateCassetteTrack(track);
    resetCassetteProgress();
    renderTracks();
    loadCassetteArtwork(track);

    try {
      await audio.play();
      status.textContent = `Now playing: ${track.name}`;
    } catch (error) {
      status.textContent = "Playback could not start. Press PLAY on the cassette to try again.";
    }
  }

  function nextTrack() {
    if (!tracks.length) return;
    const next = currentIndex < 0 ? 0 : (currentIndex + 1) % tracks.length;
    playTrack(next);
  }

  function previousTrack() {
    if (!tracks.length) return;
    const previous = currentIndex <= 0 ? tracks.length - 1 : currentIndex - 1;
    playTrack(previous);
  }

  openButton.addEventListener("click", () => setLibraryOpen(true));
  closeButton.addEventListener("click", () => setLibraryOpen(false));
  folderButton.addEventListener("click", chooseFolder);

  fallbackInput.addEventListener("change", event => {
    const files = Array.from(event.target.files || []);
    setTracks(files, "Selected folder");
    event.target.value = "";
  });

  cassetteButtons.forEach(button => {
    button.addEventListener("click", async () => {
      const action = button.dataset.cassetteAction;

      switch (action) {
        case "play":
          if (currentIndex >= 0 && audio.src) {
            try {
              await audio.play();
            } catch (error) {
              status.textContent = "Playback could not resume. Try PLAY again.";
            }
          } else if (tracks.length) {
            await playTrack(0);
          } else {
            status.textContent = "Open your music library and choose a song first.";
            setLibraryOpen(true);
          }
          break;

        case "pause":
          audio.pause();
          break;

        case "stop":
          if (audio.src) {
            audio.pause();
            audio.currentTime = 0;
            updateCassetteProgress();
          }
          break;

        case "rewind":
          if (audio.src) {
            audio.currentTime = Math.max(0, audio.currentTime - 10);
            updateCassetteProgress();
          }
          break;

        case "forward":
          if (audio.src && Number.isFinite(audio.duration)) {
            audio.currentTime = Math.min(audio.duration, audio.currentTime + 10);
            updateCassetteProgress();
          }
          break;
      }
    });
  });

  cassetteEject.addEventListener("click", () => {
    stopAndReleaseCurrent();
    currentIndex = -1;
    updateCassetteTrack(null);
    resetCassetteProgress();
    renderTracks();
    status.textContent = tracks.length
      ? "Cassette ejected. Your music folder is still loaded; choose another track or press PLAY."
      : "Cassette ejected. Choose a music folder to begin.";
  });

  audio.addEventListener("timeupdate", updateCassetteProgress);

  audio.addEventListener("loadedmetadata", () => {
    cassetteDuration.textContent = formatTime(audio.duration);
    updateCassetteProgress();
  });

  audio.addEventListener("play", () => {
    cassettePlayer.classList.add("is-playing");
  });

  audio.addEventListener("pause", () => {
    cassettePlayer.classList.remove("is-playing");
  });

  audio.addEventListener("ended", nextTrack);

  audio.addEventListener("emptied", () => {
    cassettePlayer.classList.remove("is-playing");
  });

  audio.addEventListener("error", () => {
    status.textContent = "This audio file could not be played by the browser. Try another supported audio format.";
    cassettePlayer.classList.remove("is-playing");
  });
})();
