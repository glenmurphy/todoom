var DBClient = require('mysql').Client,
    functions = require('../shared/functions.js'),
    GMBase = require('../shared/gmbase.js').GMBase,
    User = require('../shared/user_model.js').User,
    Project = require('../shared/project_model.js').Project,
    Task = require('../shared/task_model.js').Task,
    Step = require('step'),
    sys = require(process.binding('natives').util ? 'util' : 'sys');

function ToDBSQL(db_name, clear, callback) {
  this.db = new DBClient();
  this.db.user = 'root';
  this.db.password = 'mansini';
  this.db.host = '127.0.0.1';
  this.db.port = 3306;

  this.db_name = db_name ? db_name : 'todoom';
  this.db.connect((function(err, result) {
    if (err) {
      console.log(err);
      return;
    }
    this.init_(clear, callback);
  }).bind(this));
}

ToDBSQL.prototype.init_ = function(clear, callback) {
  var db = this.db;
  var db_name = this.db_name;

  var createDataBase = function() {
    console.log("Creating database");
    Step(
      function create() {
        db.query("CREATE DATABASE " + db_name, this);
      },
      function use() {
        db.query("USE " + db_name, this);
      },
      function createUsers() {
        db.query("CREATE TABLE users ("+
                 "  user_id VARCHAR(255) NOT NULL UNIQUE," +
                 "  name VARCHAR(255)," +
                 "  email VARCHAR(255)," +
                 "  password_hash VARCHAR(255)," +
                 "  archive_tasks_before BIGINT," +
                 "  PRIMARY KEY(user_id)" +
                 ") ENGINE=INNODB;", this);
      },
      function createProjects() {
        db.query("CREATE TABLE projects (" +
                 "  project_id VARCHAR(255) NOT NULL UNIQUE," +
                 "  name VARCHAR(255)," +
                 "  archive_tasks_before BIGINT," +
                 "  PRIMARY KEY(project_id)" +
                 ") ENGINE=INNODB;", this);
      },
      function createTasks() {
        db.query("CREATE TABLE tasks (" +
               "  task_id VARCHAR(255) NOT NULL UNIQUE," +
               "  name VARCHAR(255)," +
               "  description TEXT," +
               "  status INT(2)," +
               "  archived BOOL," +
               "  project VARCHAR(255)," +
               "  creator VARCHAR(255)," +
               "  owner VARCHAR(255)," +
               "  completed_date BIGINT," +
               "  PRIMARY KEY (task_id, project, owner, creator)," +
               "  FOREIGN KEY (creator) REFERENCES users(user_id)" +
               ") ENGINE=INNODB;", this);
      },
      function createProjectUsers() {
        db.query("CREATE TABLE project_users (" +
                 "  project_id VARCHAR(255)," +
                 "  user_id VARCHAR(255)," +
                 "  PRIMARY KEY (project_id, user_id)," +
                 "  FOREIGN KEY (project_id) REFERENCES projects(project_id)," +
                 "  FOREIGN KEY (user_id) REFERENCES users(user_id)" +
                 ") ENGINE=INNODB;", this);
      },
      function insertGlen() {
        db.query("INSERT INTO users (user_id, name, email) VALUES (?, ?, ?)",
            ['glen1', 'Glen Murphy', 'glen@glenmurphy.com'], this);
      },
      function end() {
        console.log("Created!");
        if (callback) callback();
      }
    );
  };
  
  if (clear) {
    console.log("Dropping database");
    this.db.query("DROP DATABASE " + this.db_name, createDataBase);
  } else {
    this.db.query("USE " + this.db_name, function(err, result) {
      if (err && (err.number == DBClient.ERROR_NO_DB_ERROR || err.number == DBClient.ERROR_BAD_DB_ERROR)) {
        createDataBase();
        return;
      }
      console.log("All good");
      if (callback) callback();
    });
  }
};

// DELETERS
ToDBSQL.prototype.deleteTask = function(task_key, cb) {
  this.db.query("DELETE FROM tasks WHERE task_id = ?", [task_key], cb);
};

// PUTTERS
ToDBSQL.prototype.putTask = function(task, cb) {
  console.log("Putting task " + task.key);
  this.db.query("INSERT INTO tasks " +
      "(task_id, name, description, status, archived, project, creator, owner, completed_date) VALUES " +
      "(?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE " +
      "task_id = ?, name = ?, description = ?, status = ?, archived = ?, project = ?, creator = ?, owner = ?, completed_date = ?",
      [task.key, task.name, task.description, task.status, task.archived, task.project, task.creator, task.owner, task.completed_date,
       task.key, task.name, task.description, task.status, task.archived, task.project, task.creator, task.owner, task.completed_date], cb);
};

ToDBSQL.prototype.putProject = function(project, cb) {
  console.log("Putting project " + project.key);
  this.db.query("INSERT INTO projects " +
      "(project_id, name, archive_tasks_before) VALUES " +
      "(?, ?, ?) ON DUPLICATE KEY UPDATE project_id = ?, name = ?, archive_tasks_before = ?",
      [project.key, project.name, project.archive_tasks_before,
       project.key, project.name, project.archive_tasks_before], (function(err, results) {
    if (err) console.log(err);
    // TODO: Potentially not necessary.
    this.putProjectUsers(project, cb);
  }).bind(this));
};

ToDBSQL.prototype.putProjectUsers = function(project, cb) {
  var db = this.db; // for closure.
  var task_count = 0;
  var completed = 0;
  function task_completed() {
    if (++completed >= task_count && cb) {
      cb();
    }
  }
  
  this.db.query("SELECT user_id FROM project_users WHERE project_id = ?", [project.key], function(err, results) {
    var current_ids = [];
    for (var i = 0, row; row = results[i]; i++) {
      var user_id = row.user_id;
      current_ids.push(user_id);
      if (!project.users.contains(user_id)) {
        task_count++;
        db.query("DELETE FROM project_users WHERE project_id = ? AND user_id = ?", [project.key, user_id], task_completed);
      }
    }
    for (var u = 0, user_id; user_id = project.users[u]; u++) {
      if (!current_ids.contains(user_id))
        task_count++;
        db.query("INSERT INTO project_users (project_id, user_id) VALUES (?, ?)", [project.key, user_id], task_completed);
    }
  });
};

ToDBSQL.prototype.putUser = function(user, cb) {
  console.log("Putting user " + user.key);
  this.db.query("INSERT INTO users " +
      "(user_id, name, email, password_hash, archive_tasks_before) VALUES " +
      "(?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE "+
      "user_id = ?, name = ?, email = ?, password_hash = ?, archive_tasks_before = ?",
      [user.key, user.name, user.email, user.hash, user.archive_tasks_before,
       user.key, user.name, user.email, user.hash, user.archive_tasks_before], cb);
};

// GETTERS --------------------------------------------------------------------
ToDBSQL.userFromResult = function(res) {
  if (!res) return null;

  var user = new User();
  user.key = res.user_id;
  user.name = res.name;
  user.email = res.email;
  user.hash = res.password_hash;
  user.archive_tasks_before = res.archive_tasks_before;
  return user;
};

ToDBSQL.projectFromResult = function(res) {
  if (!res) return null;

  var project = new Project();
  project.key = res.project_id;
  project.name = res.name;
  project.archive_tasks_before = res.archive_tasks_before;
  project.users = [];
  return project;
};

ToDBSQL.projectsFromResults = function (results) {
  if (!results) return null;
  
  var projects = {};

  for (var i = 0, res; res = results[i]; i++) {
    id = res.project_id;

    if (!(id in projects)) {
      projects[id] = ToDBSQL.projectFromResult(res);
    }

    if (!projects[id].users.contains(res.user_id)) {
      projects[id].users.push(res.user_id);
    }
  }

  return functions.generateListFromMap(projects);
};

ToDBSQL.taskFromResult = function(res) {
  if (!res) return null;

  var task = new Task();
  task.key = res.task_id;
  task.name = res.name;
  task.description = res.description;
  task.status = res.status;
  task.archived = res.archived;
  task.project = res.project;
  task.creator = res.creator;
  task.owner = res.owner;
  task.completed_date = res.completed_date;
  return task;
};

ToDBSQL.prototype.getUser = function(user_key, callback) {
  this.db.query("SELECT * FROM users WHERE user_id = ? LIMIT 1", [user_key], function(err, results) {
    if (results.length == 0) {
      callback(false);
      return;
    }
    callback(ToDBSQL.userFromResult(results[0]));
  });
};

ToDBSQL.prototype.getUserByEmail = function(email, callback) {
  this.db.query("SELECT * FROM users WHERE email = ? LIMIT 1", [email], function(err, results) {
    if (results.length == 0) {
      callback(false);
      return;
    }
    callback(ToDBSQL.userFromResult(results[0]));
  });
};

ToDBSQL.prototype.getOrCreateUserByEmail = function(email, callback) {
  this.db.query("SELECT * FROM users WHERE email = ? LIMIT 1", [email], (function(err, results) {
    if (results.length == 0) {
      // Not found, create this user.
      var user = new User();
      user.email = email;
      user.name = email.split("@")[0];
      this.putUser(user);
      callback(user);
      return;
    }
    callback(ToDBSQL.userFromResult(results[0]));
  }).bind(this));
};

ToDBSQL.prototype.getProjectsForUser = function(user, callback) {
  this.db.query("SELECT projects.*, p2.user_id" +
                " FROM projects, project_users p1, project_users p2" +
                " WHERE projects.project_id = p1.project_id AND p1.user_id = ? AND p2.project_id = p1.project_id;",
                [user.key],
    function(err, results) {
      if (err) {callback(false); return;}

      callback(ToDBSQL.projectsFromResults(results));
    }
  );
};

ToDBSQL.prototype.getProject = function(project_key, callback) {
  this.db.query("SELECT * FROM projects, project_users WHERE projects.project_id = ? AND project_users.project_id = ?", [project_key, project_key],
    function(err, results) {
      if (err) {callback(false); return;}
      var projects = ToDBSQL.projectsFromResults(results);
      if (projects)
        callback(projects[0]);
      else
        callback();
    }
  );
};

/**
 * Gets all the keys associated with a task (the people directly
 * involved in the task, and all the users in the project the
 * task is assigned to).
 * @param task
 * @param callback
 */
ToDBSQL.prototype.getUserKeysForTask = function(task, callback) {
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

ToDBSQL.prototype.getTask = function(task_key, callback) {
  this.db.query("SELECT * FROM tasks WHERE task_id = ? LIMIT 1", [task_key],
    function(err, results) {
      callback(ToDBSQL.taskFromResult(results[0]));
    }
  );
};

ToDBSQL.prototype.getTasksForUser = function(user, callback) {
  var db = this.db;
  var tasks = {};
  Step(
    function getProjectTasks() {
      db.query("SELECT tasks.*" +
               " FROM tasks, project_users p1, project_users p2" +
               " WHERE (p1.user_id = ? AND p2.project_id = p1.project_id AND tasks.project = p2.project_id)" +
               " GROUP BY tasks.task_id", [user.key], this);
    },
    function gotTasks(err, results) {
      for (var i = 0, task; task = results[i]; i++) {
        var model = ToDBSQL.taskFromResult(task);
        tasks[model.key] = model;
      }
      db.query("SELECT * FROM tasks WHERE owner = ? OR creator = ?", [user.key, user.key], this);
    },
    function gotTasks(err, results) {
      for (var i = 0, task; task = results[i]; i++) {
        var model = ToDBSQL.taskFromResult(task);
        tasks[model.key] = model;
      }
      callback(functions.generateListFromMap(tasks));
    }
  );
};

ToDBSQL.prototype.getUsersForUser = function(user, callback) {
  this.db.query("SELECT users.*" +
                " FROM users, project_users p1, project_users p2" +
                " WHERE p2.user_id = ? AND p1.project_id = p2.project_id AND users.user_id = p1.user_id" +
                " GROUP BY user_id", [user.key], function(err, results) {
    var users = [];
    for (var i = 0, user; user = results[i]; i++) {
      users.push(ToDBSQL.userFromResult(user));
    }
    callback(users);
  });
};

exports.ToDBSQL = ToDBSQL;