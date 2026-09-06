fetch("gallery.json")
  .then((response) => response.json())
  .then((paintings) => {
    const grid = document.getElementById("gallery-grid");
    const empty = document.getElementById("gallery-empty");
    const lightbox = document.getElementById("lightbox");
    const lightboxImage = document.getElementById("lightbox-image");
    const lightboxCaption = document.getElementById("lightbox-caption");
    const lightboxClose = document.getElementById("lightbox-close");

    if (!paintings.length) {
      empty.hidden = false;
      return;
    }

    function openLightbox(painting) {
      lightboxImage.src = painting.file;
      lightboxImage.alt = painting.title || "";
      lightboxCaption.textContent = painting.year
        ? `${painting.title || ""}, ${painting.year}`.replace(/^, /, "")
        : painting.title || "";
      lightboxCaption.hidden = !lightboxCaption.textContent;
      lightbox.hidden = false;
      document.body.style.overflow = "hidden";
    }

    function closeLightbox() {
      lightbox.hidden = true;
      lightboxImage.src = "";
      document.body.style.overflow = "";
    }

    lightboxClose.addEventListener("click", closeLightbox);
    lightbox.addEventListener("click", (event) => {
      if (event.target === lightbox) closeLightbox();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !lightbox.hidden) closeLightbox();
    });

    for (const painting of paintings) {
      const figure = document.createElement("figure");
      figure.className = "gallery__figure";

      const button = document.createElement("button");
      button.type = "button";
      button.className = "gallery__link";
      button.addEventListener("click", () => openLightbox(painting));

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
