# Rozdział website

The public landing page for Rozdział, a writing app for novels. The site is plain HTML, CSS, and JavaScript. GitHub Pages publishes the root of `main`.

To preview it locally, run `python3 -m http.server 8000` in this folder and open `http://localhost:8000/`. Run `node --check app.js` to check the preview script before publishing changes. Add `?view=board` or `?view=book` to open the preview on the Board or Manuscript page.

The home page's preview is a drawing of the Mac app's window with a Novel and a Play choice above it. `sample.js` (the sample novel, The Canterville Ghost) and `sample-play.js` (the sample play, The Importance of Being Earnest) are generated from the app's own samples, `Core/SampleStory.swift` and `Core/SamplePlay.swift`, so the preview shows the same chapters, acts, scenes, text, links, statuses and comments as the app. Regenerate them with `python3 tools/make-samples.py ../rozdzial` (the path to the app's repository); it reads the JSON plan out of the Swift source and builds nothing. `script-layout.js` lays the play out on pages as the app's Script page does (a port of `Core/ScriptFormat.swift` and `Core/ScriptLayout.swift`), so its page numbers are the app's. Colors and type in `styles.css` follow `Rozdzial/Theme.swift`: the preview window uses the app's exact light and dark palettes, and the page around it is a step lighter so the window stands out. Add `?form=play`, `?view=board` or `?view=book` to open the preview on the play, the Board, or the Manuscript or Script. Screenshots in `assets/` come from the development build.

The marketing site and the native apps have separate release workflows.
