'use strict';

var walker = require('walker');
var anymatch = require('anymatch');
var minimatch = require('minimatch');
var path = require('path');
var platform = require('os').platform();

/**
 * Constants
 */

exports.DEFAULT_DELAY = 100;
exports.CHANGE_EVENT = 'change';
exports.DELETE_EVENT = 'delete';
exports.ADD_EVENT = 'add';
exports.ALL_EVENT = 'all';

/**
 * Assigns options to the watcher.
 *
 * @param {NodeWatcher|PollWatcher|WatchmanWatcher} watcher
 * @param {?object} opts
 * @return {boolean}
 * @public
 */

exports.assignOptions = function(watcher, opts) {
  opts = opts || {};
  watcher.globs = opts.glob || [];
  watcher.dot = opts.dot || false;
  watcher.ignored = opts.ignored || false;

  if (!Array.isArray(watcher.globs)) {
    watcher.globs = [watcher.globs];
  }
  watcher.hasIgnore =
    Boolean(opts.ignored) && !(Array.isArray(opts) && opts.length > 0);
  watcher.doIgnore = opts.ignored
    ? anymatch(opts.ignored)
    : function() {
        return false;
      };
  return opts;
};

/**
 * Checks a file relative path against the globs array.
 *
 * @param {array} globs
 * @param {string} relativePath
 * @return {boolean}
 * @public
 */

exports.isFileIncluded = function(globs, dot, doIgnore, relativePath) {
  var matched;
  if (globs.length) {
    for (var i = 0; i < globs.length; i++) {
      if (
        minimatch(relativePath, globs[i], { dot: dot }) &&
        !doIgnore(relativePath)
      ) {
        matched = true;
        break;
      }
    }
  } else {
    // Make sure we honor the dot option if even we're not using globs.
    matched =
      (dot || minimatch(relativePath, '**/*')) && !doIgnore(relativePath);
  }
  return matched;
};

/**
 * Traverse a directory recursively calling `callback` on every directory.
 *
 * @param {string} dir
 * @param {function} dirCallback
 * @param {function} fileCallback
 * @param {function} endCallback
 * @param {*} ignored
 * @public
 */

exports.recReaddir = function(
  dir,
  dirCallback,
  fileCallback,
  endCallback,
  errorCallback,
  ignored
) {
  walker(dir)
    .filterDir(function(currentDir) {
      return !anymatch(ignored, currentDir);
    })
    .on('dir', normalizeProxy(dirCallback))
    .on('file', normalizeProxy(fileCallback))
    .on('error', errorCallback)
    .on('end', function() {
      if (platform === 'win32') {
        setTimeout(endCallback, 1000);
      } else {
        endCallback();
      }
    });
};

/**
 * Returns a callback that when called will normalize a path and call the
 * original callback
 *
 * @param {function} callback
 * @return {function}
 * @private
 */

function normalizeProxy(callback) {
  return function(filepath, stats) {
    return callback(path.normalize(filepath), stats);
  };
}
