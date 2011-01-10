var http = require('http'),
    url = require('url'),
    fs = require('fs'),
    io = require('socket.io'),
    crypto = require('crypto'),
    mime = require('mime'),
    UserManager = require("./user_manager.js").UserManager,
    functions = require('../shared/functions.js'),
    GMBase = require('../shared/gmbase.js').GMBase,
    User = require('../shared/user_model.js').User,
    qs = require('querystring');
    Project = require('../shared/project_model.js').Project,
    Task = require('../shared/task_model.js').Task,
    ToDB = require('./todb_sql.js').ToDBSQL,
    sys = require(process.binding('natives').util ? 'util' : 'sys');

function Server(client) {
  this.db = new ToDB();
  this.users = new UserManager(this.db);

  process.on('SIGHUP', this.preExit.bind(this));
  process.on('SIGINT', this.preExit.bind(this));
}

GMBase.Listener.Extend(Server);

Server.prototype.preExit = function() {
  console.log('Exiting...');
  process.exit();
}

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

Server.prototype.userCanAccessTask = function(user_key, task_key, callback) {
  this.db.getTask(task_key, (function(task) {
    if (task.owner == user_key || task.creator == user_key) {
      return callback(true);
    }

    // Must be a project task.
    this.db.getProject(task.project, function(project) {
      return callback(project && project.users.contains(user_key));
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

Server.prototype.handleAddProjectUser = function(sender_key, data) {
  var project_key = data.project_key;
  var email = data.user_email;

  var project = this.db.getProject(project_key, (function(project) {
    if (!project || !project.users.contains(sender_key)) {
      return this.validationError("You do not have access to that project");
    }

    var user = this.db.getOrCreateUserByEmail(email, (function(user) {
      if (project.users.contains(user.key))
        return;
      project.users.push(user.key);
      this.db.putProject(project);
      
      // Have to send user out first.
      this.notifyUser(user);
      this.notifyProject(project);
    }).bind(this));
  }).bind(this));
};

Server.prototype.handleRemoveProjectUser = function(sender_key, data) {
  var project_key = data.project_key;
  var user_key = data.user_key;

  var project = this.db.getProject(project_key, (function(project) {
    if (!project || !project.users.contains(sender_key)) {
      return this.validationError("You do not have access to that project");
    }

    // Cannot remove first user.
    var position = project.users.indexOf(user_key);
    if (position > 0)
      project.users.remove(position);
    this.db.putProject(project);
    this.notifyProject(project);
  }).bind(this));
};

Server.prototype.recv = function(client, message) {
  if (message.message_type != 'session_login' && !this.users.isUser(client)) {
    return;
  }

  if (message.message_type == 'session_login') {
    this.users.handleSessionLogin(client, message.session_key);
    return;
  }

  var sender_key = client.user.key;
  
  if (message.message_type == 'update' || message.message_type == 'create') {
    switch(message.update_type) {
      case Task.TYPE:
        this.handleUpdateTask(sender_key, message.data);
        break;
      case Project.TYPE:
        this.handleUpdateProject(sender_key, message.data);
        break;
      case User.TYPE:
        this.handleUpdateUser(sender_key, message.data);
        break;
    }
  } else if (message.message_type == 'delete') {
    if (message.update_type == Task.TYPE) {
      this.handleDeleteTask(sender_key, message.data);
    }
  } else if (message.message_type == 'archive') {
    if (message.update_type == User.TYPE) {
      this.handleArchiveUserTasks(sender_key, message.data);
    } else if (message.update_type == Project.TYPE) {
      this.handleArchiveProjectTasks(sender_key, message.data);
    }
  } else if (message.message_type == 'add_project_user') {
    this.handleAddProjectUser(sender_key, message.data);
  } else if (message.message_type == 'remove_project_user') {
    this.handleRemoveProjectUser(sender_key, message.data);
  }
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
    if (user_key in this.users.clients) {
      for (var u = 0, client; client = this.users.clients[user_key][u]; u++) {
        client.send(message);
      }
    }
  }
};

// MAIN

var www = http.createServer(function(req, res) {
  var path = url.parse(req.url).pathname;
  if (path == '/') path = 'index.html';

  if (path.substr(0, 5) == '/api/') {
    switch (path.substr(5)) {
      case 'createuser':
        break;
      case 'login':
        var data = '';
        req.addListener('data', function(chunk) {
          data += chunk;
        });
        req.addListener('end', function() {
          var parsed = qs.parse(data);
          server.users.loginUser(parsed.email, parsed.password, res);
        });
        break;
      default:
        break;
    }
  }

  if (path.substr(0, 8) == '/shared/') {
    path = '/../shared/' + path.substr(8);
  } else {
    path = '/../client/' + path;
  }

  var file_path = __dirname + path;
  fs.readFile(file_path, function(err, data) {
    if (err) return;
    
    res.writeHead(200, {'Content-Type':mime.lookup(file_path)});
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
    server.users.disconnect(client);
  });
});


process.on('uncaughtException', function (err) {
  console.log("---------------------------------");
  console.log('Caught exception: ' + err);
  console.log(err.stack);
  console.log("---------------------------------");
});
