# Rozdział website

The public landing page for Rozdział, a writing app for novels. The site is plain HTML, CSS, and JavaScript. GitHub Pages publishes the root of `main`.

To preview it locally, run `python3 -m http.server 8000` in this folder and open `http://localhost:8000/`. Run `node --check app.js` to check the preview script before publishing changes. Add `?view=board` or `?view=book` to open the preview on the Board or Manuscript page.

`sample.js` is generated from the app's `Rozdzial/SampleStory.swift` (the Wilde excerpt), so the preview shows the same text, scenes, characters and word counts as the app's sample novel. Colors in `styles.css` follow `Rozdzial/Theme.swift`: the preview window uses the app's exact light and dark palettes, and the page around it is a step lighter so the window stands out. Screenshots in `assets/` come from the development build.

The marketing site and the native apps have separate release workflows.
