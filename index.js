/**
 * Created by Jay Liang on 11/01/2017.
 */

let args = JSON.parse(JSON.stringify(process.argv));
let os = require('os');
global.osType = os.type();
global.isWin = osType.toLowerCase().indexOf('windows') >= 0;
global.runArgs = args.splice(2);
let appRootPath = require.main.filename;
appRootPath = appRootPath.substring(0, appRootPath.lastIndexOf(global.isWin ? "\\" : "/"));
global.appRootPath = appRootPath;
let path = require('path');
let params = require('yargs').argv;
if (params["version"] || params["v"]) {
    let pkg = require(path.join(appRootPath, "package.json"));
    console.log(pkg.version);
    return process.exit();
}

let cmd = global.runArgs.shift();

let script = require("./lib/" + cmd);
script.exec(global.runArgs, function() {
    process.exit();
});







