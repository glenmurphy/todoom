var http = require('http'),
    url = require('url'),
    fs = require('fs'),
    io = require('./socket.io'),
    functions = require('../shared/functions.js'),
    GMBase = require('../shared/gmbase.js').GMBase,
    User = require('../shared/user_model.js').User,
    Project = require('../shared/project_model.js').Project,
    Task = require('../shared/task_model.js').Task,
    sys = require(process.binding('natives').util ? 'util' : 'sys');

function Server(client) {
  this.clients = {};
  this.projects = {};
  this.users = {};
  this.tasks = {};

  this.users['user1'] = new User({
    key : 'user1',
    name : 'Glen',
    email : 'glen@glenmurphy.com'
  });
  
  this.load();
  setInterval(this.backup.bind(this), Server.SAVE_CYCLE);
}

GMBase.Listener.Extend(Server);

Server.SAVE_CYCLE = 1000 * 60 * 20;
Server.BACKUP_FILE = './data/todoom.json';
Server.OLDFILE = './data/todoom.old';

// STATE SAVING AND LOADING ---------------------------------------------------
Server.prototype.load = function() {
  try {
    var text = fs.readFileSync(Server.BACKUP_FILE);
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

Server.prototype.backup = function(sync) {
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
      fs.renameSync(Server.BACKUP_FILE, Server.OLDFILE);
    } catch(e) {}
    fs.writeFileSync(Server.BACKUP_FILE, JSON.stringify(data));
  } else {
    fs.rename(Server.BACKUP_FILE, Server.OLDFILE, function(err) {
      if (err) console.log(err);
      fs.writeFile(Server.BACKUP_FILE, JSON.stringify(data));
    });
  }
};

// CONNECTION AND USER --------------------------------------------------------
Server.prototype.createUser = function(email, password) {
  // TODO: Optimize.
  for (var key in this.users) {
    if (this.users[key].email == email) {
      if ('hash' in this.users[key]) {
        return {
          'type' : 'error',
          'message' : 'A user with that email address already exists'
        }
      }
      this.users[key].hash = this.hashFunction(email, password);
      return this.users[key];
    }
  }

  var user = new User({
    email : email,
    hash : this.hashFunction(email, password)
  })
};

Server.prototype.getUser = function(email, password) {
  // TODO: Optimize.
  for (var key in this.users) {
    if (this.users[key].email == email) {
      if (this.users[key].hash == this.hashFunction(email, password))
        return this.users[key];
    }
  }
  return false;
};

Server.prototype.hashFunction = function(email, password) {
  // TODO: Obviously, don't be this stupid.
  return email + ':' + password;
};

Server.prototype.validationError = function(message) {
  console.log(message);
  return false;
};


// GETTERS --------------------------------------------------------------------
Server.prototype.getProjectsForUser = function(user) {
  // TODO: Optimize
  var projects = [];
  for (var i in this.projects) {
    if (this.projects[i].users.contains(user.key)) {
      projects.push(this.projects[i]);
    }
  }
  return projects;
};

Server.prototype.getUserKeysForTask = function(task) {
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

Server.prototype.getTasksForUser = function(user) {
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

Server.prototype.getUsersForUser = function(user) {
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

// DATA HANDLING --------------------------------------------------------------
Server.prototype.handleUpdateTask = function(sender, data) {
  var task;
  var owner;
  var project;

  // Get the existing task.
  if (data.key in this.tasks) {
    task = this.tasks[data.key];
  } else {
    task = new Task();
    task.creator = sender;
  }
  
  // Purge any unused data fields.
  delete data.creator;

  // Validate.
  if (data.project) {
    if (!(data.project in this.projects)) {
      return this.validationError("Specified project does not exist");
    }
    project = this.projects[data.project];
  } else if (task.project && task.project in this.projects) {
    project = this.projects[task.project];
  }
  
  if (project && !project.users.contains(sender)) {
    return this.validationError("You are not a member of that project");
  }

  if (data.owner) {
    if (!(data.owner in this.users)) {
      return this.validationError("Specified owner does not exist");
    }
    owner = this.users[data.owner];
  } else if (task.owner && task.owner in this.users) {
    owner = this.users[task.owner];
  }
  // TODO: Verify that creator has permissions to add tasks to owner.
  
  if (!owner && !project) {
    return this.validationError("A task needs an owner or project");
  }
  
  if (data.status) {
    task.setStatus(data.status);
  }
  task.setData(data);
  this.tasks[task.key] = task;
  this.notifyTask(task);
};

Server.prototype.handleUpdateProject = function(sender, data) {
  var project;

  // Get the existing project.
  if (this.projects && data.key in this.projects) {
    project = this.projects[data.key];
    if (!project.users.contains(sender)) {
      return validationError("You are a not a member of that project");
    }
  } else {
    project = new Project();
    project.users = [sender];
  }

  project.setData(data);
  this.projects[project.key] = project;
  this.notifyProject(project);
};

Server.prototype.userCanAccessTask = function(user_key, task_key) {
  var user = this.users[user_key];
  var task = this.tasks[task_key];

  if (task.owner == user_key || task.creator == user_key) {
    return true;
  }
  if (!task.project || !(task.project in this.projects)) {
    return false;
  }
  var project = this.projects[task.project];
  if (project.users.contains(user_key)) {
    return true;
  }
}

Server.prototype.handleDeleteTask = function(sender, data) {
  if (!this.userCanAccessTask(sender, data.key)) {
    return this.validationError("You do not have access to that task");
  }
  
  this.notifyDeleteTask(this.tasks[data.key]);
  delete this.tasks[data.key];
};

Server.prototype.handleArchiveUserTasks = function(sender, data) {
  if (sender != data.key) {
    return this.validationError("You do not have access to that user");
  }

  this.users[data.key].archive_tasks_before = new Date().getTime();
  this.notifyUser(this.users[data.key]);
};

Server.prototype.handleArchiveProjectTasks = function(sender, data) {
  var project = this.projects[data.key];
  if (!project.users.contains(sender)) {
    return this.validationError("You do not have access to that project");
  }

  project.archive_tasks_before = new Date().getTime();
  this.notifyProject(project);
};

Server.prototype.handleUpdateUser = function(sender, data) {
  if (sender != data.key) {
    return this.validationError("You do not have access to that user");
  }
  this.users[data.key].setData(data);
  this.notifyUser(this.users[data.key]);
};

Server.prototype.addConnectedClient = function(client) {
  if (client.user.key in this.clients) {
    this.clients[client.user.key].push(client);
  } else {
    this.clients[client.user.key] = [client];
  }
};

/**
 * @param client
 */
Server.prototype.handleLogin = function(client, email, password) {
  var user = this.getUser(email, password);
  if (!user) {
    client.send({
      message_type : 'error',
      'error_type' : 'password'
    });
    return;
  }

  client.user = user;
  this.addConnectedClient(client);

  var data = {
    tasks : [],
    users : [],
    projects : []
  };
  var friends = this.getUsersForUser(client.user);
  for (var i = 0, friend; friend = friends[i]; i++) {
    data.users.push(friend.getData());
  }

  var tasks = this.getTasksForUser(client.user);
  for (var i = 0, task; task = tasks[i]; i++) {
    data.tasks.push(task.getData());
  }

  var projects = this.getProjectsForUser(client.user);
  for (var i = 0, project; project = projects[i]; i++) {
    data.projects.push(project.getData());
  }

  return client.send({
    message_type : 'initial',
    'time' : new Date().getTime(),
    'user' : client.user.getData(),
    'data' : data
  });
};

Server.prototype.isUser = function(client) {
  return ('user' in client && 'key' in client.user);
};

Server.prototype.recv = function(client, message) {
  if (message.message_type != 'login' && !this.isUser(client)) {
    return;
  }

  if (message.message_type == 'login') {
    this.handleLogin(client, message.email, message.password);
    return;
  }

  var user_key = client.user.key;
  if (message.message_type == 'update' || message.message_type == 'create') {
    switch(message.update_type) {
      case Task.TYPE:
        this.handleUpdateTask(user_key, message.data);
        break;
      case Project.TYPE:
        this.handleUpdateProject(user_key, message.data);
        break;
      case User.TYPE:
        this.handleUpdateUser(user_key, message.data);
        break;
    }
  } else if (message.message_type == 'delete') {
    if (message.update_type == Task.TYPE) {
      this.handleDeleteTask(user_key, message.data);
    }
  } else if (message.message_type == 'archive') {
    if (message.update_type == User.TYPE) {
      this.handleArchiveUserTasks(user_key, message.data);
    } else if (message.update_type == Project.TYPE) {
      this.handleArchiveProjectTasks(user_key, message.data);
    }
  }
};

Server.prototype.disconnect = function(client) {
  if (!this.isUser(client))
    return;

  var index = this.clients[client.user.key].indexOf(client);
  if (index >= 0)
    this.clients[client.user.key].remove(index);
};

// SENDERS --------------------------------------------------------------------
Server.prototype.notifyTask = function(task) {
  var user_keys_list = this.getUserKeysForTask(task);

  this.message(user_keys_list, {
    message_type : 'update',
    update_type : 'task',
    data : task.getData()
  });
};

Server.prototype.notifyDeleteTask = function(task) {
  var user_keys_list = this.getUserKeysForTask(task);

  this.message(user_keys_list, {
    message_type : 'delete',
    update_type : 'task',
    data : task.getData()
  });
};

Server.prototype.notifyProject = function(project) {
  this.message(project.users, {
    message_type : 'update',
    update_type : 'project',
    data : project.getData()
  })
};

Server.prototype.notifyUser = function(user) {
  var user_keys = [user.key];

  var projects = this.getProjectsForUser(user);
  for (var i = 0, project; project = projects[i]; i++) {
    for (var u = 0, project_user; project_user = projects[i].users[u]; u++) {
      if (project_user != user.key) {
        user_keys.push(project_user);
      }
    }
  }

  this.message(user_keys, {
    message_type : 'update',
    update_type : 'user',
    data : user.getData()
  });
};

Server.prototype.message = function(users, message) {
  message.time = new Date().getTime();

  for (var i = 0, user_key; user_key = users[i]; i++) {
    if (user_key in this.clients) {
      for (var u = 0, client; client = this.clients[user_key][u]; u++) {
        console.log("Sending to client " + u);
        client.send(message);
      }
    }
  }
};

// MAIN

var www = http.createServer(function(req, res) {
  var path = url.parse(req.url).pathname;
  if (path == '/') path = 'index.html';

  if (path.substr(0, 8) == '/shared/') {
    path = '/../shared/' + path.substr(8);
  } else {
    path = '/../client/' + path;
  }

  fs.readFile(__dirname + path, function(err, data) {
    if (err) return;
    res.writeHead(200, {});
    res.write(data, 'utf8');
    res.end();
  });
});
www.listen(80);

var server = new Server();

// socket.io
var socket = io.listen(www);
socket.on('connection', function(client){
  client.on('message', function(data) {
    server.recv(client, data);
  });
  client.on('disconnect', function(){
    server.disconnect(client);
  });
});


process.on('uncaughtException', function (err) {
  console.log("---------------------------------");
  console.log('Caught exception: ' + err);
  console.log(err.stack);
  console.log("---------------------------------");
});

process.on('SIGHUP', function () {
  console.log('Got SIGHUP signal.');
  server.backup(true);
  process.exit();
});

process.on('SIGINT', function() {
  console.log('Got SIGINT signal.');
  server.backup(true);
  process.exit();
});