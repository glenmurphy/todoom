function TaskList(controller, model) {}
TaskList = GMBase.DOMObject.Constructor();

TaskList.prototype.constructor_ = function(controller, model) {
  this.controller = controller;
  this.model = model;
  this.model_key = model.key;

  this.classList.add('task-list');

  this.separator = createElement('hr', 'separator');
  this.separator.appendChild(document.createTextNode(
      this.model.type == Project.TYPE ? 'Unowned' : 'Personal'
      ));
  
  this.task_views = [];
  var tasks = this.controller.getTasksForModel(this.model);
  for (var i = 0, task; task = tasks[i]; i++) {
    this.newTask(task);
  }

  this.controller.addListener('new_task', this.handleNewTask.bind(this));
  this.controller.addListener('changed_task', this.handleChangedTask.bind(this));
  this.controller.addListener('deleted_task', this.handleDeletedTask.bind(this));
  this.model.addListener('archive_tasks_before_changed', this.sortList.bind(this));

  this.sortList();

};

TaskList.prototype.newTask = function(task) {
  var task_view = new TaskView(this.controller, task);
  task_view.setPresentationType(this.model.type);
  this.task_views.push(task_view);
};

/**
 * Because a tasklist can be host to different parent models (usually
 * project or user), when a task item is changed or added, we use
 * different keys depending on the parent to figure out what happened
 * to the task.
 */
TaskList.prototype.getRefKey = function() {
  if (this.model.type == User.TYPE)
    return 'owner';
  else if (this.model.type == Project.TYPE)
    return 'project';
};

TaskList.prototype.getOppositeRefKey = function() {
  if (this.model.type == User.TYPE)
    return 'project';
  else if (this.model.type == Project.TYPE)
    return 'owner';
}

TaskList.prototype.handleNewTask = function(data) {
  var task = data.task;
  var ref_key = this.getRefKey();

  if (task[ref_key] != this.model_key) {
    return;
  }

  this.newTask(task);
  this.sortList();
};

TaskList.prototype.sortList = function() {
  var ref_key = this.getOppositeRefKey();

  this.task_views.sort(function(a, b) {
    // Sort by owned/project state.
    var a_def = !!(a.task[ref_key]);
    var b_def = !!(b.task[ref_key]);
    if (!a_def && b_def)
      return 1;
    else if (a_def && !b_def)
      return -1;

    // Sort by status
    if (a.task.status != b.task.status)
      return compare(a.task.status, b.task.status);

    // Sort by project
    if (a.task.project != b.task.project)
      return compare(a.task.project, b.task.project);

    // Sort by id.
    return compare(b.task.key, a.task.key);
  });

  if (this.separator.parentNode == this) {
    this.removeChild(this.separator);
  }

  for (var i = 0, task_view; task_view = this.task_views[i]; i++) {
    if (!task_view.task[ref_key] && this.separator.parentNode != this) {
      this.appendChild(this.separator);
    }
    
    if(task_view.task.status == Task.STATUS_FINISHED &&
       task_view.task.completed_date < this.model.archive_tasks_before) {
      try {
        this.removeChild(task_view);
      } catch(e) {}
    } else {
      this.appendChild(task_view);
    }
  }
};

TaskList.prototype.removeTask = function(task) {
  for (var i = 0, task_view; task_view = this.task_views[i]; i++) {
    if (task_view.task.key == task.key) {
      this.removeChild(task_view);
      this.task_views.remove(i);
      break;
    }
  }
  this.sortList();
};

TaskList.prototype.handleChangedTask = function(data) {
  var old_task = data.original_data;
  var task = data.task;

  var ref_key = this.getRefKey();
  // TODO: Combine these (they differ on keys only).
  if (task[ref_key] != this.model_key) {
    if (old_task[ref_key] == this.model_key) {
      this.removeTask(task);
    }
    return;
  }

  if (old_task[ref_key] != this.model_key) {
    this.newTask(task);
  }
  this.sortList();
};

TaskList.prototype.handleDeletedTask = function(data) {
  var ref_key = this.getRefKey();
  if (data.task[ref_key] == this.model_key) {
    this.removeTask(data.task);
  }
  this.sortList();
};