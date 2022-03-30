/*global require, exports */

(function () {
    "use strict";

    var child_process = require("child_process"),
        fs = require("fs"),
        domainNameBuild = "builder.execute",
        isWin = /^win/.test(process.platform),
        isMac = (process.platform == 'darwin') ? true : false;

    function exec(directory, command, callback) {
        child_process.exec(command, {
            cwd: directory,
            shell: (isMac) ? '/bin/bash' : (isWin) ? 'cmd.exe' : '/bin/sh'
        }, function (err, stdout, stderr) {
            callback(err ? stderr : undefined, err ? undefined : stdout);
        });
    }

    //save framework configuration updates
    function save(filePath, content, callback) {
        fs.exists(filePath, function (exists) {
            if (exists === true) {
                fs.writeFile(filePath, JSON.stringify(content), function (err) {
                    callback({
                        'message': (err) ? err : 'done.'
                    });
                });
            }
        });
    };

    exports.init = function (DomainManager) {
        if (!DomainManager.hasDomain(domainNameBuild)) {
            DomainManager.registerDomain(domainNameBuild, {
                major: 0,
                minor: 1
            });
        }

        DomainManager.registerCommand(domainNameBuild, "exec", exec, true, "Exec cmd", [
            {
                name: "directory",
                type: "string"
            },
            {
                name: "command",
                type: "Array"
            }
        ], [
            {
                name: "stdout",
                type: "string"
            }
        ]);

        DomainManager.registerCommand(domainNameBuild, "save", save, true, "Save cmd", [
            {
                name: "filePath",
                type: "string"
            }
        ], [
            {
                name: "res",
                type: "string"
            }
        ]);
    };

}());