/**
 * A field that represents a single textfield. Emits a 'changed' event when
 * the field has changed.
 *
 * @param {String} className
 */
var InputField = function(className) {};
InputField = GMBase.DOMObject.Constructor('input');

InputField.prototype.constructor_ = function(className, value) {
  if (className)
    this.classList.add(className);

  this.type = 'text';
  if (!value) value = '';

  this.value = value;
  this.focused_ = false;
  this.editing_ = false;
  this.real_value_ = value;
  this.addEventListener('focus', this.handleFocus.bind(this), false);
  this.addEventListener('blur', this.handleBlur.bind(this), false);
  this.addEventListener('keyup', this.handleKeyPress.bind(this), false);
};

InputField.prototype.setPlaceholder = function(text) {
  this.placeholder = text;
};

InputField.prototype.setValue = function(value) {
  this.value = value;
  this.real_value_ = value;
};

InputField.prototype.setType = function(type) {
  this.type = type;
};

InputField.prototype.handleFocus = function() {
  this.real_value_ = this.value;
  this.focused_ = true;
};

InputField.prototype.handleBlur = function() {
  this.editing_ = false;
  this.focused_ = false;
  this.notifyListeners('blur', {value:this.value});
};

InputField.prototype.handleKeyPress = function(e) {
  if (e.keyCode == 13) {
    e.preventDefault();
    this.notifyListeners('submit', {value:this.value});
    this.editing_ = false;
    return;
  } else {
    this.notifyListeners('changed', {value:this.value});
  }
  this.editing_ = (this.value != this.real_value_);
};