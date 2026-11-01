import { vec3 } from 'gl-matrix';
import Tablet from './misc/Tablet';
import Enums from './misc/Enums';
import Utils from './misc/Utils';
import FileUtils from './misc/FileUtils';
import TouchGestures from './misc/TouchGestures';
import Scene from './Scene';
import Multimesh from './mesh/multiresolution/Multimesh';

const MOUSE_LEFT = 1;
const MOUSE_MIDDLE = 2;
const MOUSE_RIGHT = 3;

// PointerEvent.button (0: main, 1: auxiliary, 2: secondary) to the legacy 1-based numbering
const toLegacyButton = (button) => (button === 1 ? MOUSE_MIDDLE : button === 2 ? MOUSE_RIGHT : MOUSE_LEFT);

const isTouch = (event) => event.pointerType === 'touch';

// Manage events
class SculptGL extends Scene {

  constructor() {
    super();

    // all x and y position are canvas based

    // controllers stuffs
    this._mouseX = 0;
    this._mouseY = 0;
    this._lastMouseX = 0;
    this._lastMouseY = 0;
    this._lastScale = 0;

    // NOTHING, MASK_EDIT, SCULPT_EDIT, CAMERA_ZOOM, CAMERA_ROTATE, CAMERA_PAN, CAMERA_PAN_ZOOM_ALT
    this._action = Enums.Action.NOTHING;
    this._lastNbPointers = 0;
    this._isWheelingIn = false;

    // masking
    this._maskX = 0;
    this._maskY = 0;

    this._eventProxy = {};

    this.initTouchGestures();
    this.addEvents();
  }

  addEvents() {
    const canvas = this._canvas;

    // mouse and pen
    const onPointerMove = Utils.throttle(this.onMouseMove.bind(this), 16.66);
    canvas.addEventListener('pointerdown', this.onPointerDown.bind(this));
    canvas.addEventListener('pointermove', (event) => {
      Tablet.pressure = event.pressure;
      if (!isTouch(event)) onPointerMove(event);
    });
    canvas.addEventListener('pointerup', this.onPointerUp.bind(this));
    canvas.addEventListener('pointercancel', this.onPointerUp.bind(this));
    canvas.addEventListener('pointerover', (event) => !isTouch(event) && this.onMouseOver(event));
    canvas.addEventListener('pointerout', (event) => !isTouch(event) && this.onMouseOut(event));
    canvas.addEventListener('wheel', this.onMouseWheel.bind(this), { passive: false });
    // middle-click autoscroll can only be cancelled from the compatibility mouse event
    canvas.addEventListener('mousedown', (event) => event.button === 1 && event.preventDefault());

    // key
    window.addEventListener('keydown', this.onKeyDown.bind(this));
    window.addEventListener('keyup', this.onKeyUp.bind(this));

    // misc
    const cbLoadFiles = this.loadFiles.bind(this);
    const cbStopAndPrevent = this.stopAndPrevent.bind(this);
    canvas.addEventListener('webglcontextlost', this.onContextLost.bind(this));
    canvas.addEventListener('webglcontextrestored', this.onContextRestored.bind(this));
    window.addEventListener('dragenter', cbStopAndPrevent);
    window.addEventListener('dragover', cbStopAndPrevent);
    window.addEventListener('drop', cbLoadFiles);
    document.getElementById('fileopen').addEventListener('change', cbLoadFiles);
  }

  initTouchGestures() {
    this._touch = new TouchGestures(this._canvas, {
      onPanStart: this.onPanStart.bind(this),
      onPanMove: this.onPanMove.bind(this),
      onPanEnd: this.onPanEnd.bind(this),
      onPinchStart: this.onPinchStart.bind(this),
      onPinch: this.onPinchInOut.bind(this),
      onDoubleTap: this.onDoubleTap.bind(this),
      onDoubleTap2Fingers: this.onDoubleTap2Fingers.bind(this)
    });
  }

  stopAndPrevent(event) {
    event.stopPropagation();
    event.preventDefault();
  }

  onContextLost(event) {
    event.preventDefault();
    window.alert('Oops... WebGL context lost.');
  }

  onContextRestored() {
    window.alert('Wow... Context is restored.');
  }

  ////////////////
  // KEY EVENTS
  ////////////////
  onKeyDown(e) {
    this._gui.callFunc('onKeyDown', e);
  }

  onKeyUp(e) {
    this._gui.callFunc('onKeyUp', e);
  }

  ////////////////
  // TOUCH EVENTS
  ////////////////
  onPanStart(center, nbPointers) {
    this._focusGui = false;
    const evProxy = this._eventProxy;
    evProxy.pageX = center.x;
    evProxy.pageY = center.y;
    this.onPanUpdateNbPointers(Math.min(3, nbPointers));
  }

  onPanMove(center, nbPointers) {
    const evProxy = this._eventProxy;
    evProxy.pageX = center.x;
    evProxy.pageY = center.y;

    const nb = Math.min(3, nbPointers);
    if (nb !== this._lastNbPointers) {
      this.onDeviceUp();
      this.onPanUpdateNbPointers(nb);
    }
    this.onDeviceMove(evProxy);
  }

  onPanUpdateNbPointers(nbPointers) {
    // 1 finger sculpts, 2 fingers pan, 3 fingers rotate.
    // Going back to 1 finger in the middle of a gesture rotates instead of sculpting.
    const evProxy = this._eventProxy;
    evProxy.which = nbPointers === 1 && this._lastNbPointers >= 1 ? MOUSE_RIGHT : nbPointers;
    this._lastNbPointers = nbPointers;
    this.onDeviceDown(evProxy);
  }

  onPanEnd() {
    this.onDeviceUp();
    this._lastNbPointers = 0;
  }

  onDoubleTap(center) {
    if (this._focusGui) {
      return;
    }

    const evProxy = this._eventProxy;
    evProxy.pageX = center.x;
    evProxy.pageY = center.y;
    this.setMousePosition(evProxy);

    const picking = this._picking;
    const res = picking.intersectionMouseMeshes();
    const cam = this._camera;
    const pivot = [0.0, 0.0, 0.0];
    if (!res) {
      return this.resetCameraMeshes();
    }

    vec3.transformMat4(pivot, picking.getIntersectionPoint(), picking.getMesh().getMatrix());
    let zoom = cam._trans[2];
    if (!cam.isOrthographic()) {
      zoom = Math.min(zoom, vec3.dist(pivot, cam.computePosition()));
    }

    cam.setAndFocusOnPivot(pivot, zoom);
    this.render();
  }

  onDoubleTap2Fingers() {
    if (this._focusGui) return;
    this.resetCameraMeshes();
  }

  onPinchStart(scale) {
    this._focusGui = false;
    this._lastScale = scale;
  }

  onPinchInOut(scale) {
    const dir = (scale - this._lastScale) * 25;
    this._lastScale = scale;
    this.onDeviceWheel(dir);
  }

  resetCameraMeshes(meshes) {
    if (!meshes) meshes = this._meshes;

    if (meshes.length > 0) {
      const pivot = [0.0, 0.0, 0.0];
      const box = this.computeBoundingBoxMeshes(meshes);
      let zoom = 0.8 * this.computeRadiusFromBoundingBox(box);
      zoom *= this._camera.computeFrustumFit();
      vec3.set(pivot, (box[0] + box[3]) * 0.5, (box[1] + box[4]) * 0.5, (box[2] + box[5]) * 0.5);
      this._camera.setAndFocusOnPivot(pivot, zoom);
    } else {
      this._camera.resetView();
    }

    this.render();
  }

  ////////////////
  // LOAD FILES
  ////////////////
  getFileType(name) {
    return FileUtils.getFileType(name);
  }

  loadFiles(event) {
    event.stopPropagation();
    event.preventDefault();
    const files = event.dataTransfer ? event.dataTransfer.files : event.target.files;
    for (const file of files) {
      this.readFile(file);
    }
  }

  async readFile(file, ftype) {
    const fileType = ftype || this.getFileType(file.name);
    if (!fileType)
      return;

    try {
      const data = fileType === 'obj' ? await file.text() : await file.arrayBuffer();
      this.loadScene(data, fileType);
    } catch (err) {
      console.error(err);
      window.alert('Could not read ' + file.name + ': ' + err.message);
    } finally {
      document.getElementById('fileopen').value = '';
    }
  }

  ////////////////
  // MOUSE EVENTS
  ////////////////
  onPointerDown(event) {
    Tablet.pressure = event.pressure;
    if (isTouch(event)) return;
    // keep receiving events (and the end of the stroke) when the cursor leaves the canvas
    this._canvas.setPointerCapture(event.pointerId);
    this.onMouseDown(event);
  }

  onPointerUp(event) {
    if (isTouch(event)) return;
    if (this._canvas.hasPointerCapture(event.pointerId))
      this._canvas.releasePointerCapture(event.pointerId);
    this.onMouseUp(event);
  }

  onMouseDown(event) {
    event.stopPropagation();
    event.preventDefault();

    const evProxy = this._eventProxy;
    evProxy.pageX = event.pageX;
    evProxy.pageY = event.pageY;
    evProxy.shiftKey = event.shiftKey;
    evProxy.ctrlKey = event.ctrlKey;
    evProxy.altKey = event.altKey;
    evProxy.which = toLegacyButton(event.button);

    this._gui.callFunc('onMouseDown', event);
    this.onDeviceDown(evProxy);
  }

  onMouseMove(event) {
    event.stopPropagation();
    event.preventDefault();

    this._gui.callFunc('onMouseMove', event);
    this.onDeviceMove(event);
  }

  onMouseOver(event) {
    this._focusGui = false;
    this._gui.callFunc('onMouseOver', event);
  }

  onMouseOut(event) {
    // with pointer capture, "out" is only reported once the stroke is released
    if (this._canvas.hasPointerCapture(event.pointerId)) return;
    this._focusGui = true;
    this._gui.callFunc('onMouseOut', event);
    this.onMouseUp(event);
  }

  onMouseUp(event) {
    event.preventDefault();

    this._gui.callFunc('onMouseUp', event);
    this.onDeviceUp();
  }

  onMouseWheel(event) {
    event.stopPropagation();
    event.preventDefault();

    this._gui.callFunc('onMouseWheel', event);
    if (event.deltaY === 0) return;
    this.onDeviceWheel(event.deltaY < 0 ? 1 : -1);
  }

  ////////////////
  // HANDLES EVENTS
  ////////////////
  onDeviceUp() {
    this.setCanvasCursor('default');
    Multimesh.RENDER_HINT = Multimesh.NONE;
    this._sculptManager.end();

    if (this._action === Enums.Action.MASK_EDIT && this._mesh) {

      if (this._lastMouseX === this._maskX && this._lastMouseY === this._maskY)
        this.getSculptManager().getTool(Enums.Tools.MASKING).invert();
      else
        this.getSculptManager().getTool(Enums.Tools.MASKING).clear();

    }

    this._action = Enums.Action.NOTHING;
    this.render();
    this._stateManager.cleanNoop();
  }

  onDeviceWheel(dir) {
    if (dir > 0.0 && !this._isWheelingIn) {
      this._isWheelingIn = true;
      this._camera.start(this._mouseX, this._mouseY);
    }
    this._camera.zoom(dir * 0.02);
    Multimesh.RENDER_HINT = Multimesh.CAMERA;
    this.render();
    // workaround for "end mouse wheel" event
    if (this._timerEndWheel)
      window.clearTimeout(this._timerEndWheel);
    this._timerEndWheel = window.setTimeout(this._endWheel.bind(this), 300);
  }

  _endWheel() {
    Multimesh.RENDER_HINT = Multimesh.NONE;
    this._isWheelingIn = false;
    this.render();
  }

  setMousePosition(event) {
    this._mouseX = this._pixelRatio * (event.pageX - this._canvasOffsetLeft);
    this._mouseY = this._pixelRatio * (event.pageY - this._canvasOffsetTop);
  }

  onDeviceDown(event) {
    if (this._focusGui)
      return;

    this.setMousePosition(event);

    var mouseX = this._mouseX;
    var mouseY = this._mouseY;
    var button = event.which;

    var canEdit = false;
    if (button === MOUSE_LEFT)
      canEdit = this._sculptManager.start(event.shiftKey);

    if (button === MOUSE_LEFT && canEdit)
      this.setCanvasCursor('none');

    if (button === MOUSE_RIGHT && event.ctrlKey)
      this._action = Enums.Action.CAMERA_ZOOM;
    else if (button === MOUSE_MIDDLE)
      this._action = Enums.Action.CAMERA_PAN;
    else if (!canEdit && event.ctrlKey) {
      this._maskX = mouseX;
      this._maskY = mouseY;
      this._action = Enums.Action.MASK_EDIT;
    } else if ((!canEdit || button === MOUSE_RIGHT) && event.altKey)
      this._action = Enums.Action.CAMERA_PAN_ZOOM_ALT;
    else if (button === MOUSE_RIGHT || (button === MOUSE_LEFT && !canEdit))
      this._action = Enums.Action.CAMERA_ROTATE;
    else
      this._action = Enums.Action.SCULPT_EDIT;

    if (this._action === Enums.Action.CAMERA_ROTATE || this._action === Enums.Action.CAMERA_ZOOM)
      this._camera.start(mouseX, mouseY);

    this._lastMouseX = mouseX;
    this._lastMouseY = mouseY;
  }

  getSpeedFactor() {
    return this._cameraSpeed / (this._canvasHeight * this.getPixelRatio());
  }

  onDeviceMove(event) {
    if (this._focusGui)
      return;
    this.setMousePosition(event);

    var mouseX = this._mouseX;
    var mouseY = this._mouseY;
    var action = this._action;
    var speedFactor = this.getSpeedFactor();

    if (action === Enums.Action.CAMERA_ZOOM || (action === Enums.Action.CAMERA_PAN_ZOOM_ALT && !event.altKey)) {

      Multimesh.RENDER_HINT = Multimesh.CAMERA;
      this._camera.zoom((mouseX - this._lastMouseX + mouseY - this._lastMouseY) * speedFactor);
      this.render();

    } else if (action === Enums.Action.CAMERA_PAN_ZOOM_ALT || action === Enums.Action.CAMERA_PAN) {

      Multimesh.RENDER_HINT = Multimesh.CAMERA;
      this._camera.translate((mouseX - this._lastMouseX) * speedFactor, (mouseY - this._lastMouseY) * speedFactor);
      this.render();

    } else if (action === Enums.Action.CAMERA_ROTATE) {

      Multimesh.RENDER_HINT = Multimesh.CAMERA;
      if (!event.shiftKey)
        this._camera.rotate(mouseX, mouseY);
      this.render();

    } else {

      Multimesh.RENDER_HINT = Multimesh.PICKING;
      this._sculptManager.preUpdate();

      if (action === Enums.Action.SCULPT_EDIT) {
        Multimesh.RENDER_HINT = Multimesh.SCULPT;
        this._sculptManager.update(this);
        if (this.getMesh().isDynamic)
          this._gui.updateMeshInfo();
      }
    }

    this._lastMouseX = mouseX;
    this._lastMouseY = mouseY;
    this.renderSelectOverRtt();
  }
}

export default SculptGL;
