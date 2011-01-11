function TaskView(controller, task) {}
TaskView = GMBase.DOMObject.Constructor();

TaskView.prototype.constructor_ = function(controller, task) {
  this.controller = controller;
  this.task = task;

  this.classList.add('task');

  this.status = new StatusView(this.controller, this.task);
  this.appendChild(this.status);

  this.project = createElement('div', 'project-name', this);
  this.project.addEventListener('click', this.handleProjectClicked.bind(this), false);

  this.name = new TextField(this.controller, 'name', this.task, 'name');
  this.appendChild(this.name);

  this.owner = new OwnerView(this.controller, this.task);
  this.appendChild(this.owner);

  this.task.addListener('status_changed', this.update.bind(this));
  this.task.addListener('project_changed', this.updateProject.bind(this));

  this.update();
  this.updateProject();
};

TaskView.prototype.update = function() {
  if (this.task.status == Task.STATUS_FINISHED) {
    this.classList.add('finished');
  } else {
    this.classList.remove('finished');
  }
};

TaskView.prototype.setPresentationType = function(type) {
  if (type == Project.TYPE) {
    this.owner.style.display = 'inline-block';
    this.project.style.display = 'none';
  } else {
    this.owner.style.display = 'none';
    if (this.project.innerText)
      this.project.style.display = 'inline-block';
    else
      this.project.style.display = 'none';
  }
};

TaskView.prototype.updateProject = function() {
  if (this.task.project) {
    var project = this.controller.getProject(this.task.project);
    this.project.innerText = project.name;
  } else {
    this.project.innerText = '';
  }
};

TaskView.prototype.handleProjectClicked = function() {
  var project = this.controller.getProject(this.task.project);
  if (project) {
    getUI().showProject(project);
  } else {
    this.project.innerText = '';
  }
};