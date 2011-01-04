/**
 * GMBase is a set of base classes that can make Objects into DOM elements.
 * It also adds a bunch of listener functions to make it easier to deal with
 * model/view separation.
 */
var GMBase = {};


// TODO: Make this verifiably unique.
GMBase.Unique = {};
GMBase.Unique.count = 0;
GMBase.Unique.S4 = function() {
   return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
};
GMBase.Unique.getUniqueId = function() {
  return ((new Date().getTime()) + '-' + GMBase.Unique.count++ + '-' + GMBase.Unique.S4() + '-' + GMBase.Unique.S4());
};

GMBase.createBoundMethods = function(obj) {
  for (var prop in obj) {
    if (typeof obj[prop] == 'function') {
      obj[prop + 'Bound'] = obj[prop].bind(obj);
    }
  }
};

GMBase.bindMethodsInline = function(obj) {
  for (var prop in obj) {
    if (typeof obj[prop] == 'function') {
      obj[prop] = obj[prop].bind(obj);
    }
  }
};

/**
 * Listener adds an event interface to the object.
 *
 * Example usage:
 * 
 * function Obj(name) {
 *   this.name = name;
 *   this.counter = 0;
 *   setInterval(this.checkError.bind(this), 1000);
 * }
 * GMBase.Listener.Extend(Obj);
 * Obj.EVENT_HUNDRED = 1;
 * 
 * Obj.prototype.checkError() {
 *   if (++this.counter % 100 == 0) {
 *     this.notifyListeners(Obj.EVENT_HUNDRED, this);
 *   }
 * };
 *
 * function UI() {
 *   this.o1 = new Obj('one');
 *   this.o1.addListener(Obj.EVENT_HUNDRED, this.handleHundred.bind(this));
 * }
 * UI.prototype.handleHundred = function(obj) {
 *   // Do something.
 * };
 */
GMBase.Listener = function() {};

GMBase.Listener.prototype.addListener = function(event, listener) {
  if (typeof this.listeners_ == 'undefined')
    this.listeners_ = {};
  if (!(event in this.listeners_)) {
    this.listeners_[event] = [];
  }

  this.listeners_[event].push(listener);
};

GMBase.Listener.prototype.removeListener = function(event, listener) {
  if (typeof this.listeners_ == 'undefined') return;
  if (!(event in this.listeners_)) {
    return;
  }

  for (var i = this.listeners_[event].length; i >= 0; i--) {
    if (this.listeners_[event][i] == listener) {
      this.listeners_[event].remove(i);
      return;
    }
  }
};

GMBase.Listener.prototype.notifyListeners = function(event, data) {
  if (typeof this.listeners_ == 'undefined') return;
  if (!(event in this.listeners_)) {
    return;
  }
  data.type = event;
  data.sender = this;
  for (var i = 0, listener; listener = this.listeners_[event][i]; i++) {
    listener(data);
  }
};

GMBase.Listener.Extend = function(Obj) {
  Obj.prototype.addListener = GMBase.Listener.prototype.addListener;
  Obj.prototype.removeListener = GMBase.Listener.prototype.removeListener;
  Obj.prototype.notifyListeners = GMBase.Listener.prototype.notifyListeners;
};

/*
 * GMBase.Model simplifies the creation of models - it inherits from
 * Listener.
 */
GMBase.Model = function() {};
GMBase.Model.RESERVED_NAMES = ['key', 'type', '_properties'];

GMBase.Model.Constructor = function(template) {
  // Validate template.
  for (var id in template.properties) {
    if (id in GMBase.Model.RESERVED_NAMES) {
      window.console.error("Error: reserved name used: " + id);
      return;
    }
  }
  
  function f(data) {
    for (var id in template.properties) {
      if (data && id in data)
        this[id] = data[id];
      else
        this[id] = template.properties[id];
    }
    this._properties = template.properties;
    this.type = template.type;
    this.key = (data && 'key' in data) ? data.key : GMBase.Unique.getUniqueId();
  }
  
  f.prototype.__proto__ = GMBase.Model.prototype;
  GMBase.Listener.Extend(f);
  
  return f;
}

GMBase.Model.prototype.getData = function() {
  var data = {
    key : this.key,
    type : this.type
  };
  for (var key in this._properties) {
    data[key] = this[key];
  }
  return data;
};

GMBase.Model.prototype.setData = function(data) {
  for (key in this._properties) {
    if (key in data)
      this.set(key, data[key]);
  }
  this.notifyListeners('setdata', {});
};

GMBase.Model.prototype.set = function(key, value) {
  if (!(key in this._properties)) return;

  if (this[key] != value) {
    this[key] = value;
    this.notifyListeners(key + '_changed', {'value':value});
  }
};

GMBase.Model.prototype.append = function(key, value) {
  if (!(key in this.properties)) return;

  if (!(value in this[key])) {
    this[key].push(value);
    this.notifyListeners(key + '_added', {'value':value});
  }
};

/*
 * DOMObject allows you to use an object as a JS object and as a DOM
 * node simultaneously; it's based on work by Erik Arvidsson because
 * he's awesome.
 * 
 * Example usage:
 *
 * <script>
 * var Shell = function(class_name) {}      // Signature for IDEs.
 * Shell = GMBase.DOMObject.Constructor('div');  // Extend with DOMObject.
 * Shell.prototype = {
 *   constructor_ : function(class_name) {
 *     this.classList.add(class_name);
 *     this.addEventListener('click', this.handleClick_.bind(this));
 *   },
 *   get pie() { return this.innerHTML },
 *   set pie(text) { this.innerHTML = text; }
 * };
 * Shell.prototype.doSomething = function() {
 *   this.pie = 'Something done';
 * }
 * Shell.prototype.handleClick_ = function(e) {
 *   alert(this.pie);
 *   this.pie('Clicked');
 * }
 * </script>
 * var shell = new Shell('green');
 * document.body.appendChild(shell);
 * shell.doSomething();
 * shell.pie = "Hoops"
 */
if (typeof HTMLDivElement != 'undefined') {
  /**
   * baseDOMObject is a DOM node that also has a listener interface.
   */
  GMBase.DOMObject = function() {};
  GMBase.DOMObject.prototype.__proto__ = HTMLDivElement.prototype;
  GMBase.Listener.Extend(GMBase.DOMObject);
  
  GMBase.DOMObject.Constructor = function(type) {
    if (!type) {
      type = 'div';
    }

    function f() {
      var el = document.createElement(type);
      f.decorate(el, arguments);
      return el;
    }

    f.decorate = function(el, args) {
      el.__proto__ = f.prototype;
      if (typeof el.constructor_ == 'function')
        el.constructor_.apply(el, args);
    };

    f.prototype.__proto__ = GMBase.DOMObject.prototype;
    
    return f;
  };
}

if (typeof exports != 'undefined') {
  exports.GMBase = GMBase;
}