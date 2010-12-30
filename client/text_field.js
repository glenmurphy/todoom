/**
 * A field that represents a single textfield in a model when the user changes
 * its value, we ask the controller to update the value.
 *
 * @param {ClientController} controller
 * @param {String} className
 * @param {GMBase.Model} model
 * @param model_key
 */
var TextField = function(controller, className, model, model_key) {};
TextField = GMBase.DOMObject.Constructor('div');

TextField.prototype.constructor_ = function(controller, className, model, model_key) {
  this.classList.add('textfield');
  this.classList.add(className);
  
  this.controller = controller;
  
  this.model = model;
  this.model.addListener(model_key + '_changed', this.handleModelChanged.bind(this));
  this.model_key = model_key;

  this.display_name = createElement('div', 'textfield-placeholder', this);
  this.display_name.innerText = this.model[this.model_key];

  this.editor = new InputField('textfield-editor', this.model[this.model_key]);
  this.editor.addListener('submit', this.handleEditorDone.bind(this));
  this.editor.addListener('blur', this.handleEditorDone.bind(this));
  this.editing_ = false;
  this.hideEditor();
  this.appendChild(this.editor);
  
  this.addEventListener('click', this.handleStartEditing.bind(this), false);
};

TextField.prototype.showEditor = function() {
  this.editing_ = true;
  var width = this.display_name.offsetWidth + 32;
  if (width < 160) width = 160;
  
  this.editor.style.width = width;
  this.editor.setValue(this.model[this.model_key]);
  this.editor.classList.remove('hidden');
  this.editor.focus();
  this.display_name.classList.add('hidden');
};

TextField.prototype.hideEditor = function() {
  this.editing_ = false;
  this.editor.classList.add('hidden');
  this.display_name.classList.remove('hidden');
};

TextField.prototype.handleStartEditing = function() {
  if (!this.editing_)
    this.showEditor();
};

TextField.prototype.handleEditorDone = function(data) {
  if (data.value != this.model[this.model_key]) {
    this.controller.changeValue(this.model, this.model_key, data.value);
    this.display_name.innerText = data.value;
  }
  this.hideEditor();
};

TextField.prototype.handleModelChanged = function(data) {
  this.display_name.innerHTML = this.model[this.model_key];
};