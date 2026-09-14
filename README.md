# watercolorbang

Source for [bangproof.github.io/Watercolorbang](https://bangproof.github.io/Watercolorbang/). Plain HTML/CSS/JS, deployed automatically to GitHub Pages on every push to `main`.

## Adding a painting or sketch

1. Upload the scanned image into `images/` for paintings, or `images/sketches/` for sketches (GitHub web or app: **Add file → Upload files**).
2. Commit the change. That's it — the deploy workflow scans both folders and regenerates `gallery.json`/`sketches.json` automatically, newest file first (by filename, `yy-mmdd...` sorts correctly). The site rebuilds within a minute or two.

Each image's caption is read automatically from its embedded metadata (Photoshop's File Info → Description field, saved via **Save As** with metadata included — "Export As" tends to strip it). No manual captioning needed; a file with no embedded description just shows no caption.

`gallery.json` and `sketches.json` in the repo are build output, not something to hand-edit — they're overwritten on every deploy to match whatever is actually in `images/`.
