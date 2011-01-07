var MongoDb = require('mongodb').Db,
    MongoConnection = require('mongodb').Connection,
    MongoServer = require('mongodb').Server,
    BSON = require('mongodb').BSONNative;

function ToDBMongo() {
  this.host = process.env['MONGO_NODE_DRIVER_HOST'] != null ? process.env['MONGO_NODE_DRIVER_HOST'] : '127.0.0.1';
  this.port = process.env['MONGO_NODE_DRIVER_PORT'] != null ? process.env['MONGO_NODE_DRIVER_PORT'] : MongoConnection.DEFAULT_PORT;

  console.log("Connecting to MongoDB...");
  this.db = new MongoDb('todoom', new MongoServer(this.host, this.port, {}), {native_parser:true});

  // create/open DB.
  this.db.open(this.handleDBOpen.bind(this));
}

ToDBMongo.prototype.handleError = function(err) {
  console.log("------------------------------------")
  console.log("ERROR:")
  console.log(err);
};

// new (require('./todb-mongo.js').ToDBMongo);
ToDBMongo.prototype.handleDBOpen = function(err, db) {
  if (err) {
    this.handleError(err);
    return;
  }

  // Verify the users collection, creating it if it doesn't exist.
  this.verifyCollection('users');
  this.verifyCollection('projects');
  this.verifyCollection('tasks');
};

ToDBMongo.prototype.verifyCollection = function(collection_name) {
  this.db.collection(collection_name, (function(err, collection) {
    if (!err && collection) {
      this[collection_name] = collection;
      this.checkReady();
      return;
    }
  }).bind(this));
};

ToDBMongo.prototype.checkReady = function() {
  console.log("Checking...");
  if (this.users && this.projects && this.tasks) {
    console.log("Ready!");
  }
};

// Helpers
/**
 * Translate from a GMBase Model into a MongoDB document (mostly rename .key to ._id)
 * @param model
 */
ToDBMongo.prototype.getModelData = function(model) {
  var data = model.getData();
  data._id = model.key;
  delete model.key;
  return data;
};

// DELETERS
ToDBMongo.prototype.deleteTask = function(task_key) {
  this.tasks.remove({_id : task_key});
};

// PUTTERS --------------------------------------------------------------------
ToDBMongo.prototype.putTask = function(task, callback) {
  this.tasks.update({_id : task.key}, this.getModelData(task), callback);
};

ToDBMongo.prototype.putProject = function(project, callback) {
  this.projects.update({_id : project.key}, this.getModelData(project), callback);
};

// GETTERS --------------------------------------------------------------------

ToDBMongo.prototype.getUser = function(user_key, callback) {
  this.users.findOne({_id : user_key}, callback);
};

ToDBMongo.prototype.getUserByEmail = function(email, callback) {
  this.users.findOne({email : email}, callback);
};

ToDBMongo.prototype.getProject = function(project_key) {
  this.projects.findOne({_id : project_key}, callback);
};

ToDBMongo.prototype.getProjectsForUser = function(user, callback) {
  this.projects.find({users : user.key}, callback);
};

ToDBMongo.prototype.getUserKeysForTask = function(task, callback) {
  var user_keys = {};
  if (task.owner) user_keys[task.owner] = true;
  if (task.creator) user_keys[task.creator] = true;

  function finished() {
    callback(err, functions.collapseMap(user_keys));
  }

  if (task.project) {
    var project = this.getProject(task.project, function(err, project) {
      for (var i = 0, user; user = project.users[i]; i++) {
        user_keys[user] = true;
      }
      finished();
    });
  } else {
    finished();
  }
};

ToDBMongo.prototype.getTask = function(task_key, callback) {
  this.tasks.findOne({_id : task_key}, callback);
};

ToDBMongo.prototype.getTasksForUser = function(user, callback) {
  var tasks = [];
  var projects = [];

  // Get all projects that the user is a part of.
  this.projects.find({users : user.key}, (function(err, projects) {
    for (var i = 0, project; project = projects[i]; i++) {
      projects.push(project._id);
    }
    
    this.tasks.find({ $or : [
      { owner : user.key },
      { creator : user.key },
      { $in : { project : projects}}
    ]}, (function(err, tasks) {
      for (var i = 0, task; task = tasks[i]; i++) {
        tasks.push(task);
      }
      callback(null, tasks);
    }).bind(this))
  }).bind(this));
  return tasks;
};

ToDB.prototype.getUsersForUser = function(user, callback) {
  var user_keys = {};
  user_keys[user.key] = true;

  this.projects.find({users : user.key}, (function(err, projects) {
    for (var i = 0, project; project = projects[i]; i++) {
      for (var u = 0, member; member = project.users[u]; u++) {
        user_keys[member] = true;
      }
    }
    var users = functions.collapseMap(user_keys);
    this.users.find({$in : {_id : users }}, callback);
  }).bind(this));
};


exports.ToDBMongo = ToDBMongo;