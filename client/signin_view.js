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
  this.controller.addListener('session_login_error', this.handleSignInError_.bind(this));

  this.loading = createElement('div', 'loading', this);
  this.loading.innerText = 'connecting...';

  this.login_page = createElement('div', 'page-login', this);
  this.input_email = new InputField('');
  this.input_email.setPlaceholder('email');
  this.input_email.name = 'email';

  this.input_password = new InputField('');
  this.input_password.setType('password');
  this.input_password.setPlaceholder('password');
  this.input_password.name = 'password';
  this.input_password.addListener('submit', this.handleInput_.bind(this));

  this.login_page.appendChild(this.input_email);
  this.login_page.appendChild(this.input_password);
  
  if ('session_key' in window.localStorage) {
    this.controller.sessionLogin();
    this.showPage(this.loading);
  } else {
    this.showPage(this.login_page);
  }
  
  if ('signin_email' in window.localStorage) {
    this.input_email.setValue(window.localStorage['signin_email']);
    setTimeout(this.input_password.focus.bind(this.input_password), 1);
  }

  document.body.appendChild(this);
};

SignInView.prototype.showPage = function(page) {
  this.loading == page ?
    this.loading.classList.remove('hidden') :
    this.loading.classList.add('hidden');

  this.login_page == page ?
    this.login_page.classList.remove('hidden') :
    this.login_page.classList.add('hidden');
};

SignInView.prototype.handleSignInSuccess_ = function(data) {
  this.classList.add('hidden');
};

SignInView.prototype.handleSignInError_ = function(data) {
  shake(this);
  this.showPage(this.login_page);
};

/**
 * Called by InputBlock when text is entered - attempts to log in.
 * @param {String} username
 */
SignInView.prototype.handleInput_ = function(username) {
  window.localStorage['signin_email'] = this.input_email.value;
  this.controller.login(this.input_email.value, this.input_password.value);
};
