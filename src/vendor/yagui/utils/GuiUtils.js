const GuiUtils = {};

GuiUtils.rgbToHsv = function (rgb) {
  const r = rgb[0];
  const g = rgb[1];
  const b = rgb[2];
  const maxRGB = Math.max(r, g, b);
  const minRGB = Math.min(r, g, b);
  if (minRGB === maxRGB) return [0, 0, minRGB];
  const d = (r === minRGB) ? g - b : ((b === minRGB) ? r - g : b - r);
  const h = (r === minRGB) ? 3 : ((b === minRGB) ? 1 : 5);
  return [(h - d / (maxRGB - minRGB)) / 6, (maxRGB - minRGB) / maxRGB, maxRGB];
};

GuiUtils.hsvToRgb = function (hsv) {
  const h = hsv[0] * 6;
  const s = hsv[1];
  const v = hsv[2];
  const i = Math.floor(h);
  const f = h - i;
  const p = v * (1.0 - s);
  const q = v * (1.0 - f * s);
  const t = v * (1.0 - (1.0 - f) * s);
  const mod = i % 6;
  if (mod === 0) return [v, t, p];
  else if (mod === 1) return [q, v, p];
  else if (mod === 2) return [p, v, t];
  else if (mod === 3) return [p, q, v];
  else if (mod === 4) return [t, p, v];
  else return [v, p, q];
};

GuiUtils.getValidColor = function (color) {
  for (let i = 0, len = color.length; i < len; ++i) color[i] = Math.max(0.0, Math.min(1.0, color[i]));
  return color;
};

GuiUtils.getStrColor = function (color) {
  if (color.length === 3) return GuiUtils.rgbToHex(color);
  return 'rgba(' + Math.round(color[0] * 255) + ',' + Math.round(color[1] * 255) + ',' + Math.round(color[2] * 255) + ',' + color[3] + ')';
};

GuiUtils.getColorMult = function (color, fac) {
  const out = [color[0] * fac, color[1] * fac, color[2] * fac];
  if (color.length === 4) out.push(color[3]);
  return GuiUtils.getValidColor(out);
};

GuiUtils.getColorAdd = function (color, add) {
  const out = [color[0] + add, color[1] + add, color[2] + add];
  if (color.length === 4) out.push(color[3]);
  return GuiUtils.getValidColor(out);
};

GuiUtils.rgbToHex = function (rgb) {
  let h = '#';
  for (let i = 0; i < 3; ++i) {
    const c = Math.round(rgb[i] * 255).toString(16);
    h += c.length === 1 ? '0' + c : c;
  }
  return h;
};

GuiUtils.hexToRgb = function (hex) {
  let i = 0;
  if (hex[0] === '#') hex = hex.slice(1);
  let h = hex;
  if (hex.length > 6) h = hex.slice(0, 6);
  else if (hex.length < 6) {
    h = '';
    for (i = 0; i < 3; ++i)
      h += hex[i] ? hex[i] + hex[i] : '00';
  }
  const col = [0, 0, 0];
  for (i = 0; i < 3; ++i) {
    const c = parseInt(h[i * 2] + h[i * 2 + 1], 16);
    col[i] = (c !== c ? 0 : c) / 255;
  }
  return col;
};

export default GuiUtils;
