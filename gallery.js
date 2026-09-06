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
    let translateX = 0;
    let translateY = 0;

    function applyTransform() {
      lightboxImage.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
    }

    function resetZoom() {
      scale = 1;
      translateX = 0;
      translateY = 0;
      applyTransform();
    }

    function maxPan() {
      return {
        x: Math.max((lightboxImage.clientWidth * scale - stage.clientWidth) / 2, 0),
        y: Math.max((lightboxImage.clientHeight * scale - stage.clientHeight) / 2, 0),
      };
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

    // Pinch-to-zoom and drag-to-pan the image itself, plus a
    // single-finger swipe to move between paintings — either at 1x,
    // or by dragging past the edge of a panned/zoomed image (like
    // Photos) — all handled on the stage so the rest of the page
    // never responds to these gestures.
    const SWIPE_THRESHOLD = 50;
    const OVERSCROLL_THRESHOLD = 60;

    let pinchStartDistance = 0;
    let scaleAtPinchStart = 1;
    let panStartX = 0;
    let panStartY = 0;
    let touchStartX = 0;
    let touchStartY = 0;
    let isPinching = false;
    let isPanning = false;
    let overscrollX = 0;
    let lastDeltaY = 0;

    function touchDistance(touches) {
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      return Math.hypot(dx, dy);
    }

    function clamp(value, limit) {
      return Math.min(Math.max(value, -limit), limit);
    }

    stage.addEventListener(
      "touchstart",
      (event) => {
        if (event.touches.length === 2) {
          isPinching = true;
          isPanning = false;
          pinchStartDistance = touchDistance(event.touches);
          scaleAtPinchStart = scale;
        } else if (event.touches.length === 1) {
          isPinching = false;
          isPanning = scale > 1;
          touchStartX = event.touches[0].clientX;
          touchStartY = event.touches[0].clientY;
          panStartX = translateX;
          panStartY = translateY;
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
          if (scale === 1) {
            translateX = 0;
            translateY = 0;
          } else {
            const limit = maxPan();
            translateX = clamp(translateX, limit.x);
            translateY = clamp(translateY, limit.y);
          }
          applyTransform();
        } else if (isPanning && event.touches.length === 1) {
          event.preventDefault();
          const limit = maxPan();
          const rawX = panStartX + (event.touches[0].clientX - touchStartX);
          const rawY = panStartY + (event.touches[0].clientY - touchStartY);
          translateX = clamp(rawX, limit.x);
          translateY = clamp(rawY, limit.y);
          overscrollX = rawX - translateX;
          lastDeltaY = rawY - panStartY;
          applyTransform();
        }
      },
      { passive: false }
    );

    stage.addEventListener("touchend", (event) => {
      if (isPinching) {
        isPinching = false;
        return;
      }
      if (isPanning) {
        isPanning = false;
        if (
          Math.abs(overscrollX) > OVERSCROLL_THRESHOLD &&
          Math.abs(overscrollX) > Math.abs(lastDeltaY)
        ) {
          if (overscrollX < 0) showNext();
          else showPrev();
        }
        overscrollX = 0;
        return;
      }
      if (scale > 1) return;

      const touch = event.changedTouches[0];
      const deltaX = touch.clientX - touchStartX;
      const deltaY = touch.clientY - touchStartY;

      if (Math.abs(deltaX) > SWIPE_THRESHOLD && Math.abs(deltaX) > Math.abs(deltaY)) {
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
