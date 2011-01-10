exports.start = start;
exports.log = log;
exports.log_passed = log_passed;
exports.begin_test = begin_test;
exports.assert_true = assert_true;
exports.assert_equal = assert_equal;
exports.assert_models_equal = assert_models_equal;
exports.assert_objects_equal = assert_objects_equal;
exports.assert_close = assert_close;
exports.end = end;

// Tester.
var name_;
var errors_ = 0;

function start(name) {
  name_ = name;
  log("");
  log("**********************************************************************");
  log("\033[1;33mSTARTING\033[m: " + name);
}

function log(text) {
  console.log(text);
}

function log_failed(msg) {
  errors_++;
  log("\033[31mFAILED\033[m: " + msg);
}

function log_passed(msg) {
  log("\033[32mPASSED\033[m: " + msg);
}

function begin_test(title) {
  log("----------------------------------------------------------------------");
  log("\033[1;33mTESTING\033[m: " + title);
}

function assert_true(a, description) {
  if (!a) {
    log_failed(description + " not true");
  } else {
    log_passed(description);
  }
}

function assert_models_equal(a, b, description) {
  var failed = false;

  if (typeof a != typeof b) {
    failed = true;
    log_failed(description + " basic types don't match");
    return;
  }

  if (a.type != b.type) {
    failed = true;
    log_failed(description + " types don't match");
  }

  if (a._properties.length != b._properties.length) {
    failed = true;
    log_failed(description + " properties don't match");
  }

  for (var i = 0, key; key = a._properties[i]; i++) {
    if (a[key] != b[key]) {
      failed = true;
      log_failed(description + " key:" + key + " mismatch - " + a[key] + " != " + b[key]);
    }
  }

  if (!failed)
    log_passed(description);
};

function assert_equal(a, b, description) {
  if (a != b) {
    log_failed(description + " (" + a + ' != ' + b + ")");
    return;
  }
  log_passed(description);
}

function assert_objects_equal(a, b, description) {
  var id_count_a = 0;
  var id_count_b = 0;
  var failed = false;

  for (var id in a) {
    if (a[id] != b[id]) {
      if (typeof a[id] == 'object') {
        assert_objects_equal(a[id], b[id], description + " a." + id + " > ");
      } else if (typeof a[id] != 'function') {
        log_failed(description + ": a." + id + "("+a[id]+") != b." + id + "("+b[id]+")");
        failed = true;
      }
    } else {
      log_passed(description + ": a." + id + " = b." + id);
    }
    id_count_a++;
  }
  for (var id in b) {
    id_count_b++;
  }
  if (id_count_a != id_count_b) {
    log_failed(description + " id counts different");
    failed = true;
  }

  if (!failed)
    log_passed(description);
}

function assert_close(margin, a, b, description) {
  if (a < b - margin || a > b + margin) {
    log_failed(description + " (" + a + ' !~= ' + b + ")");
    return;
  }
  log_passed(description);
}

function end() {
  log("\n======================================================================");
  log("Test Summary: " + errors_ + " errors");
}