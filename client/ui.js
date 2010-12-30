function UI(controller) {
  if (UI.current) {
    return UI.current;
  }
  
  this.controller = controller;
  this.controller.addListener('new_project', this.handleNewProject.bind(this));

  this.topbar = createElement('div', 'ui-nav hidden', document.body);

  this.waiting_for_project = false;
  
  this.project_views = {};
  this.user_views = {};

  this.body = createElement('div', 'main', document.body);
  this.users_column = createElement('div', 'col-users', this.body);
  this.projects_column = createElement('div', 'col-projects', this.body);

  this.menu_users = createElement('div', 'control', this.topbar);
  this.menu_users.innerHTML = 'Friends';
  this.menu_users.addEventListener('click', this.handleUsersClick.bind(this));

  this.menu_projects = createElement('div', 'control', this.topbar);
  this.menu_projects.innerHTML = 'Projects';
  this.menu_projects.addEventListener('click', this.handleProjectsClick.bind(this));

  this.controller.addListener('new_project', this.handleNewProject.bind(this));
  this.controller.addListener('signin_success', this.handleSignInSuccess.bind(this));

  this.signin = new SignInView(this.controller);

  UI.current = this;
  this.arrangeColumns();
}

UI.current = null;

UI.prototype.arrangeColumns = function() {
  if (isEmpty(this.user_views)) {
    this.projects_column.classList.add('solo');
    this.projects_column.classList.remove('hidden');
    this.users_column.classList.add('hidden');
  } else if (isEmpty(this.project_views)) {
    this.users_column.classList.add('solo');
    this.users_column.classList.remove('hidden');
    this.projects_column.classList.add('hidden');
  } else {
    this.users_column.classList.remove('solo');
    this.projects_column.classList.remove('solo');
  }
};

UI.prototype.showProject = function(project) {
  if (project.key in this.project_views)
    shake(this.project_views[project.key]);
  else {
    var project_view = new ProjectView(this.controller, project);
    this.projects_column.appendChild(project_view);
    this.project_views[project.key] = project_view;
  }
  this.arrangeColumns();
};

UI.prototype.showProjectUserManager = function(project) {
  if (!(project.key in this.project_views)) {
    window.console.error("Attempting to show user manager for non-visible project");
    return;
  }
  var project_view = this.project_views[project.key];
  new ProjectUserManager(this.controller, project_view, project);
};

UI.prototype.hideProject = function(project) {
  if (!(project.key in this.project_views)) {
    return;
  }
  this.projects_column.removeChild(this.project_views[project.key]);
  delete this.project_views[project.key];
  this.arrangeColumns();
};

UI.prototype.showUser = function(user) {
  if (user.key in this.user_views)
    shake(this.user_views[user.key]);
  else {
    var user_view = new UserView(this.controller, user);
    this.users_column.appendChild(user_view);
    this.user_views[user.key] = user_view;
  }
  this.arrangeColumns();
};

UI.prototype.hideUser = function(user) {
  if (!(user.key in this.user_views)) {
    return;
  }
  this.users_column.removeChild(this.user_views[user.key]);
  delete this.user_views[user.key];
  this.arrangeColumns();
};

UI.prototype.handleNewProject = function(data) {
  if (this.waiting_for_project) {
    this.showProject(data.project);
    this.waiting_for_project = false;
  }
};

UI.prototype.handleSignInSuccess = function() {
  this.topbar.classList.remove('hidden');
  this.showUser(this.controller.user);
};

UI.prototype.handleProjectsClick = function() {
  var params = [];
  var projects = this.controller.getProjectsForUser();
  for (var i = 0, project; project = projects[i]; i++) {
    params.push({
      name : project.name,
      clickHandler : this.showProject.bind(this, project)
    });
  }
  params.push({});
  params.push({
    name : 'New project...',
    clickHandler : this.handleCreateProjectClick.bind(this)
  });
  new Menu(this.menu_projects, params);
};

UI.prototype.handleUsersClick = function() {
  var params = [];
  var users = this.controller.getUsersForUser();
  for (var i = 0, user; user = users[i]; i++) {
    params.push({
      name : user.name ? user.name : user.email,
      clickHandler : this.showUser.bind(this, user)
    });
  }
  new Menu(this.menu_users, params);
};

UI.prototype.handleCreateProjectClick = function() {
  this.waiting_for_project = true;
  this.controller.createProject();
};