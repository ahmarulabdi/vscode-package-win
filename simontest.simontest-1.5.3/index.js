let vscode = undefined;
try {
  vscode = require("vscode");
} catch (e) {
  // nothing
}

var fs = require("fs");
var path = require("path");
var rootDir = __dirname;
var outFolder = path.join(rootDir, "out");
var hasOut = fs.existsSync(outFolder);
exports.activate = function(context) {
  const configuration = vscode && vscode.workspace.getConfiguration();
  var useDist = !hasOut || (configuration && configuration.get("simontest.dist", false));

  return useDist
    ? require("./dist/src/extension").activate(context, rootDir)
    : require("./out/src/extension").activate(context, rootDir);
};
