const TAP_MAX_TIME = 250; // max press duration of a tap (ms)
const TAP_INTERVAL = 450; // max delay between the two taps of a double tap (ms)
const TAP_THRESHOLD = 5; // movement allowed during a tap (px)
const TAP_POS_THRESHOLD = 50; // max distance between the two taps (px)
const PINCH_THRESHOLD = 0.1; // scale change needed before a pinch starts

/**
 * Pointer Events based touch gestures (pan with 1..n fingers, 2-finger pinch,
 * 1 and 2 finger double tap). Only handles `pointerType === 'touch'`.
 *
 * Callbacks receive a `center` ({ x, y } in page coordinates) and the number of active pointers.
 */
class TouchGestures {

  constructor(element, callbacks) {
    this._element = element;
    this._cb = callbacks;
    this._pointers = new Map();

    this._panning = false;
    this._gestureStart = 0;
    this._gestureMaxPointers = 0;
    this._gestureMoved = false;
    this._lastTap = null;

    this._pinchStartDist = 0;
    this._pinching = false;

    this._onDown = this._onDown.bind(this);
    this._onMove = this._onMove.bind(this);
    this._onUp = this._onUp.bind(this);

    element.addEventListener('pointerdown', this._onDown);
    element.addEventListener('pointermove', this._onMove);
    element.addEventListener('pointerup', this._onUp);
    element.addEventListener('pointercancel', this._onUp);
  }

  destroy() {
    const el = this._element;
    el.removeEventListener('pointerdown', this._onDown);
    el.removeEventListener('pointermove', this._onMove);
    el.removeEventListener('pointerup', this._onUp);
    el.removeEventListener('pointercancel', this._onUp);
  }

  getNbPointers() {
    return this._pointers.size;
  }

  _getCenter() {
    let x = 0;
    let y = 0;
    for (const p of this._pointers.values()) {
      x += p.x;
      y += p.y;
    }
    const n = this._pointers.size || 1;
    return { x: x / n, y: y / n };
  }

  _getPinchDistance() {
    const [a, b] = this._pointers.values();
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  _resetPinch() {
    this._pinching = false;
    this._pinchStartDist = this._pointers.size === 2 ? this._getPinchDistance() : 0;
  }

  _onDown(event) {
    if (event.pointerType !== 'touch') return;
    this._element.setPointerCapture?.(event.pointerId);

    if (this._pointers.size === 0) {
      this._gestureStart = event.timeStamp;
      this._gestureMaxPointers = 0;
      this._gestureMoved = false;
    }

    this._pointers.set(event.pointerId, { x: event.pageX, y: event.pageY, x0: event.pageX, y0: event.pageY });
    this._gestureMaxPointers = Math.max(this._gestureMaxPointers, this._pointers.size);
    this._resetPinch();
  }

  _onMove(event) {
    const p = this._pointers.get(event.pointerId);
    if (!p) return;
    if (p.x === event.pageX && p.y === event.pageY) return;

    p.x = event.pageX;
    p.y = event.pageY;
    if (Math.hypot(p.x - p.x0, p.y - p.y0) > TAP_THRESHOLD) this._gestureMoved = true;

    const center = this._getCenter();
    const nb = this._pointers.size;
    if (!this._panning) {
      this._panning = true;
      this._cb.onPanStart?.(center, nb);
    } else {
      this._cb.onPanMove?.(center, nb);
    }

    if (nb === 2 && this._pinchStartDist > 0) {
      const scale = this._getPinchDistance() / this._pinchStartDist;
      if (!this._pinching && Math.abs(scale - 1.0) > PINCH_THRESHOLD) {
        this._pinching = true;
        this._cb.onPinchStart?.(scale);
      } else if (this._pinching) {
        this._cb.onPinch?.(scale);
      }
    }
  }

  _onUp(event) {
    const p = this._pointers.get(event.pointerId);
    if (!p) return;

    const center = this._getCenter();
    this._pointers.delete(event.pointerId);
    this._resetPinch();

    if (this._pointers.size > 0) return;

    if (this._panning) {
      this._panning = false;
      this._cb.onPanEnd?.();
    }

    const isTap = event.type === 'pointerup' && !this._gestureMoved && event.timeStamp - this._gestureStart < TAP_MAX_TIME;
    if (!isTap) {
      this._lastTap = null;
      return;
    }

    const tap = { time: event.timeStamp, center, nbPointers: this._gestureMaxPointers };
    const last = this._lastTap;
    const isDoubleTap = last &&
      last.nbPointers === tap.nbPointers &&
      tap.time - last.time < TAP_INTERVAL &&
      Math.hypot(tap.center.x - last.center.x, tap.center.y - last.center.y) < TAP_POS_THRESHOLD;

    if (isDoubleTap) {
      this._lastTap = null;
      if (tap.nbPointers === 1) this._cb.onDoubleTap?.(tap.center);
      else if (tap.nbPointers === 2) this._cb.onDoubleTap2Fingers?.(tap.center);
    } else {
      this._lastTap = tap;
    }
  }
}

export default TouchGestures;
