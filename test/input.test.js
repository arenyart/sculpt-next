import { describe, expect, test, vi } from 'vitest';
import getKeyCode from '../src/misc/KeyCode';
import getOptionsURL from '../src/misc/getOptionsURL';
import Enums from '../src/misc/Enums';
import TouchGestures from '../src/misc/TouchGestures';

describe('getKeyCode', () => {
  test('maps letters to their uppercase char code, following the layout', () => {
    expect(getKeyCode({ code: 'KeyW', key: 'w' })).toBe(87);
    expect(getKeyCode({ code: 'KeyZ', key: 'Z' })).toBe(90);
    // AZERTY: the physical "Q" key types "a"
    expect(getKeyCode({ code: 'KeyQ', key: 'a' })).toBe(65);
  });

  test('falls back to the physical key for non-latin layouts', () => {
    expect(getKeyCode({ code: 'KeyE', key: 'у' })).toBe(69);
  });

  test('maps digit row (even on AZERTY) and numpad to digit codes', () => {
    expect(getKeyCode({ code: 'Digit1', key: '&' })).toBe(49);
    expect(getKeyCode({ code: 'Numpad4', key: '4' })).toBe(52);
  });

  test('maps named keys', () => {
    expect(getKeyCode({ code: 'Space', key: ' ' })).toBe(32);
    expect(getKeyCode({ code: 'Delete', key: 'Delete' })).toBe(46);
    expect(getKeyCode({ code: 'ArrowUp', key: 'ArrowUp' })).toBe(38);
  });

  test('feeds the default shortcut table', () => {
    expect(getOptionsURL.getShortKey(getKeyCode({ code: 'Digit4', key: '4' }))).toBe(Enums.KeyAction.SMOOTH);
    expect(getOptionsURL.getShortKey(getKeyCode({ code: 'KeyW', key: 'w' }))).toBe(Enums.KeyAction.WIREFRAME);
    expect(getOptionsURL.getShortKey(getKeyCode({ code: 'Space', key: ' ' }))).toBe(Enums.KeyAction.CAMERA_RESET);
  });
});

describe('TouchGestures', () => {
  const setup = () => {
    const el = new EventTarget();
    const cb = {
      onPanStart: vi.fn(),
      onPanMove: vi.fn(),
      onPanEnd: vi.fn(),
      onPinchStart: vi.fn(),
      onPinch: vi.fn(),
      onDoubleTap: vi.fn(),
      onDoubleTap2Fingers: vi.fn()
    };
    new TouchGestures(el, cb);
    let t = 0;
    const fire = (type, pointerId, pageX, pageY, { pointerType = 'touch', dt = 10 } = {}) => {
      t += dt;
      const ev = new Event(type);
      Object.assign(ev, { pointerId, pageX, pageY, pointerType });
      Object.defineProperty(ev, 'timeStamp', { value: t });
      el.dispatchEvent(ev);
    };
    return { cb, fire };
  };

  test('one finger drag pans with the finger position', () => {
    const { cb, fire } = setup();
    fire('pointerdown', 1, 100, 100);
    fire('pointermove', 1, 120, 100);
    fire('pointermove', 1, 140, 110);
    fire('pointerup', 1, 140, 110);

    expect(cb.onPanStart).toHaveBeenCalledWith({ x: 120, y: 100 }, 1);
    expect(cb.onPanMove).toHaveBeenCalledWith({ x: 140, y: 110 }, 1);
    expect(cb.onPanEnd).toHaveBeenCalledTimes(1);
    expect(cb.onDoubleTap).not.toHaveBeenCalled();
  });

  test('two fingers report their centroid and pinch scale', () => {
    const { cb, fire } = setup();
    fire('pointerdown', 1, 100, 100);
    fire('pointerdown', 2, 200, 100);
    fire('pointermove', 2, 220, 100); // scale 1.2 -> pinch starts
    fire('pointermove', 2, 250, 100); // scale 1.5

    expect(cb.onPanStart).toHaveBeenCalledWith({ x: 160, y: 100 }, 2);
    expect(cb.onPinchStart).toHaveBeenCalledWith(expect.closeTo(1.2, 5));
    expect(cb.onPinch).toHaveBeenCalledWith(expect.closeTo(1.5, 5));

    fire('pointerup', 1, 100, 100);
    expect(cb.onPanEnd).not.toHaveBeenCalled();
    fire('pointerup', 2, 250, 100);
    expect(cb.onPanEnd).toHaveBeenCalledTimes(1);
  });

  test('two quick taps make a double tap', () => {
    const { cb, fire } = setup();
    fire('pointerdown', 1, 50, 60);
    fire('pointerup', 1, 50, 60, { dt: 80 });
    fire('pointerdown', 2, 53, 62, { dt: 150 });
    fire('pointerup', 2, 53, 62, { dt: 80 });
    expect(cb.onDoubleTap).toHaveBeenCalledWith({ x: 53, y: 62 });
    expect(cb.onPanStart).not.toHaveBeenCalled();
  });

  test('taps too far apart in time are not a double tap', () => {
    const { cb, fire } = setup();
    fire('pointerdown', 1, 50, 60);
    fire('pointerup', 1, 50, 60, { dt: 80 });
    fire('pointerdown', 2, 50, 60, { dt: 600 });
    fire('pointerup', 2, 50, 60, { dt: 80 });
    expect(cb.onDoubleTap).not.toHaveBeenCalled();
  });

  test('two-finger double tap', () => {
    const { cb, fire } = setup();
    for (let i = 0; i < 2; ++i) {
      fire('pointerdown', 10 + i * 2, 100, 100, { dt: 100 });
      fire('pointerdown', 11 + i * 2, 200, 100, { dt: 5 });
      fire('pointerup', 10 + i * 2, 100, 100, { dt: 60 });
      fire('pointerup', 11 + i * 2, 200, 100, { dt: 5 });
    }
    expect(cb.onDoubleTap2Fingers).toHaveBeenCalledTimes(1);
    expect(cb.onDoubleTap).not.toHaveBeenCalled();
  });

  test('ignores mouse and pen pointers', () => {
    const { cb, fire } = setup();
    fire('pointerdown', 1, 0, 0, { pointerType: 'mouse' });
    fire('pointermove', 1, 50, 0, { pointerType: 'mouse' });
    fire('pointerdown', 2, 0, 0, { pointerType: 'pen' });
    fire('pointermove', 2, 50, 0, { pointerType: 'pen' });
    expect(cb.onPanStart).not.toHaveBeenCalled();
  });
});
