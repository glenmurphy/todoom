function ToolTipManager() {
  if (ToolTipManager.instance) {
    return ToolTipManager.instance;
  }
  this.current = null;
  this.timeout = null;
  this.showing = false;
  this.node = createElement('div', 'tooltip');
  
  ToolTipManager.instance = this;
}

ToolTipManager.instance = null;

function ToolTip() {
  if (ToolTipManager.instance)
    return ToolTipManager.instance;
  else
    return new ToolTipManager();
}

ToolTipManager.prototype.watch = function(node, text) {
  node.setAttribute('data-tooltip', text);
  node.addEventListener('mouseover', this.handleMouseOver.bind(this, node));
  node.addEventListener('mouseout', this.handleMouseOut.bind(this, node));
};

ToolTipManager.prototype.handleMouseOver = function(node) {
  this.current = node;
  if (this.timeout)
    clearTimeout(this.timeout);
  this.timeout = setTimeout(this.handleTimer.bind(this, node), 1000);
};

ToolTipManager.prototype.handleMouseOut = function(node) {
  this.current = null;
  if (this.timeout)
    clearTimeout(this.timeout);

  if (this.showing) {
    this.node.classList.remove('visible');
    document.body.removeChild(this.node);
  }
};

ToolTipManager.prototype.handleTimer = function(node) {
  this.showing = true;
  this.node.innerText = node.getAttribute('data-tooltip');
  
  var pos = getPosition(node);
  this.node.style.webkitTransform = 'translate('+pos.x+'px, '+pos.y+'px)';

  document.body.appendChild(this.node);
  setTimeout(this.setVisible.bind(this), 1);
};

ToolTipManager.prototype.setVisible = function(node) {
  this.node.classList.add('visible');
}