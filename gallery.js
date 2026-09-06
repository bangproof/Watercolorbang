fetch("gallery.json")
  .then((response) => response.json())
  .then((paintings) => {
    const grid = document.getElementById("gallery-grid");
    const empty = document.getElementById("gallery-empty");

    if (!paintings.length) {
      empty.hidden = false;
      return;
    }

    for (const painting of paintings) {
      const figure = document.createElement("figure");
      figure.className = "gallery__figure";

      const link = document.createElement("a");
      link.className = "gallery__link";
      link.href = painting.file;
      link.target = "_blank";
      link.rel = "noopener";

      const img = document.createElement("img");
      img.className = "gallery__image";
      img.src = painting.file;
      img.alt = painting.title || "";
      img.loading = "lazy";

      link.appendChild(img);
      figure.appendChild(link);

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
