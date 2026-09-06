# watercolorbang

Source for [bangproof.github.io/Watercolorbang](https://bangproof.github.io/Watercolorbang/). Plain HTML/CSS, deployed automatically to GitHub Pages on every push to `main`.

## Adding a painting

1. Upload the scanned image into the `images/` folder (GitHub web or app: **Add file → Upload files**).
2. Open `gallery.json` and add an entry for it:

   ```json
   { "file": "images/your-file-name.jpg", "title": "Painting Title", "year": 2026 }
   ```

   `title` and `year` are optional — leave them out if you don't want a caption.
3. Commit the change. The site rebuilds automatically within a minute or two.

Newest paintings should go at the top of the `gallery.json` array; the gallery displays them in that order.
