var Menu = function(anchor, items_list) {};
Menu = GMBase.DOMObject.Constructor('div');

Menu.prototype.constructor_ = function(anchor, items_list) {
  this.classList.add('menu');
  
  var anchor_position = getPosition(anchor);
  var max_x = document.body.offsetWidth - 140;
  var x = anchor_position.x;
  if (x > max_x) {
    x = max_x;
  } else {
    createElement('div', 'arrow', this);
  }

  this.style.left = x + 'px';
  this.style.top = anchor_position.y + parseInt(anchor.offsetHeight) + 'px';

  for (var i = 0, item; item = items_list[i]; i++) {
    this.appendChild(new MenuItem(this, item));
  }
  
  document.body.appendChild(this);
  setTimeout(this.init.bind(this), 30);
};

Menu.prototype.init = function() {
  // Can't do this inside the click handler that created the menu.
  this.blurHandler = this.blur.bind(this);
  document.body.addEventListener('click', this.blurHandler, false);
};

Menu.prototype.blur = function() {
  // Need to clear our event listeners outside of an event listener
  // callback.
  setTimeout(this.cleanUp.bind(this), 1);
};

Menu.prototype.cleanUp = function() {
  document.body.removeChild(this);
  document.body.removeEventListener('click', this.blurHandler, false);

  var nodes = this.childNodes;
  for (var i = 0, node; node = nodes[i]; i++) {
    // Skip over arrow.
    if (typeof node.cleanUp != 'undefined')
      node.cleanUp();
    this.removeChild(node);
  }
};

var MenuItem = function(menu, item) {};
MenuItem = GMBase.DOMObject.Constructor('div');

MenuItem.prototype.constructor_ = function(menu, item) {
  this.classList.add('menu-item');
  this.menu = menu;
  if (!('name' in item)) {
    this.classList.add('separator');
  } else {
    this.innerText = item.name;
    this.clickHandler = item.clickHandler;
    this.addEventListener('click', this.clickHandler, false);
  }
};

MenuItem.prototype.cleanUp = function() {
  if (this.clickHandler)
    this.removeEventListener('click', this.clickHandler);
};