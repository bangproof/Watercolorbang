fetch("gallery.json")
  .then((response) => response.json())
  .then((paintings) => {
    const grid = document.getElementById("gallery-grid");
    const empty = document.getElementById("gallery-empty");
    const lightbox = document.getElementById("lightbox");
    const stage = document.getElementById("lightbox-stage");
    const lightboxImage = document.getElementById("lightbox-image");
    const lightboxCaption = document.getElementById("lightbox-caption");
    const lightboxClose = document.getElementById("lightbox-close");

    if (!paintings.length) {
      empty.hidden = false;
      return;
    }

    let currentIndex = 0;
    let scale = 1;

    function resetZoom() {
      scale = 1;
      lightboxImage.style.transform = "scale(1)";
    }

    function render(index) {
      currentIndex = (index + paintings.length) % paintings.length;
      const painting = paintings[currentIndex];
      resetZoom();
      lightboxImage.src = painting.file;
      lightboxImage.alt = painting.title || "";
      const caption = painting.year
        ? `${painting.title || ""}, ${painting.year}`.replace(/^, /, "")
        : painting.title || "";
      lightboxCaption.textContent = caption;
      lightboxCaption.hidden = !caption;
    }

    function openLightbox(index) {
      render(index);
      lightbox.hidden = false;
      document.body.style.overflow = "hidden";
    }

    function closeLightbox() {
      lightbox.hidden = true;
      lightboxImage.src = "";
      document.body.style.overflow = "";
    }

    function showNext() {
      render(currentIndex + 1);
    }

    function showPrev() {
      render(currentIndex - 1);
    }

    lightboxClose.addEventListener("click", closeLightbox);
    lightbox.addEventListener("click", (event) => {
      if (event.target === lightbox) closeLightbox();
    });
    document.addEventListener("keydown", (event) => {
      if (lightbox.hidden) return;
      if (event.key === "Escape") closeLightbox();
      if (event.key === "ArrowRight") showNext();
      if (event.key === "ArrowLeft") showPrev();
    });

    // Pinch-to-zoom (scales the image only) and single-finger swipe
    // to move between paintings, handled on the stage so the rest of
    // the page never responds to these gestures.
    let pinchStartDistance = 0;
    let scaleAtPinchStart = 1;
    let swipeStartX = 0;
    let swipeStartY = 0;
    let isPinching = false;

    function touchDistance(touches) {
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      return Math.hypot(dx, dy);
    }

    stage.addEventListener(
      "touchstart",
      (event) => {
        if (event.touches.length === 2) {
          isPinching = true;
          pinchStartDistance = touchDistance(event.touches);
          scaleAtPinchStart = scale;
        } else if (event.touches.length === 1) {
          isPinching = false;
          swipeStartX = event.touches[0].clientX;
          swipeStartY = event.touches[0].clientY;
        }
      },
      { passive: true }
    );

    stage.addEventListener(
      "touchmove",
      (event) => {
        if (isPinching && event.touches.length === 2) {
          event.preventDefault();
          const distance = touchDistance(event.touches);
          scale = Math.min(
            Math.max(scaleAtPinchStart * (distance / pinchStartDistance), 1),
            4
          );
          lightboxImage.style.transform = `scale(${scale})`;
        }
      },
      { passive: false }
    );

    stage.addEventListener("touchend", (event) => {
      if (isPinching) {
        isPinching = false;
        return;
      }
      if (scale > 1) return;

      const touch = event.changedTouches[0];
      const deltaX = touch.clientX - swipeStartX;
      const deltaY = touch.clientY - swipeStartY;

      if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY)) {
        if (deltaX < 0) showNext();
        else showPrev();
      }
    });

    for (const [index, painting] of paintings.entries()) {
      const figure = document.createElement("figure");
      figure.className = "gallery__figure";

      const button = document.createElement("button");
      button.type = "button";
      button.className = "gallery__link";
      button.addEventListener("click", () => openLightbox(index));

      const img = document.createElement("img");
      img.className = "gallery__image";
      img.src = painting.file;
      img.alt = painting.title || "";
      img.loading = "lazy";

      button.appendChild(img);
      figure.appendChild(button);

      if (painting.title) {
        const caption = document.createElement("figcaption");
        caption.className = "gallery__caption";
        caption.textContent = painting.year
          ? `${painting.title}, ${painting.year}`
          : painting.title;
        figure.appendChild(caption);
      }

      grid.appendChild(figure);
    }
  });
