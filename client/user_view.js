var UserView = function(controller, user) {};
UserView = GMBase.DOMObject.Constructor();

/**
 * @param {ClientController} controller
 * @param {User} user
 */
UserView.prototype.constructor_ = function(controller, user) {
  this.controller = controller;
  this.user = user;
  this.classList.add('user');

  this.name_field = new TextField(this.controller, 'title', this.user, 'name');
  this.appendChild(this.name_field);

  this.user_manager = new UserControls(this.controller, this.user);
  this.appendChild(this.user_manager);

  this.task_list = new TaskList(this.controller, this.user);
  this.appendChild(this.task_list);

  this.add_task_field = new InputField('create-field');
  this.add_task_field.setPlaceholder("New task for " + this.user.name);
  this.add_task_field.addListener('submit', this.createTask.bind(this));
  this.appendChild(this.add_task_field);
};

UserView.prototype.createTask = function(data) {
  this.controller.createTask({
    owner : this.user.key,
    name : data.value
  });
  this.add_task_field.setValue('');
};
