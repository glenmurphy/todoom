var ProjectView = function(controller, project) {}
ProjectView = GMBase.DOMObject.Constructor();

/**
 * @param {ClientController} controller
 * @param {Project} project
 */
ProjectView.prototype.constructor_ = function(controller, project) {
  this.controller = controller;
  this.project = project;
  this.classList.add('project');

  this.title_field = new TextField(this.controller, 'title', this.project, 'name');
  this.appendChild(this.title_field);

  this.project_manager = new ProjectControls(this.controller, this.project);
  this.appendChild(this.project_manager);

  this.task_list = new TaskList(this.controller, this.project);
  this.appendChild(this.task_list);

  this.add_task_field = new InputField('create-field');
  this.add_task_field.setPlaceholder("New task for " + this.project.name);
  this.add_task_field.addListener('submit', this.createTask.bind(this));
  this.appendChild(this.add_task_field);
};

ProjectView.prototype.createTask = function(data) {
  this.controller.createTask({
    project : this.project.key,
    name : data.value
  });
  this.add_task_field.setValue('');
};

ProjectView.prototype.addProjectUsersView = function(view) {
  this.appendChild(view);
};

ProjectView.prototype.removeProjectUsersView = function(view) {
  this.removeChild(view);
  delete view;
};