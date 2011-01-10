var ToDBSQL = require('../todb_sql.js').ToDBSQL,
    ToDB = require('../todb.js').ToDB,
    User = require('../../shared/user_model.js').User,
    Project = require('../../shared/project_model.js').Project,
    Task = require('../../shared/task_model.js').Task,
    functions = require('../../shared/functions.js'),
    Step = require('step'),
    test = require('./test.js'),
    http = require('http');

function ToDBTest(db) {
  this.db = db;

  this.data = {
    user1 : new User({
      key : 'user1',
      name : 'User One',
      email : 'glen@glenmurphy.com'
    }),
    user2 : new User({
      key : 'user2',
      name : 'User Two'
    }),
    user3 : new User({
      key : 'user3',
      name : 'User Three'
    }),
    user4 : new User({
      key : 'user4',
      name : 'User Four'
    }),
    project1 : new Project({
      key : 'project1',
      name : 'Project One',
      users : ['user1', 'user2']
    }),
    project2 : new Project({
      key : 'project2',
      name : 'Project Two',
      users : ['user2', 'user3']
    }),
    project3 : new Project({
      key : 'project3',
      name : 'Project Three',
      users : ['user1', 'user3']
    }),
    project4 : new Project({
      key : 'project4',
      name : 'Project Four',
      users : ['user3', 'user4']
    }),
    task1 : new Task({
      key : 'task1',
      name : 'Task One',
      creator : 'user1',
      project : '',
      owner : 'user1'
    }),
    task2 : new Task({
      key : 'task2',
      name : 'Task Two',
      creator : 'user2',
      project : 'project1',
      owner : 'user1'
    }),
    task3 : new Task({
      key : 'task3',
      name : 'Task Three',
      creator : 'user2',
      project : 'project1',
      owner : 'user1'
    }),
    task4 : new Task({
      key : 'task4',
      name : 'Task Four',
      creator : 'user2',
      project : 'project2',
      owner : 'user2'
    }),
    task5 : new Task({
      key : 'task5',
      name : 'Task Five',
      creator : 'user3',
      project : '',
      owner : 'user2'
    })
  };
}

ToDBTest.prototype.runTest = function(cb) {
  var self = this;
  Step(
    function populate() {
      self.populate(this);
    },
    function testGetUser() {
      self.testGetUser(this);
    },
    function testGetProject() {
      self.testGetProject(this);
    },
    function testGetTask() {
      self.testGetTask(this);
    },
    function testGetOrCreateUserByEmail() {
      self.testGetOrCreateUserByEmail(this);
    },
    function testGetProjectsForUser() {
      self.testGetProjectsForUser(this);
    },
    function testGetUserKeysForTask() {
      self.testGetUserKeysForTask(this);
    },
    function testGetTasksForUser() {
      self.testGetTasksForUser(this);
    },
    function testGetUsersForUser() {
      self.testGetUsersForUser(this);
    },
    function end() {
      cb();
    }
  );
};

ToDBTest.prototype.populate = function(cb) {
  var db = this.db;
  var data = this.data;
  Step(
    function put() {
      db.putUser(data.user1, this.parallel());
      db.putUser(data.user2, this.parallel());
      db.putUser(data.user3, this.parallel());
      db.putUser(data.user4, this.parallel());
      db.putProject(data.project1, this.parallel());
      db.putProject(data.project2, this.parallel());
      db.putProject(data.project3, this.parallel());
      db.putProject(data.project4, this.parallel());
      db.putTask(data.task1, this.parallel());
      db.putTask(data.task2, this.parallel());
      db.putTask(data.task3, this.parallel());
      db.putTask(data.task4, this.parallel());
      db.putTask(data.task5, this).parallel();
    },
    function end() {
      console.log("finished putting");
      cb();
    }
  );
};

ToDBTest.prototype.testGetUser = function(cb) {
  test.begin_test("testGetUser");
  
  var db = this.db;
  var data = this.data;
  Step(
    function getUser() {
      db.getUser(data.user1.key, this);
    },
    function gotUser(user) {
      test.assert_models_equal(user, data.user1, "Get user one");
      db.getUser(data.user2.key, this)
    },
    function gotUser(user) {
      test.assert_models_equal(user, data.user2, "Get user one");
      cb();
    }
  );
};

ToDBTest.prototype.testGetProject = function(cb) {
  test.begin_test("testGetProject");

  var db = this.db;
  var data = this.data;
  Step(
    function getProject() {
      db.getProject(data.project1.key, this);
    },
    function gotProject(project) {
      test.assert_models_equal(project, data.project1, "Get project one");
      db.getProject(data.project2.key, this)
    },
    function gotProject(project) {
      test.assert_models_equal(project, data.project2, "Get project two");
      cb();
    }
  );
};

ToDBTest.prototype.testGetTask = function(cb) {
  test.begin_test("testGetTask");

  var db = this.db;
  var data = this.data;
  Step(
    function getTask() {
      db.getTask(data.task1.key, this);
    },
    function gotTask(task) {
      test.assert_models_equal(task, data.task1, "Get task one");
      db.getTask(data.task2.key, this)
    },
    function gotTask(task) {
      test.assert_models_equal(task, data.task2, "Get task two");
      cb();
    }
  );
};

ToDBTest.prototype.testGetOrCreateUserByEmail = function(cb) {
  test.begin_test("testGetOrCreateUserByEmail");
  var db = this.db;
  var data = this.data;
  Step(
    function getExistingUser() {
      db.getOrCreateUserByEmail(data.user1.email, this);
    },
    function gotUser(user) {
      test.assert_models_equal(user, data.user1, "Get existing user by email");
      db.getOrCreateUserByEmail("ely.lauren@gmail.com", this);
    },
    function createdUser(user) {
      test.assert_equal(user.email, "ely.lauren@gmail.com", "Created user");
      db.getUser(user.key, this);
    },
    function getCreatedUser(user) {
      test.assert_equal(user.email, "ely.lauren@gmail.com", "Get created user");
      cb();
    }
  );
};

ToDBTest.prototype.testGetProjectsForUser = function(cb) {
  test.begin_test("testGetProjectsForUser");
  var db = this.db;
  var data = this.data;
  Step(
    function getExistingUser() {
      db.getProjectsForUser(data.user1, this);
    },
    function gotProjects(projects) {
      test.assert_equal(projects.length, 2, "Number of projects");

      projects = functions.generateModelMap(projects);
      test.assert_models_equal(projects.project1, data.project1, "Project 1 present");
      test.assert_models_equal(projects.project3, data.project3, "Project 3 present");

      db.getProjectsForUser(data.user2, this);
    },
    function gotProjects(projects) {
      test.assert_equal(projects.length, 2, "Number of projects");

      projects = functions.generateModelMap(projects);
      test.assert_models_equal(projects.project1, data.project1, "Project 3 present");
      test.assert_models_equal(projects.project2, data.project2, "Project 2 present");
      cb();
    }
  );
};

ToDBTest.prototype.testGetUserKeysForTask = function(cb) {
  test.begin_test("testGetUserKeysForTask");
  var db = this.db;
  var data = this.data;
  Step(
    function getKeys() {
      db.getUserKeysForTask(data.task1, this);
    },
    function gotKeys(keys) {
      // Task1 should only be visible to User1.
      test.assert_equal(keys.length, 1, "Number of keys");
      test.assert_equal(keys[0], data.user1.key, "Assigned to user one");

      db.getUserKeysForTask(data.task2, this);
    },
    function gotKeys(keys) {
      // Task1 should be visible to all members of Project1 (user1 and 2)
      test.assert_equal(keys.length, 2, "Number of keys");
      keys = functions.generateMap(keys);
      
      test.assert_equal(keys[data.user1.key], data.user1.key, "Available to user one");
      test.assert_equal(keys[data.user2.key], data.user2.key, "Available to user two");
      cb();
    }
  );
};

ToDBTest.prototype.testGetUserKeysForTask = function(cb) {
  test.begin_test("testGetUserKeysForTask");
  var db = this.db;
  var data = this.data;
  Step(
    function getKeys() {
      db.getUserKeysForTask(data.task1, this);
    },
    function gotKeys(keys) {
      // Task1 should only be visible to User1.
      test.assert_equal(keys.length, 1, "Number of keys");
      test.assert_equal(keys[0], data.user1.key, "Assigned to user one");

      db.getUserKeysForTask(data.task2, this);
    },
    function gotKeys(keys) {
      // Task1 should be visible to all members of Project1 (user1 and 2)
      test.assert_equal(keys.length, 2, "Number of keys");
      keys = functions.generateMap(keys);

      test.assert_equal(keys[data.user1.key], data.user1.key, "Available to user one");
      test.assert_equal(keys[data.user2.key], data.user2.key, "Available to user two");
      cb();
    }
  );
};

ToDBTest.prototype.testGetTasksForUser = function(cb) {
  test.begin_test("testGetTasksForUser");
  var db = this.db;
  var data = this.data;
  Step(
    function getTasks() {
      test.log("Getting tasks for user one");
      db.getTasksForUser(data.user1, this);
    },
    function gotTasks(tasks) {
      // User 1 should see tasks 1,2 and 3.
      test.assert_equal(tasks.length, 3, "Number of tasks");

      tasks = functions.generateModelMap(tasks);
      
      test.assert_models_equal(tasks[data.task1.key], data.task1, "Task one present");
      test.assert_models_equal(tasks[data.task2.key], data.task2, "Task two present");
      test.assert_models_equal(tasks[data.task3.key], data.task3, "Task three present");

      test.log("Getting tasks for user two");
      db.getTasksForUser(data.user2, this);
    },
    function gotTasks(tasks) {
      // User 2 should see tasks 2, 3, 4, 5.
      test.assert_equal(tasks.length, 4, "Number of tasks");

      tasks = functions.generateModelMap(tasks);

      test.assert_models_equal(tasks[data.task2.key], data.task2, "Task two present");
      test.assert_models_equal(tasks[data.task3.key], data.task3, "Task three present");
      test.assert_models_equal(tasks[data.task4.key], data.task4, "Task four present");
      test.assert_models_equal(tasks[data.task5.key], data.task5, "Task five present");

      test.log("Getting tasks for user three");
      db.getTasksForUser(data.user3, this);
    },
    function gotTasks(tasks) {
      // User 3 should see tasks 4 and 5.
      test.assert_equal(tasks.length, 2, "Number of tasks");

      tasks = functions.generateModelMap(tasks);

      test.assert_models_equal(tasks[data.task4.key], data.task4, "Task four present");
      test.assert_models_equal(tasks[data.task5.key], data.task5, "Task five present");

      cb();
    }
  );
};


ToDBTest.prototype.testGetUsersForUser = function(cb) {
  test.begin_test("testGetUsersForUser");
  var db = this.db;
  var data = this.data;
  Step(
    function getUsers() {
      test.log("Getting users for user one");
      db.getUsersForUser(data.user1, this);
    },
    function gotUsers(users) {
      // User 1 should see users 1, 2 and 3.
      test.assert_equal(users.length, 3, "Number of users");

      users = functions.generateModelMap(users);

      test.assert_models_equal(users[data.user1.key], data.user1, "User one present");
      test.assert_models_equal(users[data.user2.key], data.user2, "User two present");
      test.assert_models_equal(users[data.user3.key], data.user3, "User three present");

      test.log("Getting users for user four");
      db.getUsersForUser(data.user4, this);
    },
    function gotUsers(users) {
      // User 4 should see users 3 and 4 (from project 4).
      test.assert_equal(users.length, 2, "Number of users");

      users = functions.generateModelMap(users);

      test.assert_models_equal(users[data.user3.key], data.user3, "User three present");
      test.assert_models_equal(users[data.user4.key], data.user4, "User four present");

      cb();
    }
  );
};

var sql_db;
var js_db;

Step(
  function setUpDBs() {
    sql_db = new ToDBSQL('todoom_test', true, this.parallel());
    js_db = new ToDB('./todoom_test', true, this.parallel());
  },
  function testSQLDB() {
    test.begin_test("SQL DB Test");
    var sql_test = new ToDBTest(sql_db);
    sql_test.runTest(this);
  },
  function testJSDB() {
    test.end();
    test.begin_test("JS DB Test");
    var js_test = new ToDBTest(js_db);
    js_test.runTest(this);
  },
  function end() {
    test.end();
    process.exit();
  }
);