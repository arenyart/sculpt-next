import BaseWidget from './BaseWidget';

class Combobox extends BaseWidget {

  constructor(valOrObject, callbackOrKey, options) {
    super();

    let value = this._getInitialValue(valOrObject, callbackOrKey);
    const callback = this._getCheckCallback(valOrObject, callbackOrKey);
    options = options || {};
    value = value !== undefined ? value : options[0];

    this.isArray = options.length !== undefined;

    this.domSelect = document.createElement('select');
    this.domSelect.className = 'gui-select';
    this.addOptions(options);

    this.domSelect.addEventListener('change', this._onChange.bind(this));
    this.setValue(value);
    this.setCallback(callback);
  }

  _parseValue(val) {
    return this.isArray ? parseInt(val, 10) : val;
  }

  _onChange(ev) {
    this.setValue(ev.target.value);
  }

  addOptions(options) {
    const keys = Object.keys(options);
    for (let i = 0; i < keys.length; ++i) {
      const opt = document.createElement('option');
      opt.innerHTML = options[keys[i]];
      opt.value = keys[i];
      this.domSelect.appendChild(opt);
    }
  }

  setValue(val, ignoreCB) {
    this.domSelect.value = val;
    if (!ignoreCB && this.callback) this.callback(this._parseValue(val));
  }

  getValue() {
    return this._parseValue(this.domSelect.value);
  }
}

export default Combobox;
