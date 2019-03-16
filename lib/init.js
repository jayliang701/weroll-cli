/**
 * Created by Jay on 2017/1/11.
 */
let path = require('path');
let fs = require('fs-extra');
let async = require('async');
let mkdirp = require('mkdirp');
let del = require('del');
let Listr = require('listr');
let cli = require('pixl-cli');

exports.exec = function(runArgs, done) {
    let dir = process.cwd();
    let template = runArgs[0];
    let project = runArgs[1];
    let useCNPM = false;

    if (!project) project = "";
    // if (!template) {
    //     console.error("invalid template");
    //     done && done();
    //     return;
    // }

    let ARGS = {};
    runArgs.forEach(function(val, i) {
        if (i < 2) return;
        let temp = val.split("=");
        ARGS[temp[0]] = temp[1] == undefined ? true : temp[1];
    });
    useCNPM = ARGS["--cnpm"] || false;
    useYARN = ARGS["--yarn"] || false;

    let pdir = path.join(dir, project);

    let git = require('simple-git');

    //let tmp = require('tmp');
    //tmp.setGracefulCleanup();

    let tmpRoot = path.join(pdir, ".tmp");
    let tmpfolder;

    let IGNORE_FILES = { ".git":1, ".gitignore":1, "readme":1 };

    function clearAll(callBack) {
        // console.log("clean tmp files...");
        setTimeout(function() {
            let p = [];
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

    const tasks = [
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
                        let q2 = [];
                        files.forEach(function(filename) {
                            q2.push(function(cb2) {
                                if (IGNORE_FILES[filename]) return cb2();
                                let srcFile = path.join(tmpfolder, filename);
                                let distFile = path.join(pdir, filename);
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
                let exec = require('child_process').exec;
                let cmd = "npm install";
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
    ];

    if (template) {
        tasks.splice(0, 0, {
            title: 'choose a template for creating project. \n-> ' + template,
            task: () => new Promise(resolve => {
                // resolve();
            })
        });
    } else {
        tasks.splice(0, 0, {
            title: 'choose a template for creating project.',
            task: () => new Promise(resolve => {
                cli.prompt("What is your name?", "", function(name) {
                    cli.print("Hello " + name + "!\n");
                } );
            })
        });
    }

    new Listr(tasks).run().then(() => {
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