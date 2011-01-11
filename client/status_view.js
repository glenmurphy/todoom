var StatusView = function(controller, task) {};
StatusView = GMBase.DOMObject.Constructor();

StatusView.prototype.constructor_ = function(controller, task) {
  this.controller = controller;
  this.classList.add('status-view');
  
  this.task = task;
  this.task.addListener('owner_changed', this.handleChange.bind(this));
  this.task.addListener('status_changed', this.handleChange.bind(this));
  this.addEventListener('click', this.handleClick.bind(this), false);

  this.update();
};

StatusView.prototype.update = function() {
  switch (this.task.status) {
    case Task.STATUS_NOTSTARTED:
      this.className = 'status-view notstarted';
      break;
    case Task.STATUS_STARTED:
      this.className = 'status-view started';
      break;
    case Task.STATUS_PAUSED:
      this.className = 'status-view paused';
      break;
    case Task.STATUS_FINISHED:
      this.className = 'status-view finished';
      break;
    default:
      this.className = 'status-view';
      break;
  }
};

StatusView.prototype.handleClick = function() {
  var params = [];
  if (this.task.owner) {
    params = [
      {
        name : 'Not started',
        clickHandler : this.handleButtonNotStarted.bind(this)
      },
      {
        name : 'Started',
        clickHandler : this.handleButtonStart.bind(this)
      },
      {
        name : 'Waiting',
        clickHandler : this.handleButtonPause.bind(this)
      },
      {
        name : 'Finished',
        clickHandler : this.handleButtonFinish.bind(this)
      }
    ];
  } else {
    params = [
      {
      name : 'Claim this task',
      clickHandler : this.handleClaim.bind(this)
      },
      {
        name : 'Claim and start',
        clickHandler : this.handleButtonClaimStart.bind(this)
      },
      {
        name : 'Claim and wait',
        clickHandler : this.handleButtonClaimPause.bind(this)
      },
      {
        name : 'Claim and finish',
        clickHandler : this.handleButtonClaimFinish.bind(this)
      }
    ];
  }
  params.push({});
  params.push({
    name : 'Delete',
    clickHandler : this.handleButtonDelete.bind(this)
  });

  new Menu(this, params);
}

StatusView.prototype.handleChange = function(data) {
  this.update();
};

StatusView.prototype.handleClaim = function() {
  this.controller.changeValue(this.task, 'owner', this.controller.user.key);
};

StatusView.prototype.handleButtonNotStarted = function() {
  this.controller.changeValue(this.task, 'status', Task.STATUS_NOTSTARTED);
};

StatusView.prototype.handleButtonStart = function() {
  this.controller.changeValue(this.task, 'status', Task.STATUS_STARTED);
};

StatusView.prototype.handleButtonPause = function() {
  this.controller.changeValue(this.task, 'status', Task.STATUS_PAUSED);
};

StatusView.prototype.handleButtonResume = function() {
  this.controller.changeValue(this.task, 'status', Task.STATUS_STARTED);
};

StatusView.prototype.handleButtonFinish = function() {
  this.controller.changeValue(this.task, 'status', Task.STATUS_FINISHED);
};

StatusView.prototype.handleClaimStatus = function(status) {
  this.controller.changeValues(this.task, {
    'owner' : this.controller.user.key,
    'status' : status
  });
};

StatusView.prototype.handleButtonClaimStart = function() {
  this.handleClaimStatus(Task.STATUS_STARTED);
};

StatusView.prototype.handleButtonClaimPause = function() {
  this.handleClaimStatus(Task.STATUS_PAUSED);
};

StatusView.prototype.handleButtonClaimFinish = function() {
  this.handleClaimStatus(Task.STATUS_FINISHED);
};

StatusView.prototype.handleButtonArchive = function() {
  this.controller.changeValue(this.task, 'archived', true);
};

StatusView.prototype.handleButtonDelete = function() {
  this.controller.deleteTask(this.task);
}