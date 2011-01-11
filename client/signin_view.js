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
  this.controller.addListener('logout', this.handleLogout_.bind(this));

  this.menu_create = createElement('div', 'subitem', this);
  this.menu_create.innerText = "or create an account...";
  this.menu_create.addEventListener('click', (function() {
    this.showPage(this.create_page);
  }).bind(this));

  this.menu_signin = createElement('div', 'subitem', this);
  this.menu_signin.innerText = "or sign in...";
  this.menu_signin.addEventListener('click', (function() {
    this.showPage(this.login_page);
  }).bind(this));

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
  this.input_password.addListener('submit', this.handleLogin_.bind(this));

  this.input_login = createElement('input', 'signin-button');
  this.input_login.type = 'button';
  this.input_login.value = 'Sign in';
  this.input_login.addEventListener('click', this.handleLogin_.bind(this));

  this.login_page.appendChild(this.input_email);
  this.login_page.appendChild(this.input_password);
  this.login_page.appendChild(this.input_login);

  this.create_page = createElement('div', 'page-create', this);
  this.input_create_email = new InputField('');
  this.input_create_email.setPlaceholder('email');
  this.input_create_email.name = 'email';

  this.input_create_password = new InputField('');
  this.input_create_password.setType('password');
  this.input_create_password.setPlaceholder('password');
  this.input_create_password.name = 'password';

  this.input_create_password2 = new InputField('');
  this.input_create_password2.setType('password');
  this.input_create_password2.setPlaceholder('password');
  this.input_create_password2.name = 'password';
  this.input_create_password2.addListener('submit', this.handleCreate_.bind(this));

  this.input_create = createElement('input', 'signin-button');
  this.input_create.type = 'button';
  this.input_create.value = 'Create account';
  this.input_create.addEventListener('click', this.handleCreate_.bind(this));

  this.create_page.appendChild(this.input_create_email);
  this.create_page.appendChild(this.input_create_password);
  this.create_page.appendChild(this.input_create_password2);
  this.create_page.appendChild(this.input_create);
  
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

  if (this.login_page == page) {
    this.menu_create.classList.remove('hidden');
    this.login_page.classList.remove('hidden')
  } else {
    this.menu_create.classList.add('hidden');
    this.login_page.classList.add('hidden');
  }

  if (this.create_page == page) {
    this.menu_signin.classList.remove('hidden');
    this.create_page.classList.remove('hidden');
  } else {
    this.menu_signin.classList.add('hidden');
    this.create_page.classList.add('hidden');
  }
};

SignInView.prototype.handleMenuCreateClicked = function() {
  this.showPage(this.create_page);
};

SignInView.prototype.handleSignInSuccess_ = function(data) {
  this.classList.add('hidden');
};

SignInView.prototype.handleLogout_ = function() {
  this.input_password.value = '';
  this.input_create_password.value = '';
  this.input_create_password2.value = '';
  this.showPage(this.login_page);
  this.classList.remove('hidden');
};

SignInView.prototype.handleSignInError_ = function(data) {
  shake(this);
  this.showPage(this.login_page);
};

/**
 * Called by InputBlock when text is entered - attempts to log in.
 * @param {String} username
 */
SignInView.prototype.handleLogin_ = function(username) {
  if (!this.input_email.value || !this.input_password.value) {
    shake(this);
    return;
  }
  
  window.localStorage['signin_email'] = this.input_email.value;
  this.controller.login(this.input_email.value, this.input_password.value);
};


/**
 * Called by InputBlock when text is entered - attempts to log in.
 * @param {String} username
 */
SignInView.prototype.handleCreate_ = function(username) {
  if (!this.input_create_email.value || !this.input_create_password.value) {
    shake(this);
    return;
  }
  
  if (this.input_create_password.value != this.input_create_password2.value) {
    shake(this);
    return;
  }
  window.localStorage['signin_email'] = this.input_create_email.value;
  this.controller.create(this.input_create_email.value, this.input_create_password.value);
};
