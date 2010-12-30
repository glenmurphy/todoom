var fs = require('fs'),
    io = require('./socket.io'),
    functions = require('../shared/functions.js'),
    GMBase = require('../shared/gmbase.js').GMBase,
    User = require('../shared/user_model.js').User,
    Project = require('../shared/project_model.js').Project,
    Task = require('../shared/task_model.js').Task,
    sys = require(process.binding('natives').util ? 'util' : 'sys');

function ToDB() {
  this.users = {};
  this.tasks = {};
  this.projects = {};
 
  this.load();
  setInterval(this.backup.bind(this), ToDB.SAVE_CYCLE);
}

ToDB.SAVE_CYCLE = 1000 * 60 * 20;
ToDB.BACKUP_FILE = './data/todoom.json';
ToDB.OLDFILE = './data/todoom.old';

GMBase.Listener.Extend(ToDB);

// STATE SAVING AND LOADING ---------------------------------------------------
ToDB.prototype.load = function() {
  try {
    var text = fs.readFileSync(ToDB.BACKUP_FILE);
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
      fs.renameSync(ToDB.BACKUP_FILE, ToDB.OLDFILE);
    } catch(e) {}
    fs.writeFileSync(ToDB.BACKUP_FILE, JSON.stringify(data));
  } else {
    fs.rename(ToDB.BACKUP_FILE, ToDB.OLDFILE, function(err) {
      if (err) console.log(err);
      fs.writeFile(ToDB.BACKUP_FILE, JSON.stringify(data));
    });
  }
};

// DELETERS
ToDB.prototype.deleteTask = function(task_key) {
  delete this.tasks[task_key];
};

// PUTTERS
ToDB.prototype.putTask = function(task) {
  this.tasks[task.key] = task;
  // TODO: Update indices.
};

ToDB.prototype.putProject = function(project) {
  this.projects[project.key] = project;
};

// GETTERS --------------------------------------------------------------------
ToDB.prototype.getUser = function(user_key) {
  return this.users[user_key];
};

ToDB.prototype.getUserByEmail = function(email) {
  // TODO: Optimize
  for (var key in this.users) {
    if (this.users[key].email == email)
      return this.users[key];
  }
};

ToDB.prototype.getProjectsForUser = function(user) {
  // TODO: Optimize
  var projects = [];
  for (var i in this.projects) {
    if (this.projects[i].users.contains(user.key)) {
      projects.push(this.projects[i]);
    }
  }
  return projects;
};

ToDB.prototype.getProject = function(project_key) {
  return this.projects[project_key];
};

ToDB.prototype.getUserKeysForTask = function(task) {
  var user_keys = {};
  if (task.owner) user_keys[task.owner] = true;
  if (task.creator) user_keys[task.creator] = true;
  if (task.project) {
    var project = this.projects[task.project];
    // TODO: Optimize.
    for (var i = 0, user; user = project.users[i]; i++) {
      user_keys[user] = true;
    }
  }

  return functions.collapseMap(user_keys);
};

ToDB.prototype.getTask = function(task_key) {
  return this.tasks[task_key];
};

ToDB.prototype.getTasksForUser = function(user) {
  // TODO: Optimize
  var tasks = [];
  var projects = {};
  for (var project_key in this.projects) {
    var project = this.projects[project_key];

    if (project.users.contains(user.key)) {
      projects[project.key] = true;
    }
  }

  for (var task_key in this.tasks) {
    var task = this.tasks[task_key];
    if (task.owner == user.key || task.creator == user.key || task.project in projects) {
      tasks.push(task);
    }
  }

  return tasks;
};

ToDB.prototype.getUsersForUser = function(user) {
  // TODO: Optimize.
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
  return users;
};

exports.ToDB = ToDB;