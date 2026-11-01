import GuiUtils from './GuiUtils';

const EditStyle = {};

EditStyle.refRules = {};

let yaguiSheet;
const findSheet = function () {
  if (yaguiSheet) return yaguiSheet;
  const sheets = document.styleSheets;
  for (let i = 0, nb = sheets.length; i < nb; ++i) {
    const href = sheets[i].href;
    if (href && href.indexOf('yagui.css') !== -1) {
      yaguiSheet = sheets[i];
      return yaguiSheet;
    }
  }
  return;
};

const editStyle = function (selector, key, value) {
  const sheet = findSheet();
  if (!sheet)
    return;
  const rules = sheet.cssRules || sheet.rules;
  let rule = EditStyle.refRules[selector];
  if (!rule) {
    let i = 0;
    const len = rules.length;
    for (i = 0; i < len; ++i) {
      if (rules[i].selectorText === selector) break;
    }
    if (i === len) return false;
    rule = EditStyle.refRules[selector] = rules[i];
  }
  if (rule)
    rule.style[key] = value;
};

EditStyle.changeWidgetsColor = function (color) {
  const str = GuiUtils.getStrColor(color);
  // button
  editStyle('.gui-button', 'background', str);
  // select
  editStyle('.gui-select', 'background', str);
  // slider
  editStyle('.gui-slider > div', 'background', str);
  EditStyle._curWidgetColor = color;
};

EditStyle.changeDisplayBoorder = function (bool) {
  const str = bool ? '1px solid #000' : '0';
  editStyle('.gui-button', 'border', str);
  // select
  editStyle('.gui-select', 'border', str);
  // slider
  editStyle('.gui-slider', 'border', str);
  editStyle('.gui-input-number', 'border', str);
  // folder
  editStyle('.gui-sidebar > ul > label', 'borderTop', str);
  editStyle('.gui-sidebar > ul > label', 'borderBottom', str);
  // side bar
  editStyle('.gui-sidebar', 'borderLeft', str);
  editStyle('.gui-sidebar', 'borderRight', str);
  // top bar
  editStyle('.gui-topbar', 'borderBottom', str);
  EditStyle._curShowBorder = bool;
};

EditStyle.changeBackgroundColor = function (color) {
  // side bar
  editStyle('.gui-sidebar', 'background', GuiUtils.getStrColor(color));
  // top bar
  const colTop = GuiUtils.getStrColor(GuiUtils.getColorMult(color, 0.5));
  editStyle('.gui-topbar', 'background', colTop);
  editStyle('.gui-topbar ul > li > ul', 'background', colTop);
  EditStyle._curBackgroundColor = color;
};

EditStyle.changeTextColor = function (color) {
  const strColor = GuiUtils.getStrColor(color);
  editStyle('*', 'color', strColor);
  editStyle('.gui-sidebar > ul > label', 'color', strColor);
  EditStyle._curTextColor = color;
};

EditStyle.changeOverallColor = function (color) {
  EditStyle.changeWidgetsColor(color);
  const bgCol = GuiUtils.getColorMult(color, 0.5);
  bgCol.length = 3;
  EditStyle.changeBackgroundColor(bgCol);

  const texCol = GuiUtils.getColorAdd(color, 0.5);
  for (let i = 0; i < 3; ++i) texCol[i] = Math.min(0.8, texCol[i]);
  EditStyle.changeTextColor(texCol);

  EditStyle._curWidgetColor = color;
  EditStyle._curBackgroundColor = bgCol;
  EditStyle._curTextColor = texCol;
};

// init value
EditStyle._curTextColor = [0.73, 0.73, 0.73, 1.0];
EditStyle._curWidgetColor = [0.32, 0.37, 0.39, 1.0];
EditStyle._curBackgroundColor = [0.24, 0.24, 0.24];
EditStyle._curShowBorder = false;

EditStyle.changeOverallColor([0.3, 0.34, 0.4, 1.0]);

export default EditStyle;
