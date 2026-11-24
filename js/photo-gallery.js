/* Photo collection toggles and accessible image viewer with navigation. */
(() => {
    const galleryButtons = document.querySelectorAll("[data-gallery-target]");

    galleryButtons.forEach((button) => {
        const gallery = document.getElementById(button.getAttribute("data-gallery-target"));
        if (!gallery) return;

        button.addEventListener("click", () => {
            const shouldExpand = button.getAttribute("aria-expanded") !== "true";
            button.setAttribute("aria-expanded", String(shouldExpand));
            gallery.hidden = !shouldExpand;
            button.innerHTML = shouldExpand
                ? 'Close collection <span aria-hidden="true">−</span>'
                : 'Explore collection <span aria-hidden="true">＋</span>';
        });
    });

    const lightbox = document.getElementById("photoLightbox");
    const lightboxImage = document.getElementById("photoLightboxImage");
    const caption = document.getElementById("photoLightboxCaption");
    const counter = document.getElementById("photoLightboxCounter");
    const closeButton = document.getElementById("closePhotoLightbox");
    const previousButton = document.getElementById("previousPhoto");
    const nextButton = document.getElementById("nextPhoto");

    if (!lightbox || !lightboxImage || !closeButton ||
        !previousButton || !nextButton) return;

    const photoSelector = ".photo-album-cover img, .photo-gallery-grid img";
    let activePhotos = [];
    let activeIndex = 0;

    document.querySelectorAll(photoSelector).forEach((photo) => {
        photo.tabIndex = 0;
        photo.setAttribute("role", "button");
        photo.setAttribute("aria-label", `Enlarge photo: ${photo.alt || "Photo"}`);
    });

    function renderPhoto() {
        const photo = activePhotos[activeIndex];
        if (!photo) return;

        lightboxImage.src = photo.currentSrc || photo.src;
        lightboxImage.alt = photo.alt || "Enlarged portfolio photograph";
        if (caption) caption.textContent = photo.alt || "";
        if (counter) counter.textContent = `${activeIndex + 1} / ${activePhotos.length}`;
    }

    function openPhoto(photo) {
        // Navigation stays within the selected album.
        const album = photo.closest(".photo-album");
        const albumPhotos = album
            ? Array.from(album.querySelectorAll(".photo-gallery-grid img"))
            : [photo];

        activePhotos = albumPhotos.length ? albumPhotos : [photo];
        activeIndex = Math.max(0, activePhotos.indexOf(photo));
        renderPhoto();

        if (!lightbox.open) lightbox.showModal();
    }

    function movePhoto(direction) {
        if (!activePhotos.length) return;
        activeIndex = (activeIndex + direction + activePhotos.length) % activePhotos.length;
        renderPhoto();
    }

    document.addEventListener("click", (event) => {
        const photo = event.target.closest(photoSelector);
        if (photo) openPhoto(photo);
    });

    document.addEventListener("keydown", (event) => {
        if (lightbox.open) {
            if (event.key === "ArrowRight") {
                event.preventDefault();
                movePhoto(1);
            } else if (event.key === "ArrowLeft") {
                event.preventDefault();
                movePhoto(-1);
            }
            return;
        }

        const photo = event.target.closest?.(photoSelector);
        if (photo && (event.key === "Enter" || event.key === " ")) {
            event.preventDefault();
            openPhoto(photo);
        }
    });

    previousButton.addEventListener("click", () => movePhoto(-1));
    nextButton.addEventListener("click", () => movePhoto(1));
    closeButton.addEventListener("click", () => lightbox.close());

    lightbox.addEventListener("click", (event) => {
        if (event.target === lightbox) lightbox.close();
    });
})();
