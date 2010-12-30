if (typeof exports != 'undefined') {
  GMBase = require('./gmbase').GMBase;
}
function User(data) {}

User = GMBase.Model.Constructor({
  properties : {
    'name' : '',
    'archive_tasks_before' : 0,
    'email' : ''
  },
  type : 'user'
});
User.TYPE = 'user';

User.prototype.displayName = function() {
  return this.name ? this.name : this.email;
}

if (typeof exports != 'undefined') {
  exports.User = User;
}
