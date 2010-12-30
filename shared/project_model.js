if (typeof exports != 'undefined') {
  GMBase = require('./gmbase').GMBase;
}

function Project(data) {}

Project = GMBase.Model.Constructor({
  properties : {
    'name' : '',
    'archived' : '',
    'archive_tasks_before' : 0,
    'users' : []
  },
  type : 'project'
});
Project.TYPE = 'project';

if (typeof exports != 'undefined') {
  exports.Project = Project;
}