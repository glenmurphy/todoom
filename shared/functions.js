// Third Party & Utilities
Function.prototype.bind = function(thisObj, var_args) {
  if (typeof(this) != "function") {
    throw new Error("Bind must be called as a method of a function object.");
  }

  var self = this;
  var staticArgs = Array.prototype.splice.call(arguments, 1, arguments.length);

  return function() {
    // make a copy of staticArgs (don't modify it because it gets reused for
    // every invocation).
    var args = staticArgs.concat();

    // add all the new arguments
    for (var i = 0; i < arguments.length; i++) {
      args.push(arguments[i]);
    }

    // invoke the original function with the correct thisObj and the combined
    // list of static and dynamic arguments.
    return self.apply(thisObj, args);
  };
};

Array.prototype.remove = function(from, to) {
  var rest = this.slice((to || from) + 1 || this.length);
  this.length = from < 0 ? this.length + from : from;
  return this.push.apply(this, rest);
};

Array.prototype.contains = function(val) {
  return (this.indexOf(val) != -1);
};

function compare(a, b) {
  return (a > b ? -1 : (a < b ? 1 : 0));
}

function createElement(type, className, parent) {
  var node = document.createElement(type);
  if (className)
    node.className = className;
  if (parent)
    parent.appendChild(node);
  return node;
}

function getPosition(node) {
  var x = 0, y = 0;
  
  while(node) {
    x += parseInt(node.offsetLeft);
    y += parseInt(node.offsetTop);
    node = node.offsetParent;
  }
  
  return {
    x : x,
    y : y
  }
}

function shake(node) {
  
}

function collapseMap(map) {
  var list = [];
  for (var id in map) {
    list.push(id);
  }
  return list;
}

var ServerTime = {
  time_offset : 0,
  offset_history : [],

  // Rolling average offset.
  update : function(time) {
    var offset = new Date().getTime() - time;
    this.offset_history.push(offset);
    if (this.offset_history.length > 10)
      this.offset_history = this.offset_history.slice(1);
    var total = 0;
    for (var i = 0, old_offset; old_offset = this.offset_history[i]; i++) {
      total += old_offset;
    }
    this.time_offset = total / this.offset_history.length;
  },

  getTime : function() {
    return new Date().getTime() - this.time_offset;
  }
};

if (typeof exports != 'undefined') {
  exports.collapseMap = collapseMap;
}