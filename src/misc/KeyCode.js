const NAMED_KEYS = {
  Space: 32,
  Delete: 46,
  ArrowLeft: 37,
  ArrowUp: 38,
  ArrowRight: 39,
  ArrowDown: 40
};

/**
 * Map a KeyboardEvent to the legacy `keyCode` numbering used by the shortcut table
 * (letters and digits are their uppercase char code), without relying on the
 * deprecated `which`/`keyCode` properties.
 * Digits use the physical key so they work on AZERTY layouts and the numpad;
 * letters follow the active layout, falling back to the physical key (e.g. Cyrillic).
 */
const getKeyCode = function (event) {
  const code = event.code || '';

  const digit = /^(?:Digit|Numpad)(\d)$/.exec(code);
  if (digit) return digit[1].charCodeAt(0);

  const key = event.key || '';
  if (key.length === 1 && /[a-z]/i.test(key)) return key.toUpperCase().charCodeAt(0);

  const letter = /^Key([A-Z])$/.exec(code);
  if (letter) return letter[1].charCodeAt(0);

  if (NAMED_KEYS[code] !== undefined) return NAMED_KEYS[code];
  if (NAMED_KEYS[key] !== undefined) return NAMED_KEYS[key];
  if (key === ' ') return 32;

  return event.keyCode;
};

export default getKeyCode;
