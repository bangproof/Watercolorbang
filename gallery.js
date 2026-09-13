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
    const lightboxPrev = document.getElementById("lightbox-prev");
    const lightboxNext = document.getElementById("lightbox-next");

    if (!paintings.length) {
      empty.hidden = false;
      return;
    }

    let currentIndex = 0;
    let renderRequestId = 0;
    let scale = 1;
    let translateX = 0;
    let translateY = 0;

    // Reads the Description field straight out of a JPEG's embedded
    // XMP metadata (Photoshop's File Info dialog), shown below the
    // manual title/year from gallery.json. Only the first ~128KB is
    // fetched (via a Range request) since XMP always lives near the
    // start of the file, well before the compressed image data.
    const metadataCache = new Map();

    function readXmpField(doc, tagName) {
      const dc = "http://purl.org/dc/elements/1.1/";
      const rdf = "http://www.w3.org/1999/02/22-rdf-syntax-ns#";
      const containers = doc.getElementsByTagNameNS(dc, tagName);
      if (!containers.length) return "";
      const items = containers[0].getElementsByTagNameNS(rdf, "li");
      return Array.from(items)
        .map((li) => li.textContent.trim())
        .filter(Boolean)
        .join(", ");
    }

    async function fetchEmbeddedMetadata(file) {
      if (metadataCache.has(file)) return metadataCache.get(file);
      const promise = fetch(file, { headers: { Range: "bytes=0-131071" } })
        .then((response) => response.arrayBuffer())
        .then((buffer) => {
          const text = new TextDecoder("utf-8", { fatal: false }).decode(buffer);
          const start = text.indexOf("<x:xmpmeta");
          const end = text.indexOf("</x:xmpmeta>");
          if (start === -1 || end === -1) return {};
          const xmpXml = text.slice(start, end + "</x:xmpmeta>".length);
          const doc = new DOMParser().parseFromString(xmpXml, "application/xml");
          return { description: readXmpField(doc, "description") };
        })
        .catch(() => ({}));
      metadataCache.set(file, promise);
      return promise;
    }

    function updateCaption(painting, meta) {
      const lines = [];
      if (painting.title) {
        lines.push(painting.year ? `${painting.title}, ${painting.year}` : painting.title);
      }
      if (meta.description) {
        meta.description
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean)
          .forEach((line) => lines.push(line));
      }

      lightboxCaption.textContent = "";
      lines.forEach((line, i) => {
        if (i > 0) lightboxCaption.appendChild(document.createElement("br"));
        lightboxCaption.appendChild(document.createTextNode(line));
      });
      lightboxCaption.hidden = lines.length === 0;
    }

    function applyTransform() {
      lightboxImage.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
      lightboxImage.classList.toggle("lightbox__image--zoomed", scale > 1);
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
      const requestId = ++renderRequestId;
      resetZoom();
      lightboxImage.src = painting.file;
      lightboxImage.alt = painting.title || "";
      updateCaption(painting, {});

      fetchEmbeddedMetadata(painting.file).then((meta) => {
        if (requestId !== renderRequestId) return;
        updateCaption(painting, meta);
      });
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
    lightboxPrev.addEventListener("click", showPrev);
    lightboxNext.addEventListener("click", showNext);
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
          // Only count drag-past-the-edge as an overscroll when the
          // image actually has horizontal pan room — otherwise (e.g.
          // a portrait image with no horizontal slack) any sideways
          // jitter during a vertical pan would read as a full-force
          // overscroll and fire an unintended navigation.
          overscrollX = limit.x > 0 ? rawX - translateX : 0;
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

    // Desktop equivalents: scroll/trackpad to zoom, click-drag to pan
    // once zoomed, and double-click to toggle zoom.
    let isMouseDown = false;
    let mouseStartX = 0;
    let mouseStartY = 0;

    stage.addEventListener(
      "wheel",
      (event) => {
        event.preventDefault();
        scale = Math.min(Math.max(scale - event.deltaY * 0.01, 1), 4);
        if (scale === 1) {
          translateX = 0;
          translateY = 0;
        } else {
          const limit = maxPan();
          translateX = clamp(translateX, limit.x);
          translateY = clamp(translateY, limit.y);
        }
        applyTransform();
      },
      { passive: false }
    );

    stage.addEventListener("mousedown", (event) => {
      if (scale <= 1) return;
      isMouseDown = true;
      mouseStartX = event.clientX;
      mouseStartY = event.clientY;
      panStartX = translateX;
      panStartY = translateY;
      lightboxImage.classList.add("lightbox__image--panning");
      event.preventDefault();
    });

    window.addEventListener("mousemove", (event) => {
      if (!isMouseDown) return;
      const limit = maxPan();
      translateX = clamp(panStartX + (event.clientX - mouseStartX), limit.x);
      translateY = clamp(panStartY + (event.clientY - mouseStartY), limit.y);
      applyTransform();
    });

    window.addEventListener("mouseup", () => {
      isMouseDown = false;
      lightboxImage.classList.remove("lightbox__image--panning");
    });

    stage.addEventListener("dblclick", () => {
      if (scale > 1) {
        resetZoom();
      } else {
        scale = 2;
        applyTransform();
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
