var fs = require('fs'),
    functions = require('../shared/functions.js'),
    GMBase = require('../shared/gmbase.js').GMBase,
    User = require('../shared/user_model.js').User,
    Project = require('../shared/project_model.js').Project,
    Task = require('../shared/task_model.js').Task,
    sys = require(process.binding('natives').util ? 'util' : 'sys');

function ToDB(filename, clear, cb) {
  this.users = {};
  this.tasks = {};
  this.projects = {};

  this.indices = {};

  this.filename = filename ? filename : ToDB.BACKUP_FILE;
  this.old_filename = this.filename + ".old";
 
  this.load();
  setInterval(this.backup.bind(this), ToDB.SAVE_CYCLE);

  if (cb)
    cb();
}

ToDB.SAVE_CYCLE = 1000 * 60 * 20;
ToDB.BACKUP_FILE = './data/todoom.json';

GMBase.Listener.Extend(ToDB);

// STATE SAVING AND LOADING ---------------------------------------------------
ToDB.prototype.load = function() {
  try {
    var text = fs.readFileSync(this.filename);
    var data = JSON.parse(text);

    for (var user_key in data.users) {
      this.users[user_key] = new User(data.users[user_key]);
      this.users[user_key].hash = data.users[user_key].hash;
    }
    for (var task_key in data.tasks) {
      this.tasks[task_key] = new Task(data.tasks[task_key]);
    }
    for (var project_key in data.projects) {
      this.projects[project_key] = new Project(data.projects[project_key]);
    }
  } catch(e) {
    console.log("Error loading file");
  }
};

ToDB.prototype.backup = function(sync) {
  console.log('Saving...');

  var data = {
    users : {},
    tasks : {},
    projects : {}
  };

  for (var user_key in this.users) {
    data.users[user_key] = this.users[user_key].getData();
    data.users[user_key].hash = this.users[user_key].hash;
  }
  for (var task_key in this.tasks) {
    data.tasks[task_key] = this.tasks[task_key].getData();
  }
  for (var project_key in this.projects) {
    data.projects[project_key] = this.projects[project_key].getData();
  }

  if (sync) {
    try {
      fs.renameSync(this.filename, this.old_filename);
    } catch(e) {}
    fs.writeFileSync(this.filename, JSON.stringify(data));
  } else {
    fs.rename(this.filename, this.old_filename, function(err) {
      if (err) console.log(err);
      fs.writeFile(this.filename, JSON.stringify(data));
    });
  }
};

// INDEX MODIFIERS AND BUILDERS -----------------------------------------------

// DELETERS
ToDB.prototype.deleteTask = function(task_key) {
  delete this.tasks[task_key];
  // TODO: Persist to disk
  // TODO: Update indices.
};

// PUTTERS
ToDB.prototype.putTask = function(task) {
  this.tasks[task.key] = task;
  // TODO: Persist to disk
  // TODO: Update indices.
};

ToDB.prototype.putProject = function(project) {
  this.projects[project.key] = project;
  // TODO: Persist to disk
  // TODO: Update indices.
};

ToDB.prototype.putUser = function(user) {
  this.users[user.key] = user;
  // TODO: Persist to disk
  // TODO: Update indices.
};

// GETTERS --------------------------------------------------------------------
ToDB.prototype.getUser = function(user_key, callback) {
  var user = this.users[user_key];
  setTimeout(function() {callback(user);}, 1);
};

ToDB.prototype.getUserByEmail = function(email, callback) {
  // TODO: Index users on email addresses.
  for (var key in this.users) {
    if (this.users[key].email == email) {
      var user = this.users[key];
      setTimeout(function() {callback(user);}, 1);
      return;
    }
  }
};

ToDB.prototype.getOrCreateUserByEmail = function(email, callback) {
  // TODO: Index users on email addresses.
  for (var key in this.users) {
    if (this.users[key].email == email) {
      var user = this.users[key];
      setTimeout(function() {callback(user);}, 1);
      return;
    }
  }
  
  // Not found, create this user.
  var user = new User();
  user.email = email;
  user.name = email.split("@")[0];
  this.users[user.key] = user;
  setTimeout(function() {callback(user);}, 1);
  return;
};

ToDB.prototype.getProjectsForUser = function(user, callback) {
  // TODO: Index projects on the users they contain.
  var projects = [];
  for (var i in this.projects) {
    if (this.projects[i].users.contains(user.key)) {
      projects.push(this.projects[i]);
    }
  }
  setTimeout(function() {callback(projects);}, 1);
};

ToDB.prototype.getProject = function(project_key, callback) {
  var project = this.projects[project_key];
  setTimeout(function() {callback(project);}, 1);
};

ToDB.prototype.getUserKeysForTask = function(task, callback) {
  var user_keys = {};

  var finished = (function() {
    user_keys = functions.collapseMap(user_keys);
    setTimeout(function() {callback(user_keys);}, 1);
  });

  if (task.owner) user_keys[task.owner] = true;
  if (task.creator) user_keys[task.creator] = true;
  if (task.project) {
    this.getProject(task.project, (function(project) {
      for (var i = 0, user; user = project.users[i]; i++) {
        user_keys[user] = true;
      }
      finished();
    }).bind(this));
  } else {
    finished();
  }
};

ToDB.prototype.getTask = function(task_key, callback) {
  var task = this.tasks[task_key];
  setTimeout(function() {callback(task);}, 1);
};

ToDB.prototype.getTasksForUser = function(user, callback) {
  // TODO: Index projects on the users they contain.
  
  var tasks = [];
  var projects = {};
  for (var project_key in this.projects) {
    var project = this.projects[project_key];

    if (project.users.contains(user.key)) {
      projects[project.key] = true;
    }
  }

  // TODO: Index tasks on owners, creators and projects.
  for (var task_key in this.tasks) {
    var task = this.tasks[task_key];
    if (task.owner == user.key || task.creator == user.key || task.project in projects) {
      tasks.push(task);
    }
  }

  setTimeout(function() {callback(tasks);}, 1);
};

ToDB.prototype.getUsersForUser = function(user, callback) {
  // TODO: Index projects on the users they contain.
  var user_keys = {};
  user_keys[user.key] = true;

  // Get all users attached to projects that user is also attached to.
  for (var project_key in this.projects) {
    var project = this.projects[project_key];

    if (!project.users.contains(user.key))
      continue;

    for (var u = 0, user_key; user_key = project.users[u]; u++) {
      user_keys[user_key] = true;
    }
  }

  // TODO: Get all users attached to tasks that user is creator or owner of.
  var users = [];
  for (var key in user_keys) {
    users.push(this.users[key]);
  }
  setTimeout(function() {callback(users);}, 1);
};

exports.ToDB = ToDB;