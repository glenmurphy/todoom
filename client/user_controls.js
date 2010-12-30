function UserControls(controller, user) {};
UserControls = GMBase.DOMObject.Constructor();

UserControls.prototype.constructor_ = function(controller, user) {
  this.controller = controller;
  this.user = user;
  this.classList.add('view-manager');

  // createElement('div', 'banner-left', this);

  this.container = createElement('div', 'container', this);

  if (user == this.controller.user) {
    this.archive_tasks_button = createElement('div', 'control archive', this.container);
    this.archive_tasks_button.addEventListener('click', this.handleArchiveTasks.bind(this));
    ToolTip().watch(this.archive_tasks_button, "Archive finished tasks");
  }
  
  this.close_button = createElement('div', 'control close', this.container);
  this.close_button.addEventListener('click', this.handleClose.bind(this));
};

UserControls.prototype.handleClose = function() {
  getUI().hideUser(this.user);
};

UserControls.prototype.handleArchiveTasks = function() {
  this.controller.archiveUserTasks(this.user);
};