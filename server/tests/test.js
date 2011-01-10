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

function isArray(obj) {
   if (obj.constructor.toString().indexOf("Array") == -1)
      return false;
   else
      return true;
}

function areArraysEqual(array1, array2) {
   var temp = new Array();
   if ( (!array1[0]) || (!array2[0]) ) { // If either is not an array
      return false;
   }
   if (array1.length != array2.length) {
      return false;
   }
   // Put all the elements from array1 into a "tagged" array
   for (var i=0; i<array1.length; i++) {
      key = (typeof array1[i]) + "~" + array1[i];
   // Use "typeof" so a number 1 isn't equal to a string "1".
      if (temp[key]) { temp[key]++; } else { temp[key] = 1; }
   // temp[key] = # of occurrences of the value (so an element could appear multiple times)
   }
   // Go through array2 - if same tag missing in "tagged" array, not equal
   for (var i=0; i<array2.length; i++) {
      key = (typeof array2[i]) + "~" + array2[i];
      if (temp[key]) {
         if (temp[key] == 0) { return false; } else { temp[key]--; }
      // Subtract to keep track of # of appearances in array2
      } else { // Key didn't appear in array1, arrays are not equal.
         return false;
      }
   }
   // If we get to this point, then every generated key in array1 showed up the exact same
   // number of times in array2, so the arrays are equal.
   return true;
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

  for (var key in a._properties) {
    if (isArray(a[key])) {
      if (!areArraysEqual(a[key], b[key])) {
        failed = true;
        log_failed(description + " array: '" + key + "' mismatch - '" + a[key] + "' != '" + b[key] + "'");
      }
    } else if (a[key] != b[key]) {
      failed = true;
      log_failed(description + " key: '" + key + "' mismatch - '" + a[key] + "' != '" + b[key] + "'");
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