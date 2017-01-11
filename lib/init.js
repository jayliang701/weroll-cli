/**
 * Created by Jay on 2017/1/11.
 */
var path = require('path');
var fs = require('fs-extra');
var async = require('async');
var mkdirp = require('mkdirp');
var del = require('del');
var commandExists = require('command-exists');

exports.exec = function(runArgs, done) {
    var dir = process.cwd();
    var template = runArgs[0];
    var project = runArgs[1];
    if (!project) project = "";
    if (!template) {
        console.error("invalid template");
        done && done();
        return;
    }

    var pdir = path.join(dir, project);

    var git = require('simple-git');

    //var tmp = require('tmp');
    //tmp.setGracefulCleanup();

    var tmpRoot = path.join(pdir, ".tmp");
    var tmpfolder;

    var IGNORE_FILES = { ".git":1, ".gitignore":1, "readme":1 };

    function clearAll(callBack) {
        console.log("clean tmp files...");
        setTimeout(function() {
            var p = [];
            p.push(function(cb) {
                del([ tmpRoot ], { force: true} ).then(function() {
                    cb();
                }).catch(function(err) {
                    console.error(err);
                    cb();
                });
            });
            async.parallel(p, function() {
                callBack && callBack();
            });
        }, 200);
    }
    var tmpClean;
    var q = [];
    q.push(function(cb) {
        cb(null);
    });
    q.push(function(cb) {
        mkdirp(tmpRoot, function(err) {
            if (!err) tmpfolder = path.join(tmpRoot, template + "_" + Date.now());
            cb(err);
        });
    });
    /*
     q.push(function(cb) {
     tmp.dir({ mode: 0750, prefix: 'weroll_starter_' }, function(err, path, fd, cleanupCallback) {
     tmpfolder = path;
     tmpClean = cleanupCallback;
     cb(err);
     });
     });
     */
    q.push(function(cb) {
        mkdirp(pdir, function(err) {
            cb(err);
        });
    });
    q.push(function(cb) {
        git().outputHandler(function(command, stdout, stderr) {
            stdout.pipe(process.stdout);
            stderr.pipe(process.stderr);
        }).clone('https://github.com/jayliang701/weroll-kickstarter-' + template + '.git', tmpfolder, function(err) {
            cb(err);
        });
    });
    q.push(function(cb) {
        //copy files
        fs.readdir(tmpfolder, function(err, files) {
            if (err) {
                cb(err);
                return;
            }
            var q2 = [];
            files.forEach(function(filename) {
                q2.push(function(cb2) {
                    if (IGNORE_FILES[filename]) return cb2();
                    var srcFile = path.join(tmpfolder, filename);
                    var distFile = path.join(pdir, filename);
                    fs.copy(srcFile, distFile, function (err) {
                        cb2(err);
                    })
                });
            });
            async.waterfall(q2, function(err) {
                cb(err);
            });
        });
    });
    q.push(function(cb) {
        //npm init
        var cmd = "npm";
        commandExists("cnpm", function(err, exists) {
            if (exists) {
                cmd = "cnpm";
            }
            cb(null, cmd);
        });
    });
    q.push(function(cmd, cb) {
        var exec = require('child_process').exec;
        console.log("execute command: " + cmd + " install");
        exec(cmd + " install", (err, stdout, stderr) => {
            if (err) {
                console.error(`exec error: ${err}`);
                cb(err);
                return;
            }
            stdout && console.log(stdout);
            stderr && console.error(stderr);
            cb();
        });
    });
    async.waterfall(q, function(err) {
        if (err) console.error(err);
        clearAll(function() {
            if (!err) console.log("init weroll kickstarter successfully. Let's roll!");
            done && done();
        });
    });
}