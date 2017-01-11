/**
 * Created by Jay Liang on 11/01/2017.
 */
var path = require('path');
var params = require('yargs').argv;
if (params["version"] || params["v"]) {
    var pkg = require(path.join(require.main.filename.replace("index.js", ""), "package.json"));
    console.log(pkg.version);
    return process.exit();
}

var fs = require('fs-extra');
var async = require('async');
var mkdirp = require('mkdirp');
var args = JSON.parse(JSON.stringify(process.argv));

var runArgs = args.splice(2);
var dir = __dirname;
var template = runArgs[0];
var project = runArgs[1];
var pdir = path.join(dir, project);

var git = require('simple-git');

var tmp = require('tmp');

var tmpfolder = tmp.dirSync({ prefix: 'weroll_starter_' });
tmpfolder = path.join(tmpfolder.name, project);

var IGNORE_FILES = { ".git":1, ".gitignore":1, "readme":1 };

function clearAll(callBack) {
    var p = [];
    p.push(function(cb) {
        fs.unlink(tmpfolder, function() {
            cb();
        });
    });
    async.parallel(p, function() {
        callBack && callBack();
    });
}

var q = [];
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
async.waterfall(q, function(err) {
    if (err) console.error(err);
    clearAll(function() {
        process.exit();
    });
});






