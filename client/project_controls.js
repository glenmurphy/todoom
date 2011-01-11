function ProjectControls(controller, project) {};
ProjectControls = GMBase.DOMObject.Constructor();

ProjectControls.prototype.constructor_ = function(controller, project) {
  this.controller = controller;
  this.project = project;
  this.classList.add('view-manager');

  createElement('div', 'banner-left', this);

  this.container = createElement('div', 'container', this);

  this.users_button = createElement('div', 'control users', this.container);
  this.users_button.addEventListener('click', this.handleUsersButton.bind(this), false);
  ToolTip().watch(this.users_button, "Add a user to this project");

  this.archive_tasks_button = createElement('div', 'control archive', this.container);
  this.archive_tasks_button.addEventListener('click', this.handleArchiveTasksButton.bind(this), false);
  ToolTip().watch(this.archive_tasks_button, "Archive finished tasks");

  this.close_button = createElement('div', 'control close', this.container);
  this.close_button.addEventListener('click', this.handleCloseButton.bind(this), false);
};

ProjectControls.prototype.handleUsersButton = function() {
  getUI().showProjectUserManager(this.project);
};

ProjectControls.prototype.handleArchiveTasksButton = function() {
  this.controller.archiveProjectTasks(this.project);
};

ProjectControls.prototype.handleCloseButton = function() {
  getUI().hideProject(this.project);
};
