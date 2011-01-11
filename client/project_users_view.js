/**
 * @param {ClientController} controller
 * @param {Project} project
 * @param {ProjectView} project_view
 */
var ProjectUsersView = function(controller, project, project_view) {};
ProjectUsersView = GMBase.DOMObject.Constructor();

ProjectUsersView.prototype.constructor_ = function(controller, project, project_view) {
  this.controller = controller;
  this.project = project;
  this.project_view = project_view;

  this.updateBound = this.update.bind(this);
  this.project.addListener('users_changed', this.updateBound);

  this.classList.add('project-users');
  this.classList.add('minimized');

  this.title_node = createElement('div', 'title', this);
  this.title_node.innerHTML = this.project.name + ': Manage users';

  this.close_button = createElement('div', 'close', this);
  this.close_button.addEventListener('click', this.handleClose.bind(this), false);

  this.user_list = createElement('div', 'users-list', this);
  this.user_views = {}; // User key to node.
  
  this.add_user = new InputField('add-user');
  this.add_user.setPlaceholder("New user's email address");
  
  this.handleAddUserBound = this.handleAddUser.bind(this);
  this.add_user.addListener('submit', this.handleAddUserBound);
  this.appendChild(this.add_user);
  
  this.update();
  
  this.project_view.addProjectUsersView(this);
  setTimeout((function() {this.classList.remove('minimized');}).bind(this), 1);
};

ProjectUsersView.prototype.handleAddUser = function(inputdata) {
  // TODO: email validation.
  
  this.controller.addProjectUser(this.project.key, inputdata.value);
  this.add_user.setValue('');
};

ProjectUsersView.prototype.handleRemoveUser = function(user_key) {
  this.controller.removeProjectUser(this.project.key, user_key);
};

ProjectUsersView.prototype.handleClose = function() {
  this.classList.add('minimized');
  this.project.removeListener('users_changed', this.updateBound);
  this.add_user.removeListener('submit', this.handleAddUserBound);

  setTimeout((function() {
    this.project_view.removeProjectUsersView(this);
  }).bind(this), 1000);
};

ProjectUsersView.prototype.update = function() {
  // Delete non-existent users.
  for (var current in this.user_views) {
    if(!this.project.users.contains(current)) {
      this.user_list.removeChild(this.user_views[current]);
      delete this.user_views[current];
    }
  }

  // Add new users.
  for (var i = 0, user_key; user_key = this.project.users[i]; i++) {
    if (user_key in this.user_views)
      continue;

    var user = this.controller.getUser(user_key);

    // It's possible that the project is updated before the user is added,
    // so let's check if the user is present, and if not, we'll just wait
    // a while.
    // TODO: find a better solution for this.
    if (!user) {
      setTimeout(this.update.bind(this), 500);
      return;
    }
    
    var view = createElement('div', 'user-managed', this.user_list);

    var name = (user.name ? user.name + ', ' : '') + user.email;
    view.appendChild(document.createTextNode(name));

    var remove = createElement('div', 'remove', view);
    remove.appendChild(document.createTextNode('remove'));
    remove.addEventListener('click', this.handleRemoveUser.bind(this, user_key), false);
    
    this.user_views[user_key] = view;
  }
};


