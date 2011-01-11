var functions = require('../shared/functions.js'),
    crypto = require('crypto'),
    GMBase = require('../shared/gmbase.js').GMBase,
    User = require('../shared/user_model.js').User;

function UserManager(db) {
  this.sessions = {}; // Session key to user key.
  this.clients = {}; // User key to array of socket clients.

  this.db = db;
}

UserManager.prototype.createUser = function(email, password, res) {
  console.log("createUser");
  this.db.getOrCreateUserByEmail(email, (function(err, user) {
    if (user && !!(user.hash)) {
      this.loginError(res);
      return;
    }
    if (!user.name)
      user.name = email.split("@")[0];

    user.hash = UserManager.hashLogin(email, password);
    this.db.putUser(user, (function(err) {
      this.createSession(user, res);
    }).bind(this));
  }.bind(this)));
};

UserManager.prototype.loginUser = function(email, password, res) {
  console.log("loginUser");
  this.db.getUserByEmail(email, (function(err, user) {
    if (user && this.hashCheck(email, password, user)) {
      this.createSession(user, res);
    } else {
      this.loginError(res);
    }
  }).bind(this));
};

UserManager.prototype.loginError = function(res) {
  console.log("loginError");
  res.writeHead(200, {'content-type': 'text/plain'});
  res.write(JSON.stringify({
    message_type : 'login_error'
  }));
  res.end();
};

UserManager.prototype.createSession = function(user, res) {
  console.log("createSession");
  var key = crypto.createHash("md5").update(GMBase.Unique.getUniqueId()).digest("base64");
  this.sessions[key] = {
    created : (new Date()).getTime(),
    user_key : user.key
  };

  res.writeHead(200, {'content-type': 'text/plain'});
  res.write(JSON.stringify({
    session_key : key
  }));
  res.end();
};

UserManager.hashLogin = function(email, password) {
  return UserManager.hashFunction(email + ':' + password)
};

UserManager.hashFunction = function(str) {
  return crypto.createHash("sha256").update(str).digest("base64");
};

UserManager.prototype.hashCheck = function(email, password, user) {
  if (!('hash' in user) || !user.hash) {
    return false;
  }

  var login_hash = UserManager.hashLogin(email, password);
  var stored_version = user.hash.split(":")[0]; // For versioning.
  var stored_hash = user.hash.substr(user.hash.indexOf(":") + 1);
  return (stored_hash == login_hash);
};

UserManager.prototype.addConnectedClient = function(client) {
  if (client.user.key in this.clients) {
    this.clients[client.user.key].push(client);
  } else {
    this.clients[client.user.key] = [client];
  }
};

UserManager.prototype.handleSessionLogin = function(client, session_key) {
  console.log("handleSessionLogin");
  if (session_key in this.sessions) {
    if (this.sessions[session_key].created < new Date().getTime() - 1000 * 60 * 60 * 48) {
      console.log("session expired");
      client.send({
        message_type : 'session_login_error'
      });
      return;
    }
    this.db.getUser(this.sessions[session_key].user_key, (function(err, user) {
      this.sendInitialData(user, client);
    }).bind(this));
  } else {
    console.log("session does not exist");
    client.send({
      message_type : 'session_login_error'
    });
  }
};

UserManager.prototype.sendInitialData = function(user, client) {
  console.log("sendInitialData");
  
  client.user = user;
  this.addConnectedClient(client);

  var data = {
    tasks : [],
    users : [],
    projects : []
  };

  var completed = 0;
  function checkComplete() {
    if (++completed < 3) return;

    client.send({
      message_type : 'initial',
      'time' : new Date().getTime(),
      'user' : client.user.getData(),
      'data' : data
    });
  }

  this.db.getUsersForUser(client.user, function(err, friends) {
    if (!friends) {checkComplete(); return;}
    for (var i = 0, friend; friend = friends[i]; i++) {
      data.users.push(friend.getData());
    }
    checkComplete();
  });

  this.db.getTasksForUser(client.user, function(err, tasks) {
    if (!tasks) {checkComplete(); return;}
    for (var i = 0, task; task = tasks[i]; i++) {
      data.tasks.push(task.getData());
    }
    checkComplete();
  });

  this.db.getProjectsForUser(client.user, function(err, projects) {
    if (!projects) {checkComplete(); return;}
    for (var i = 0, project; project = projects[i]; i++) {
      data.projects.push(project.getData());
    }
    checkComplete();
  });
};

UserManager.prototype.isUser = function(client) {
  return ('user' in client && 'key' in client.user);
};

UserManager.prototype.disconnect = function(client) {
  if (!this.isUser(client))
    return;

  var index = this.clients[client.user.key].indexOf(client);
  if (index >= 0)
    this.clients[client.user.key].remove(index);
};

exports.UserManager = UserManager;