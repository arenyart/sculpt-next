# SculptGL (modernized)

SculptGL is a digital sculpting app that runs in the browser with WebGL. It was created by
[Stéphane Ginier](https://stephaneginier.com/) ([stephomi/sculptgl](https://github.com/stephomi/sculptgl)) and has had only
minor fixes since 2019.

This repository keeps the original sculpting engine (brushes, multiresolution, dynamic topology, voxel remeshing, PBR/matcap
rendering, OBJ/PLY/STL/SGL files) and updates the code and tooling around it for current browsers, Node, and Electron.

## Quick start

Requires Node.js 20.19+ (22 LTS recommended).

```bash
npm install
npm run dev        # http://127.0.0.1:47321
```

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server with hot reload on port 47321 |
| `npm run build` | Production build to `dist/` (relative paths, can be hosted from any sub-folder) |
| `npm run preview` | Serve the production build on port 47322 |
| `npm test` | Vitest suite (file formats, zipping, shortcuts, touch gestures) |
| `npm run lint` | ESLint |
| `npm run desktop` | Build, then open the Electron desktop app |
| `npm run desktop:dev` | Electron pointed at a running `npm run dev` server |
| `npm run package:desktop` | Package the desktop app for the current OS into `release/` |

## What changed from upstream

**Build and tooling**
- webpack 5, Babel, and `raw-loader` are replaced with Vite. GLSL is loaded through `?raw` imports.
- Imports that depended on webpack's `resolve.modules` (`import Utils from 'misc/Utils'`) are now standard relative ES module paths.
- jshint and js-beautify are replaced with ESLint 10 (flat config). All `var` declarations are now `let`/`const`.
- One npm lockfile instead of three (npm, yarn, and pnpm were all committed).
- A Vitest suite covers OBJ, STL, and PLY round-trips, zip output, keyboard mapping, and touch gestures.

**Dependencies**
- `hammerjs` (unmaintained since 2016) is replaced by a small Pointer Events gesture module (`src/misc/TouchGestures.js`).
  It handles one-finger sculpting, two-finger pan and pinch zoom, three-finger rotate, and double taps.
- The vendored 2013 `zip.js` and its deflate web workers are replaced by [`fflate`](https://github.com/101arrowz/fflate).
  `file-saver` is replaced by a native download helper.
- The npm build of `yagui` (the GUI library) was a webpack dev bundle made of `eval()` strings. Its MIT sources are now
  vendored as ES modules in `src/vendor/yagui`, so they can be bundled and minified. Its widgets also use Pointer Events now.
- The minified Sketchfab OAuth library is replaced by a short popup flow (`src/files/SketchfabOAuth2.js`) that validates the
  OAuth `state`. Uploads use Sketchfab API v3 with real upload progress.
- The Sculpteo exporter is removed. It was already disabled in the UI and relied on a PHP proxy on the original website.

**Browser APIs**
- Mouse and pen input use Pointer Events with pointer capture, so a stroke no longer ends when the cursor crosses a panel.
- `wheel` replaces `mousewheel`/`DOMMouseScroll`.
- Keyboard shortcuts read `KeyboardEvent.code`/`key` instead of the deprecated `which`. Digits and numpad keys work on AZERTY
  layouts, and the `?shortcuts=` URL format still works.
- `fetch`, `Blob.text()`, and `Blob.arrayBuffer()` replace XHR and `FileReader` (XHR is kept only where upload progress is shown).
  Polyfills for ES2015 features are removed.
- If WebGL is unavailable, the page shows a message instead of an `alert()`.

**Desktop app**
- Electron 11 and `electron-packager` are replaced by Electron 45 and `@electron/packager`.
- The renderer is sandboxed, with context isolation and no Node integration. Before this, the page had full Node access.
  The only native capability is a preload bridge that lists extra brush alphas from `resources/alpha`.
- External links open in the system browser.

The geometry code was checked against upstream: the same primitives, subdivision (up to 262k faces), multiresolution
reversion, marching-cubes and surface-nets remeshing, and hole filling produce byte-identical OBJ, PLY, and STL output.

## URL options

Options can be passed as query parameters, for example
`http://127.0.0.1:47321/?shader=pbr&environment=2&grid=false&modelurl=https://example.com/head.obj`.

`language`, `scalecenter`, `grid`, `outline`, `outlinecolor`, `mirrorline`, `darkenunselected`, `projection`, `cameramode`,
`pivot`, `fov`, `flatshading`, `wireframe`, `curvature`, `exposure`, `environment`, `matcap`, `shader`, `filmic`, `modelurl`,
`shortcuts` (e.g. `shortcuts=smooth:Q,brush:B`).

## Sketchfab upload

Sketchfab OAuth only redirects to URLs registered for the client ID. The default client ID is the original author's and is
registered for stephaneginier.com. To use uploads on your own host, register an app on Sketchfab and set:

```bash
# .env.local
VITE_SKETCHFAB_CLIENT_ID=your-client-id
VITE_SKETCHFAB_REDIRECT_URI=https://your-host/authSuccess.html
```

## Project layout

```
index.html              app shell (Vite entry)
src/main.js             bootstraps SculptGL
src/SculptGL.js         input handling (pointer, touch, wheel, keyboard, drag and drop)
src/Scene.js            WebGL setup, scene and render loop
src/editing/            sculpting tools, subdivision, remeshing, gizmo
src/mesh/               mesh data, dynamic topology, multiresolution
src/files/              importers and exporters
src/render/             shaders and WebGL helpers
src/gui/                UI panels and translations
src/vendor/yagui/       vendored GUI library (MIT)
public/resources/       matcaps, environments, alphas
electron/               desktop shell (main process, preload, packaging)
test/                   Vitest suite
tools/                  envmap.exe for baking IBL environments (see tools/README.md)
```

## Credits and license

SculptGL and yagui are © Stéphane Ginier, MIT licensed (see `LICENSE` and `src/vendor/yagui/LICENSE`).
The environment maps are from [Poly Haven](https://polyhaven.com/hdris) (formerly HDRI Haven).
