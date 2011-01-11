function UI(controller) {
  if (UI.instance) {
    return UI.instance;
  }
  
  this.controller = controller;
  this.controller.addListener('new_project', this.handleNewProject.bind(this));

  this.body = createElement('div', 'main', document.body);

  this.topbar = createElement('div', 'ui-nav hidden', this.body);

  this.title = createElement('div', 'ui-title', this.topbar);
  this.title.innerText = 'ToDoom';

  this.waiting_for_project = false;
  
  this.project_views = {};
  this.user_views = {};

  this.users_column = createElement('div', 'col-users solo', this.body);
  this.projects_column = createElement('div', 'col-projects solo', this.body);

  this.menu_users = createElement('div', 'control', this.topbar);
  this.menu_users.innerHTML = 'People';
  this.menu_users.addEventListener('click', this.handleUsersClick.bind(this));

  this.menu_projects = createElement('div', 'control', this.topbar);
  this.menu_projects.innerHTML = 'Projects';
  this.menu_projects.addEventListener('click', this.handleProjectsClick.bind(this));

  this.controller.addListener('new_project', this.handleNewProject.bind(this));
  this.controller.addListener('signin_success', this.handleSignInSuccess.bind(this));

  this.signin = new SignInView(this.controller);

  UI.instance = this;
  this.arrangeColumns();
}

UI.instance = null;

function getUI() {
  if (UI.instance) {
    return UI.instance;
  }
  return new UI(controller);
}

UI.prototype.arrangeColumns = function() {
  function hideCol(col) {
    col.classList.add('center');
    col.classList.add('hidden');
  }
  var width;
  if (isEmpty(this.user_views)) {

    hideCol(this.users_column);
    this.projects_column.classList.add('center');
    this.projects_column.classList.remove('hidden');
    width = this.projects_column.offsetWidth;
  } else if (isEmpty(this.project_views)) {
    hideCol(this.projects_column);
    this.users_column.classList.add('center');
    this.users_column.classList.remove('hidden');
    width = this.users_column.offsetWidth;
  } else {
    this.users_column.classList.remove('center');
    this.projects_column.classList.remove('center');
    this.users_column.classList.remove('hidden');
    this.projects_column.classList.remove('hidden');
    width = this.users_column.offsetWidth + this.projects_column.offsetWidth - 12;
  }

  if (isEmpty(this.user_views) && !isEmpty(this.project_views)) {
    this.topbar.classList.add('projects');
    this.topbar.classList.remove('full');
  }
  else if (!isEmpty(this.user_views) && !isEmpty(this.project_views)) {
    this.topbar.classList.add('full');
    this.topbar.classList.remove('projects');
  }
  else {
    this.topbar.classList.remove('projects');
    this.topbar.classList.remove('full');
  }
  
  // So that centering works while still scrolling properly at small sizes.
  this.body.style.minWidth = width + 'px';
};

UI.prototype.shake = function(view) {
  
};

UI.prototype.showProject = function(project) {
  var project_view;
  if (project.key in this.project_views)
    project_view = this.project_views[project.key];
  else {
    var project_view = new ProjectView(this.controller, project);
    if (!isEmpty(this.project_views)) {
      project_view.classList.add('showing');
      setTimeout(function() {
        project_view.classList.remove('showing');
      }, 1);
    }

    this.project_views[project.key] = project_view;
  }
  this.projects_column.insertBefore(project_view, this.projects_column.childNodes[0]);
  this.arrangeColumns();
};

UI.prototype.showProjectUserManager = function(project) {
  if (!(project.key in this.project_views)) {
    window.console.error("Attempting to show user manager for non-visible project");
    return;
  }
  
  var project_view = this.project_views[project.key];
  new ProjectUsersView(this.controller, project, project_view);
};

UI.prototype.hideProject = function(project) {
  if (!(project.key in this.project_views)) {
    return;
  }

  var removeView = (function() {
    this.projects_column.removeChild(this.project_views[project.key]);
    delete this.project_views[project.key];
    this.arrangeColumns();
  }).bind(this);

  if (collapseMap(this.project_views).length < 2) {
    removeView();
  } else {
    this.project_views[project.key].classList.add('closing');
    this.project_views[project.key].addEventListener('webkitTransitionEnd', removeView);
  }
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