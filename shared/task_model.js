if (typeof exports != 'undefined') {
  GMBase = require('./gmbase').GMBase;
}

function Task(data) {}

Task = GMBase.Model.Constructor({
  properties : {
    'name' : '',
    'description' : '',
    'status' : 0,
    'archived' : false,
    'project' : '',
    'creator' : '',
    'owner' : '',
    'completed_date' : 0
  },
  type : 'task'
});

Task.prototype.setStatus = function(status) {
  if (status == Task.STATUS_FINISHED) {
    if (this.status != Task.STATUS_FINISHED || this.completed_date == 0)
      this.completed_date = new Date().getTime();
  }

  this.status = status;
};

Task.TYPE = 'task';

Task.STATUS_NOTSTARTED = 0;
Task.STATUS_STARTED = 1;
Task.STATUS_PAUSED = 2;
Task.STATUS_REVIEW = 3;
Task.STATUS_FINISHED = 4;

Task.STATUS_NAMES = {};
Task.STATUS_NAMES[Task.STATUS_NOTSTARTED] = 'notstarted';
Task.STATUS_NAMES[Task.STATUS_STARTED] = 'started';
Task.STATUS_NAMES[Task.STATUS_PAUSED] = 'waiting';
Task.STATUS_NAMES[Task.STATUS_REVIEW] = 'review';
Task.STATUS_NAMES[Task.STATUS_FINISHED] = 'finished';

if (typeof exports != 'undefined') {
  exports.Task = Task;
}