/**
 * Handles SignIn UI. The client should provide a 'handleSignIn' message.
 */
function SignInView(controller) {}
SignInView = GMBase.DOMObject.Constructor();

SignInView.prototype.constructor_ = function(controller) {
  this.classList.add("signin");
  this.controller = controller;
  this.controller.addListener('signin_success', this.handleSignInSuccess_.bind(this));
  this.controller.addListener('signin_error', this.handleSignInError_.bind(this));
  this.controller.addListener('socket_connected', this.handleConnected_.bind(this));

  this.input_email = new InputField('');
  this.input_email.setPlaceholder('email');
  this.input_email.name = 'email';

  this.input_password = new InputField('');
  this.input_password.setType('password');
  this.input_password.setPlaceholder('password');
  this.input_password.name = 'password';
  this.input_password.addListener('submit', this.handleInput_.bind(this));

  this.appendChild(this.input_email);
  this.appendChild(this.input_password);

  if ('signin_email' in window.localStorage) {
    this.input_email.setValue(window.localStorage['signin_email']);
    setTimeout(this.input_password.focus.bind(this.input_password), 1);
  }

  document.body.appendChild(this);
};

/**
 * Listener for the initial socket connection being made.
 */
SignInView.prototype.handleConnected_ = function() {
  
};

SignInView.prototype.handleSignInSuccess_ = function(data) {
  this.classList.add('hidden');
};

SignInView.prototype.handleSignInError_ = function(data) {
  shake(this);
};

/**
 * Called by InputBlock when text is entered - attempts to log in.
 * @param {String} username
 */
SignInView.prototype.handleInput_ = function(username) {
  window.localStorage['signin_email'] = this.input_email.value;
  this.controller.login(this.input_email.value, this.input_password.value);
};
