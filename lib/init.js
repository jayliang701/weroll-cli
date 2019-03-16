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

const TEMPLATES = [
    [ "No", "Name", "Description", "Requirement" ],
    [ "1", "mini", "最精简的weroll模板项目，只有View和API示例的简单示例，没有数据库操作和Ecosystem示例", "^node v7.0|async/await" ],
    [ "2", "website", "网站模板项目，提供了用户账户注册、登录/登出，使用数据库创建用户数据，登录会话管理的示例", "^node v7.0|async/await"]
];

const findTemplate = (noOrName) => {
    for (let i = 1; i < TEMPLATES.length; i ++) {
        if (TEMPLATES[i][0] == noOrName || TEMPLATES[i][1] == noOrName) return TEMPLATES[i][1];
    }
    return null;
}

exports.exec = function(runArgs, done) {
    let dir = process.cwd();
    let template = runArgs[0] || "";
    let project = runArgs[1] || "";
    if (project.startsWith("-")) {
        project = runArgs[0] || "";
        template = null;
    }
    let useCNPM = false, useYARN = false;

    let ARGS = {};
    runArgs.forEach(function(val, i) {
        if (val.startsWith("-")) {
            let temp = val.split("=");
            ARGS[temp[0]] = temp[1] == undefined ? true : temp[1];
        }
    });
    useCNPM = ARGS["--cnpm"] || false;
    useYARN = ARGS["--yarn"] || false;

    let pdir = path.join(dir, project);

    let git = require('simple-git');

    //let tmp = require('tmp');
    //tmp.setGracefulCleanup();

    let tmpRoot = path.join(pdir, ".tmp");
    let tmpfolder;

    let IGNORE_FILES = { ".git":1, ".gitignore":1, "readme":1, "yarn.lock":1 };

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

    let run = () => {

        const tasks = [
            {
                title: 'choose a template for creating project ---> ' + template,
                task: () => new Promise(resolve => {
                    resolve();
                })
            },
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

    let chooseTemplate = (callBack) => {
        cli.prompt("Which template your want to use?\n" + cli.table([...TEMPLATES]) + "\nchoose > ", "", (noOrName) => {
            // cli.print("Hello " + name + "!\n");
            template = findTemplate(noOrName);
            if (!template) {
                cli.warn("Invalid template choose. Please input the correct No or Name.\n");
                return setTimeout(() => {
                    chooseTemplate();
                }, 1000);
            }
            callBack && callBack();
        } );
    }

    if (!template) {
        chooseTemplate(() => run());
    } else {
        run();
    }
    
}