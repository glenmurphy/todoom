var OwnerView = function(controller, task) {};
OwnerView = GMBase.DOMObject.Constructor('div');

/**
 * @param {ClientController} controller
 * @param {Task} task
 */
OwnerView.prototype.constructor_ = function(controller, task) {
  this.controller = controller;
  this.classList.add('owner');

  // Create the text.
  this.name = createElement('div', 'name', this);
  this.name.addEventListener('click', this.handleNameClicked.bind(this));
  ToolTip().watch(this.name, '')
  this.appendChild(this.name);
  
  this.task = task;
  this.task.addListener('owner_changed', this.handleChanged.bind(this));

  this.handleNameChangedBound = this.handleOwnerNameChanged.bind(this);
  if (this.task.owner) {
    this.user = this.controller.users[this.task.owner];
    this.user.addListener('name_changed', this.handleNameChangedBound);
  } else {
    this.user = null;
  }

  this.update();
};

OwnerView.prototype.update = function() {
  if (this.task.owner) {
    this.name.classList.remove('unassigned');
    this.name.innerText = this.controller.users[this.task.owner].name;
    this.name.setAttribute('data-tooltip', this.controller.users[this.task.owner].email);
  } else {
    this.name.classList.add('unassigned');
    this.name.setAttribute('data-tooltip', '');
    this.name.innerText = 'no-one';
  }
};

OwnerView.prototype.handleOwnerNameChanged = function() {
  this.update();
};

OwnerView.prototype.handleNameClicked = function() {
  var params = [];
  var users = this.controller.getUsersForTask(this.task.key);
  for (var i = 0, user_key; user_key = users[i]; i++) {
    params.push({
      name : this.controller.getUserName(user_key),
      clickHandler : this.handleMenuClicked.bind(this, user_key)
    });
  }
  if (this.task.owner) {
    params.push({});
    params.push({
      name : 'Unassign',
      clickHandler : this.handleUnassign.bind(this)
    });
  }
  new Menu(this, params);
};

OwnerView.prototype.handleUnassign = function() {
  this.controller.changeValue(this.task, 'owner', null);
};

OwnerView.prototype.handleMenuClicked = function(user_key) {
  this.controller.changeValue(this.task, 'owner', user_key);
};

OwnerView.prototype.handleChanged = function() {
  // If the owner changed, swap our listeners.
  if (this.user && this.user.key != this.task.owner) {
    this.user.removeListener('name_changed', this.handleNameChangedBound);
    this.user = null;
  }
  if (this.task.owner && !this.user) {
    this.user = this.controller.users[this.task.owner];
    this.user.addListener('name_changed', this.handleNameChangedBound);
  }
  this.update();
};