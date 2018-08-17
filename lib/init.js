/**
 * Created by Jay on 2017/1/11.
 */
var path = require('path');
var fs = require('fs-extra');
var async = require('async');
var mkdirp = require('mkdirp');
var del = require('del');
var Listr = require('listr');
var commandExists = require('command-exists');

exports.exec = function(runArgs, done) {
    var dir = process.cwd();
    var template = runArgs[0];
    var project = runArgs[1];
    var useCNPM = false;

    if (!project) project = "";
    if (!template) {
        console.error("invalid template");
        done && done();
        return;
    }

    var ARGS = {};
    runArgs.forEach(function(val, i) {
        if (i < 2) return;
        var temp = val.split("=");
        ARGS[temp[0]] = temp[1] == undefined ? true : temp[1];
    });
    useCNPM = ARGS["--cnpm"] || false;
    useYARN = ARGS["--yarn"] || false;

    var pdir = path.join(dir, project);

    var git = require('simple-git');

    //var tmp = require('tmp');
    //tmp.setGracefulCleanup();

    var tmpRoot = path.join(pdir, ".tmp");
    var tmpfolder;

    var IGNORE_FILES = { ".git":1, ".gitignore":1, "readme":1 };

    function clearAll(callBack) {
        // console.log("clean tmp files...");
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

    const tasks = new Listr([
        {
            title: 'create folders',
            task: () => new Promise((resolve, reject) => {
                mkdirp(tmpRoot, function(err) {
                    if (!err) {
                        tmpfolder = path.join(tmpRoot, template + "_" + Date.now());
                        mkdirp(pdir, function(err) {
                            if (err) return reject(err);
                            resolve();
                        });
                    } else {
                        reject(err);
                    }
                });
            })
        },
        {
            title: 'download template project from Github',
            task: () => new Promise((resolve, reject) => {
                git().clone('https://github.com/jayliang701/weroll-kickstarter-' + template + '.git', tmpfolder, function(err) {
                    if (err) return reject(err);
                    //copy files
                    fs.readdir(tmpfolder, function(err, files) {
                        if (err) return reject(err);
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
                            if (err) return reject(err);
                            resolve();
                        });
                    });
                });
            })
        },
        {
            title: `install dependencies (${useYARN ? 'yarn' : (useCNPM ? 'cnpm' : 'npm')})`,
            task: () => new Promise((resolve, reject) => {
                var exec = require('child_process').exec;
                var cmd = "npm install";
                if (useCNPM) {
                    cmd += " --registry=https://registry.npm.taobao.org";
                } else if (useYARN) {
                    cmd = "yarn install";
                }
                exec(cmd, { cwd: pdir }, (err, stdout, stderr) => {
                    if (err)  return reject(err);
                    // stdout && console.log(stdout);
                    // stderr && console.error(stderr);
                    // if (stderr)  return reject(stderr);
                    resolve();
                });
            })
        },
        {
            title: 'clean and completed',
            task: () => new Promise((resolve) => {
                clearAll(function() {
                    resolve();
                });
            })
        }
    ]);

    tasks.run().then(() => {
        setTimeout(() => {
            console.log("init weroll kickstarter successfully.");
            console.log("enter project folder and run: ");
            const boxen = require('boxen');
            console.log(boxen('npm run dev', { padding: 1, borderStyle: 'classic' }));
            console.log("Let's roll!");
        }, 100);
    }).catch(err => {
        console.error(err);
    });
}