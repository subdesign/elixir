var fs = require('fs');
var gulp = require('gulp');
var babel = require('gulp-babel');
var merge = require('merge-stream');
var utilities = require('./Utilities');
var plugins = require('gulp-load-plugins')();
var config = require('laravel-elixir').config;


/**
 * Delete the merged file from the previous run.
 *
 * @param {string} path
 */
var deletePreviouslyMergedFile = function(path) {
    if (fs.existsSync(path)) {
        fs.unlinkSync(path);
    }
};


/**
 * Figure out which files should be watched, and re-merged.
 *
 * @param {object} request
 */
var getFilesToWatch = function(request) {
    var alreadyWatched = config.watchers.default[request.taskName];

    return alreadyWatched ? alreadyWatched.concat(request.files) : request.files;
};


/**
 * Create the Gulp task.
 *
 * @param {object} request
 */
var buildTask = function(request) {
    var task = request.taskName;
    var toConcat = config.concatenate[request.type];

    // So that we may call the styles and scripts methods as
    // often as we want, we need to store every request.
    toConcat.push(request);

    gulp.task(task, function() {
        // And then we'll simply loop over that stored list, and
        // for each one, trigger Gulp. To keep from crossing
        // the streams, we'll use the merge-stream plugin.
        return merge.apply(this, toConcat.map(mergeFileSet));
    });

    return config
      .registerWatcher(task, getFilesToWatch(request))
      .queueTask(task);
};


/**
 * Log the task to the console.
 *
 * @param {string|array} files
 */
var logTask = function(files) {
  var message = "Merging";

  if (config.production) {
      message += " and Minifying";
  }

  utilities.logTask(message, files);
};


/**
 * Use Gulp to handle a request to merge files.
 *
 * @param  {object} request
 */
var mergeFileSet = function (request) {
    deletePreviouslyMergedFile(request.outputDir + '/' + request.concatFileName);

    logTask(request.files);

    var shouldCompile = function() {
        return request.taskName === 'scripts' && request.hasOwnProperty('babel');
    };

    return gulp.src(request.files)
               .pipe(plugins.if(config.sourcemaps, plugins.sourcemaps.init()))
               .pipe(plugins.concat(request.concatFileName))
               .pipe(plugins.if(shouldCompile(), babel(request.babel)))
               .pipe(plugins.if(config.production, request.minifier.call(this)))
               .pipe(plugins.if(config.sourcemaps, plugins.sourcemaps.write('.')))
               .pipe(gulp.dest(request.outputDir));
};


module.exports = function(request) {
    return buildTask(request);
};
