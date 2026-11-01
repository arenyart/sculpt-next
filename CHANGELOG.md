# Changes from upstream SculptGL

This project is a modernized fork of [stephomi/sculptgl](https://github.com/stephomi/sculptgl), based on upstream commit
[`8e45daf`](https://github.com/stephomi/sculptgl/commit/8e45dafc0f7906e5238dfffc1a2df742bd25f29d) (September 2023).
The first commit in this repository is an unmodified import of that code; everything after it is listed below.

The sculpting engine itself was not changed. The same primitives, subdivision (up to 262k faces), multiresolution
reversion, marching-cubes and surface-nets remeshing, and hole filling produce byte-identical OBJ, PLY and STL output
in the original and modernized code.

## Build and tooling

- Replaced webpack 5, Babel, `raw-loader` and `copy-webpack-plugin` with **Vite 8**.
- Replaced four HTML templates (`index.dev`, `.release`, `.website`, `.webad`) with a single `index.html`.
- Rewrote 307 webpack-only imports (`'misc/Utils'`) as standard relative ES module paths.
- Shaders (`.glsl`) load through Vite `?raw` imports instead of `raw-loader`.
- Static assets moved from `app/` to `public/`; the entry point moved to `src/main.js`.
- The build uses relative paths, so it can be hosted from any sub-folder and loaded from `file://` in Electron.
- The dev server runs on port 47321 and the preview server on 47322.
- One npm lockfile instead of three (npm, yarn and pnpm were all committed).
- Removed `.jshintrc`, `.jsbeautifyrc` and the Sublime project file.
- Added ESLint 10 (flat config), `.nvmrc` (Node 22) and a favicon.
- `package.json` uses `"type": "module"`, with the scripts `dev`, `build`, `preview`, `test`, `lint`, `desktop`,
  `desktop:dev` and `package:desktop`.

## Code modernization

- Converted about 4,100 `var` declarations to `let`/`const`. Most were converted automatically; 22 were reviewed by hand
  (loop-scoped variables whose values carried over between iterations, and switch cases that now have their own block).
- Removed `Polyfill.js` (polyfills for `Map`, typed-array `slice`, `startsWith`/`endsWith` and `requestAnimationFrame`).
- Replaced `substr()` with `slice()`, and removed the `navigator.userLanguage` and `TextDecoder` fallbacks.
- `XMLHttpRequest` replaced by `fetch` for `?modelurl=` and the PBR environment maps. XHR is kept only where upload
  progress is shown.
- `FileReader` replaced by `Blob.text()` and `Blob.arrayBuffer()` when opening files.
- URL options are parsed with `URLSearchParams`, so encoded values work.
- The WebGL context no longer falls back to `experimental-webgl`.

## Dependencies

| Removed | Replaced with |
| --- | --- |
| `hammerjs` (unmaintained since 2016) | `src/misc/TouchGestures.js`, built on Pointer Events |
| Vendored `lib/zip.js` and deflate web workers (about 3,000 lines) | [`fflate`](https://github.com/101arrowz/fflate) |
| `file-saver` | Native download helper in `src/misc/FileUtils.js` |
| `yagui` npm package (a development build made of `eval()` strings) | Its MIT source, vendored as ES modules in `src/vendor/yagui/` |
| Minified Sketchfab OAuth library | `src/files/SketchfabOAuth2.js` |
| `http-server`, `electron-packager` | Vite preview, `@electron/packager` |

`gl-matrix` was updated to 3.4.4.

## Input

- **Mouse and pen** use Pointer Events with pointer capture. Strokes continue when the cursor crosses a panel and end
  cleanly on release.
- **Scroll wheel:** `wheel` replaces `mousewheel`/`DOMMouseScroll`.
- **Middle-click** autoscroll is suppressed on the canvas.
- **Touch** behaves as before: one finger sculpts, two fingers pan and pinch to zoom, three fingers rotate, and one- and
  two-finger double taps re-frame the camera. The old iOS timing workaround was removed.
- **Keyboard:** `src/misc/KeyCode.js` replaces the deprecated `event.which` in 7 GUI files. Digits and the numpad work on
  AZERTY layouts, letters follow the keyboard layout, and the `?shortcuts=` format is unchanged.
- **UI widgets (yagui):** sliders, color pickers, the panel resizer and folders use Pointer Events with pointer capture,
  so they work with touch and pen. `touch-action` CSS keeps drags from scrolling the page.

## Exports and integrations

- **Sketchfab:** moved from API v2 to v3. Progress is now reported while the file uploads (it previously tracked the
  response download). The OAuth login checks the `state` value, and error responses are handled. The client ID and
  redirect address can be set with `VITE_SKETCHFAB_CLIENT_ID` and `VITE_SKETCHFAB_REDIRECT_URI`.
- **Materialise:** uses `fflate` and async code, with upload progress fixed the same way.
- **Sculpteo:** removed. It was already disabled in the menu and relied on a PHP proxy on the original author's server.
- **Zipped downloads** use `fflate`.

## Desktop app

- Electron 11 upgraded to **Electron 45**; `electron-packager` replaced by `@electron/packager`.
- The page runs sandboxed with context isolation and no Node integration (previously it had full Node access).
- `electron/preload.cjs` replaces the `eval('require')('fs')` scan of the alpha brush folder.
- External links open in the system browser; the Sketchfab login stays in the app.
- `electron/windowState.js` replaces the 471-line bundled window-state helper.
- Packaging ships only `dist/` and the Electron entry files, inside an asar archive.

## Fixes and UX

- If WebGL is unavailable, the page shows a message instead of an `alert()` and a blank screen.
- Fixed a variable used before its declaration in `Mesh.initTexCoordsDataFromOBJData`.
- Removed a duplicate, mistranslated Chinese key (`sceneDuplicate`) and an unused variable in `Gizmo.js`.
- Added a viewport meta tag, `accept` filters on the file pickers, and `noscript` text.
- The right-click menu is blocked from code instead of an inline `oncontextmenu` attribute.

## Tests and documentation

- Added a Vitest suite (18 tests): OBJ, STL and PLY round-trips, zip output, file-type detection, key-code mapping and
  touch gestures.
- Rewrote the README: setup, commands, URL options, Sketchfab setup, folder layout and credits.

## Unchanged

- The sculpting engine: brushes, multiresolution, dynamic topology, remeshing, hole filling and rendering (still WebGL 1).
- File formats, the UI layout, translations and assets.
- The original MIT licence and credits.
- The `tools/envmap.exe` utility.
