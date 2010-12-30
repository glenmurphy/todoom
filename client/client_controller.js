function ClientController() {
  this.user = null;

  this.users = {};
  this.tasks = {};
  this.projects = {};

  this.socket = new io.Socket();
  this.socket.on('connect', this.handleConnect.bind(this));
  this.socket.on('message', this.handleMessage.bind(this));
  this.socket.on('disconnect', this.handleDisconnect.bind(this));
  this.socket.connect();
}

GMBase.Listener.Extend(ClientController);

ClientController.prototype.login = function(email, password) {
  this.cached_email = email;
  this.cached_password = password;
  
  this.socket.send({
    message_type : 'login',
    email : email,
    password : password
  });
};

ClientController.prototype.handleConnect = function() {
  if (this.user) {
    this.notifyListeners('reconnected', {});
    this.login(this.cached_email, this.cached_password);
  }
};

ClientController.prototype.handleDisconnect = function() {
  this.socket.connect();
  
  if (this.user) {
    this.notifyListeners('reconnecting', {});
  } else {
    this.notifyListeners('connecting', {});
  }
};

ClientController.prototype.reconnect = function() {
  this.login(this.cached_email, this.cached_password);
};

// UI Methods -----------------------------------------------------------------
ClientController.prototype.createProject = function() {
  this.socket.send({
    message_type : 'create',
    update_type : 'project',
    data : {
      name : 'Untitled',
      users : [this.user.key]
    }
  });
};

ClientController.prototype.createTask = function(data) {
  var message = {
    message_type : 'create',
    update_type : 'task',
    data : {
      name : data.name,
      creator : this.user.key
    }
  };

  if (data.project)
    message.data.project = data.project;
  if (data.owner)
    message.data.owner = data.owner;

  this.socket.send(message);
};

ClientController.prototype.claimTask = function(task) {
  this.changeValue(task, 'owner', this.user.key);
};

ClientController.prototype.changeValue = function(model, key_name, value) {
  if (model[key_name] == value) return;
  
  var message = {
    message_type : 'update',
    update_type : model.type,
    data : {
      key : model.key
    }
  };
  
  message.data[key_name] = value;
  this.socket.send(message);
};

ClientController.prototype.deleteTask = function(task) {
  this.socket.send({
    message_type : 'delete',
    update_type : Task.TYPE,
    data : {
      key : task.key
    }
  });
};

ClientController.prototype.archiveUserTasks = function(user) {
  this.socket.send({
    message_type : 'archive',
    update_type : User.TYPE,
    data : {
      key : user.key
    }
  });
};

ClientController.prototype.archiveProjectTasks = function(project) {
  this.socket.send({
    message_type : 'archive',
    update_type : Project.TYPE,
    data : {
      key : project.key
    }
  });
};

// Creators (called by server) ------------------------------------------------
ClientController.prototype.newProject = function(data) {
  var project = new Project(data);
  this.projects[project.key] = project;
  window.console.log("add project");
  this.notifyListeners('new_project', { project : project});
};

ClientController.prototype.newTask = function(data) {
  var task = new Task(data);
  this.tasks[task.key] = task;
  
  this.notifyListeners('new_task', { task : task});
};

ClientController.prototype.newUser = function(data) {
  var user = new User(data);
  this.users[user.key] = user;

  this.notifyListeners('new_user', { user : user});
};

// GETTERS --------------------------------------------------------------------
ClientController.prototype.getTask = function(task_id) {
  if (!(task_id in this.tasks)) return;
  
  if (this.tasks[task_id].type == Task.TYPE) {
    return this.tasks[task_id];
  } else {
    window.console.error("Not a task");
  }
};

ClientController.prototype.getProject = function(project_id) {
  if (!(project_id in this.projects)) return;

  if (this.projects[project_id].type == Project.TYPE) {
    return this.projects[project_id];
  } else {
    window.console.error("Not a project");
  }
}

ClientController.prototype.getTasksForProject = function(project_id) {
  var tasks = [];
  for (var task_id in this.tasks) {
    if (this.tasks[task_id].project == project_id) {
      tasks.push(this.tasks[task_id])
    }
  }
  return tasks;
};

ClientController.prototype.getProjectsForUser = function(user_id) {
  if (!user_id) user_id = this.user.key;

  var projects = [];
  for (var i in this.projects) {
    if (this.projects[i].users.contains(user_id)) {
      projects.push(this.projects[i]);
    }
  }
  return projects;
};

ClientController.prototype.getTasksForUser = function(user_id) {
  var tasks = [];
  for (var task_id in this.tasks) {
    if (this.tasks[task_id].owner == user_id) {
      tasks.push(this.tasks[task_id])
    }
  }
  return tasks;
};

ClientController.prototype.getTasksForModel = function(model) {
  if (model.type == Project.TYPE)
    return this.getTasksForProject(model.key);
  else if (model.type == User.TYPE)
    return this.getTasksForUser(model.key);
  else
    window.console.error("invalid model");
};

ClientController.prototype.getUsers = function() {
  return this.users;
};

ClientController.prototype.getUserName = function(user_id) {
  if (user_id in this.users) {
    return this.users[user_id].displayName();
  }
  return false;
};

ClientController.prototype.getUsersForTask = function(task_id) {
  var task = this.tasks[task_id];
  var users = {};
  if (task.owner) users[task.owner] = true;
  if (task.creator) users[task.creator] = true;
  if (task.project) {
    var project = this.projects[task.project];
    // TODO: Optimize.
    for (var i = 0, user; user = project.users[i]; i++) {
      users[user] = true;
    }
  }
  return collapseMap(users);
};

ClientController.prototype.getUsersForUser = function(user_id) {
  // TODO: Optimize
  if (!user_id) user_id = this.user.key;

  var user_keys = {};
  user_keys[user_id] = true;
  
  // Get all users attached to projects that user is also attached to.
  for (var project_key in this.projects) {
    var project = this.projects[project_key];
    if (project.users.contains(user_id)) {
      for (var u = 0, user_key; user_key = project.users[u]; u++) {
        user_keys[user_key] = true;
      }
    }
  }

  var users = [];
  for (var key in user_keys) {
    users.push(this.users[key]);
  }

  // TODO: Get all users attached to tasks that user is creator or owner of.
  return users;
};

// HANDLERS -------------------------------------------------------------------
ClientController.prototype.handleProject = function(data) {
  var key = data.key;
  if (key in this.projects) {
    this.projects[key].setData(data);
  } else {
    this.newProject(data);
  }
};

ClientController.prototype.handleUser = function(data) {
  var key = data.key;
  if (key in this.users) {
    this.users[key].setData(data);
  } else {
    this.newUser(data);
  }
};

ClientController.prototype.handleTask = function(data) {
  var key = data.key;
  if (key in this.tasks) {
    var original_data = this.tasks[key].getData();
    this.tasks[key].setData(data);
    this.notifyListeners("changed_task", {
      original_data : original_data,
      task : this.tasks[key]
    });
  } else {
    this.newTask(data);
  }
};

ClientController.prototype.handleDeleteTask = function(data) {
  this.notifyListeners('deleted_task', { task : data});
  delete this.tasks[data.key];
}

ClientController.prototype.handleInitial = function(message) {
  // Tasks must be processed first, as the users and projects depend upon them.
  this.user = new User(message.user);
  this.users[this.user.key] = this.user;
  
  for (var i = 0, task; task = message.data.tasks[i]; i++) {
    this.handleTask(task);
  }
  for (var i = 0, user; user = message.data.users[i]; i++) {
    this.handleUser(user);
  }
  for (var i = 0, project; project = message.data.projects[i]; i++) {
    this.handleProject(project);
  }
  
  this.notifyListeners('signin_success', {});
};

ClientController.prototype.handleMessage = function(message) {
  if (message.time)
    ServerTime.update(message.time);

  if (message.message_type == 'update') {
    switch (message.update_type) {
      case 'project':
        this.handleProject(message.data);
        break;
      case 'user':
        this.handleUser(message.data);
        break;
      case 'task':
        this.handleTask(message.data);
        break;
    }
  } else if (message.message_type == 'delete') {
    this.handleDeleteTask(message.data);
  } if (message.message_type == 'initial') {
    this.handleInitial(message);
  }
};