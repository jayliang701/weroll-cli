/**
 * Created by Jay Liang on 11/01/2017.
 */

var appRootPath = require.main.filename.replace("index.js", "");
var path = require('path');
var params = require('yargs').argv;
if (params["version"] || params["v"]) {
    var pkg = require(path.join(appRootPath, "package.json"));
    console.log(pkg.version);
    return process.exit();
}

var args = JSON.parse(JSON.stringify(process.argv));
var os = require('os');
global.osType = os.type();
global.isWin = osType.toLowerCase().indexOf('windows') >= 0;
global.runArgs = args.splice(2);

var cmd = global.runArgs.shift();

var script = require("./lib/" + cmd);
script.exec(global.runArgs, function() {
    process.exit();
});







