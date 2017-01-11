/**
 * Created by Jay Liang on 11/01/2017.
 */
var path = require('path');
var fs = require('fs');
var mkdirp = require('mkdirp');
var args = JSON.parse(JSON.stringify(process.argv));
var runArgs = args.splice(2);
var dir = __dirname;
var project = runArgs[0];
var pdir = path.join(dir, project);

var git = require('simple-git');

var tmp = require('tmp');

var tmpfolder = tmp.dirSync({ prefix: 'wego_starter_' });
//console.log('tmp folder ---> ' + tmpfolder.name);

git().outputHandler(function (command, stdout, stderr) {
    stdout.pipe(process.stdout);
    stderr.pipe(process.stderr);
}).clone('https://github.com/jayliang701/easyweb.git', path.join(tmpfolder.name, project));






