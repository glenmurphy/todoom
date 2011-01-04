var http = require('http'),
    url = require('url'),
    fs = require('fs'),
    io = require('socket.io'),
    crypto = require('crypto'),
    functions = require('../shared/functions.js'),
    GMBase = require('../shared/gmbase.js').GMBase,
    User = require('../shared/user_model.js').User,
    Project = require('../shared/project_model.js').Project,
    Task = require('../shared/task_model.js').Task,
    ToDB = require('./todb.js').ToDB,
    sys = require(process.binding('natives').util ? 'util' : 'sys');

function Server(client) {
  this.clients = {};
  this.db = new ToDB();

  process.on('SIGHUP', this.preExit.bind(this));
  process.on('SIGINT', this.preExit.bind(this));
}

GMBase.Listener.Extend(Server);

Server.prototype.preExit = function() {
  console.log('Exiting...');
  this.db.backup(true);
  process.exit();
}

// CONNECTION AND USER --------------------------------------------------------
Server.prototype.createUser = function(email, password) {
  // TODO: Optimize.
  var user = this.db.getUserByEmail(email);

  if (user) {
    if ('hash' in user) {
     return {
        'type' : 'error',
        'message' : 'A user with that email address already exists'
      }
    }
    // The stub already existed, so we assume that this is
    // a user logging into that profile for the first time.
    user.hash = this.hashFunction(email, password);
    return user;
  }

  // If we haven't returned, they must really be a new user.
  user = new User({
    email : email
  });
  user.hash = this.hashFunction(email, password);
  return user;
};

Server.prototype.loginUser = function(email, password, callback) {
  this.db.getUserByEmail(email, (function(user) {
    if (user && this.hashCheck(email, password, user))
      callback(user);
    else
      callback(false);
  }).bind(this));
};

Server.prototype.hashFunction = function(email, password) {
  return crypto.createHash("sha256").update(email + ':' + password).digest("base64");
};

Server.prototype.hashCheck = function(email, password, user) {
  if (!('hash' in user) || !user.hash) {
    return false;
  }

  var login_hash = this.hashFunction(email, password);
  var stored_version = user.hash.split(":")[0]; // For versioning.
  var stored_hash = user.hash.substr(user.hash.indexOf(":") + 1);
  return (stored_hash == login_hash);
};

Server.prototype.validationError = function(message) {
  console.log(message);
  return false;
};

// DATA HANDLING --------------------------------------------------------------
Server.prototype.handleUpdateTask = function(sender, data) {
  var task;
  var owner;
  var project;

  // Purge any unused data fields.
  delete data.creator;

  // Get the existing task.
  this.db.getTask(data.key, (function(task) {
    if (!task) {
      task = new Task();
      task.creator = sender;
    }

    var project_key = data.project ? data.project : task.project;
    var owner_key = data.owner ? data.owner : task.owner;

    if (!owner_key && !project_key) {
      return this.validationError("A task needs an owner or project");
    }

    var finished = (function() {
      if (data.status) {
        task.setStatus(data.status);
      }

      task.setData(data);
      this.db.putTask(task); // Async, naughty!
      this.notifyTask(task);
    }).bind(this);

    var validateOwner = (function() {
      if (owner_key) {
        this.db.getUser(owner_key, (function(owner) {
          if (!owner) {
            return this.validationError("That owner does not exist");
          }
          // TODO: Verify that creator has permissions to add tasks to owner.
          finished();
        }).bind(this))
      } else {
        finished();
      }
    }).bind(this);

    if (project_key) {
      this.db.getProject(project_key, (function(project) {
        if (!project) {
          return this.validationError("That project does not exist");
        }
        if (!project.users.contains(sender)) {
          return this.validationError("You are not a member of that project");
        }
        validateOwner();
      }).bind(this));
    } else {
      validateOwner();
    }

  }).bind(this));
};

Server.prototype.handleUpdateProject = function(sender, data) {
  this.db.getProject(data.key, (function(project) {
    // Get the existing project.
    if (project) {
      if (!project.users.contains(sender)) {
        return validationError("You are a not a member of that project");
      }
    } else {
      project = new Project();
      project.users = [sender];
    }

    project.setData(data);
    this.db.putProject(project);
    this.notifyProject(project);
  }).bind(this));
};

// TODO: BLERRGH!
Server.prototype.userCanAccessTask = function(user_key, task_key, callback) {
  this.db.getTask(task_key, (function(task) {
    if (task.owner == user_key || task.creator == user_key) {
      callback(false);
    }

    // Must be a project task.
    this.db.getProject(task.project, function(project) {
      callback(project && project.users.contains(user_key));
    }.bind(this));
  }).bind(this));
};

Server.prototype.handleDeleteTask = function(sender, data) {
  this.userCanAccessTask(sender, data.key, (function(result) {
    if (!result) {
      return this.validationError("You do not have access to that task");
    }

    this.db.getTask(data.key, (function(task) {
      this.notifyDeleteTask(task);
      this.db.deleteTask(data.key);
    }).bind(this));
  }).bind(this));
};

Server.prototype.handleArchiveUserTasks = function(sender, data) {
  if (sender != data.key) {
    return this.validationError("You do not have access to that user");
  }

  this.db.getUser(data.key, (function (user) {
    if (user) {
      user.archive_tasks_before = new Date().getTime();
      this.notifyUser(user);
    }
  }).bind(this));
};

Server.prototype.handleArchiveProjectTasks = function(sender, data) {
  var project = this.db.getProject(data.key, (function(project) {
    if (!project || !project.users.contains(sender)) {
      return this.validationError("You do not have access to that project");
    }

    project.archive_tasks_before = new Date().getTime();
    this.db.putProject(project); // Async, naughty!
    this.notifyProject(project);
  }).bind(this));
};

Server.prototype.handleUpdateUser = function(sender, data) {
  if (sender != data.key) {
    return this.validationError("You do not have access to that user");
  }

  this.db.getUser(data.key, (function(user) {
    if (user) {
      user.setData(data);
      this.db.putUser(user); // Async, naughty!
      this.notifyUser(user);
    }
  }).bind(this));
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
 * @param email
 * @param password
 */
Server.prototype.handleLogin = function(client, email, password) {
  console.log("handleLogin");
  this.loginUser(email, password, (function(user) {
    this.sendInitialData(user, client, password);
  }).bind(this));
};

Server.prototype.sendInitialData = function(user, client, password) {
  console.log("sendInitialData");
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

  var completed = 0;
  function checkComplete() {
    completed++;
    if (completed < 3) return;

    client.send({
      message_type : 'initial',
      'time' : new Date().getTime(),
      'user' : client.user.getData(),
      'data' : data
    });
  }

  this.db.getUsersForUser(client.user, function(friends) {
    for (var i = 0, friend; friend = friends[i]; i++) {
      data.users.push(friend.getData());
    }
    checkComplete();
  });

  this.db.getTasksForUser(client.user, function(tasks) {
    for (var i = 0, task; task = tasks[i]; i++) {
      data.tasks.push(task.getData());
    }
    checkComplete();
  });

  this.db.getProjectsForUser(client.user, function(projects) {
    for (var i = 0, project; project = projects[i]; i++) {
      data.projects.push(project.getData());
    }
    checkComplete();
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
  this.db.getUserKeysForTask(task, (function(user_keys_list) {
    this.message(user_keys_list, {
      message_type : 'update',
      update_type : 'task',
      data : task.getData()
    });
  }).bind(this));
};

Server.prototype.notifyDeleteTask = function(task) {
  this.db.getUserKeysForTask(task, (function(user_keys_list) {
    this.message(user_keys_list, {
      message_type : 'delete',
      update_type : 'task',
      data : task.getData()
    });
  }).bind(this));
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

  this.db.getProjectsForUser(user, (function(projects) {
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
  }).bind(this));
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
