/*jslint plusplus: true, vars: true, nomen: true */
/*global define, brackets, console, setTimeout */

define(function (require, exports, module) {
    "use strict";

    var menuId = "extensions.bsb.build";

    var AppInit = brackets.getModule("utils/AppInit"),
        CommandManager = brackets.getModule("command/CommandManager"),
        Menus = brackets.getModule("command/Menus"),
        NodeConnection = brackets.getModule("utils/NodeConnection"),
        ExtensionUtils = brackets.getModule("utils/ExtensionUtils"),
        DocumentManager = brackets.getModule("document/DocumentManager"),
        KeyBindingManager = brackets.getModule('command/KeyBindingManager'),
        FileUtils = brackets.getModule("file/FileUtils"),
        PanelManager = brackets.getModule("view/PanelManager"),
        Dialogs = brackets.getModule("widgets/Dialogs"),
        PopUpManager = brackets.getModule("widgets/PopUpManager"),
        nodeConnection = new NodeConnection(),
        domainPath = ExtensionUtils.getModulePath(module) + "domain";

    var curOpenDir,
        curOpenFile,
        curOpenFileName,
        curOpenLang;

    var builders = JSON.parse(require('text!builder.json')),
        frameworks = JSON.parse(require('text!framework.json')),
        panel,
        popUp,
        panelHTML = require('text!brackets-builder-panel.html'),
        inputItem = require('text!brackets-builder-template-input.html'),
        outputItem = require('text!brackets-builder-template-output.html'),
        popUpHTML = require('text!brackets-builder-template-popup.html'),
        panelIsVisible = false,
        framework = "";

    function parseCommand(command) {
        return command
            .replace(/\$PATH/g, curOpenDir)
            .replace(/\$FULL_FILE/g, curOpenFile)
            .replace(/\$BASE_FILE/g, baseName(curOpenFileName))
            .replace(/\$FILE/g, curOpenFileName);
    }

    function processCmdOutput(data) {
        data = JSON.stringify(data);
        data = data
            .replace(/\"/g, '')
            .replace(/\\r/g, '\r')
            .replace(/\\t/g, '\t')
            .replace(/\\n/g, '\n')
            .replace(/\\n/g, '\n');
        return data;
    }

    function baseName(str) {
        var base = new String(str).substring(str.lastIndexOf('/') + 1);
        if (base.lastIndexOf(".") != -1)
            base = base.substring(0, base.lastIndexOf("."));
        return base;
    }

    function securePath(path) {
        if (path.indexOf(' ') == -1) {
            return path;
        } else {
            return '"' + path + '"';
        }
    }

    function executeAction(action) {
        CommandManager.execute("file.saveAll")
        $('#builder-panel .builder-content').html('');

        curOpenDir = securePath(DocumentManager.getCurrentDocument().file._parentPath);
        curOpenFile = securePath(DocumentManager.getCurrentDocument().file._path);
        curOpenFileName = securePath(DocumentManager.getCurrentDocument().file._name);
        curOpenLang = securePath(DocumentManager.getCurrentDocument().language._name);

        nodeConnection.connect(true).fail(function (err) {
            console.error("[[Brackets Builder]] Cannot connect to node: ", err);
        }).then(function () {
            console.log('Building ' + curOpenLang + ' in ' + curOpenFile + '...\n');

            return nodeConnection.loadDomains([domainPath], true).fail(function (err) {
                console.error("[[Brackets Builder]] Cannot register domain: ", err);
            });
        }).then(function () {
            var cmd = null;
            var foundLanguage = false;

            if (!framework.length) {
                builders.forEach(function (el) {
                    if (el.name.toLowerCase() === curOpenLang.toLowerCase()) {
                        foundLanguage = true;
                        cmd = el[action];
                    }
                });
            } else {
                frameworks.forEach(function (el) {
                    if (el.code === framework) {
                        foundLanguage = true;
                        cmd = el[action];
                    }
                });
            }

            if (cmd == null || foundLanguage == false) {
                if (foundLanguage) {
                    Dialogs.showModalDialog(
                        '',
                        'Brackets Builder Extention',
                        'It is very possible that this operation is not possible for current type of file.'
                    );
                } else {
                    Dialogs.showModalDialog(
                        '',
                        'Brackets Builder Extention',
                        ' run configuration for current file type. Go to Edit > Script Builder Configuration and add one.'
                    );
                }
            } else {
                var start = new Date(),
                    execute = function (callback) {
                        nodeConnection.domains["builder.execute"].exec(curOpenDir, cmd).fail(function (err) {
                            $('#builder-panel .builder-content').html(processCmdOutput(err));
                        }).then(function (data) {
                            function buildRuntimeStatus(start) {
                                var duration = (new Date().getTime() - start.getTime()) / 1000;
                                return 'Finished in <b>' + duration + '</b>s';
                            }
                            callback(data, buildRuntimeStatus(start));
                        });
                    };
                //show panel
                panel.show();
                cmd = parseCommand(cmd);
                //add comand line input
                $('#builder-panel .command').html(inputItem);
                $('#builder-panel .command .text:first').html(cmd);
                $('#builder-panel .command .status:first').after('<br />');
                $('#builder-panel .command input[name=opts]:first').keypress(function (e) {
                    if (e.keyCode == 13) {
                        var opts = $(this).val();
                        //parse options, consider space as separator
                        cmd += ' ' + opts;
                        $('#builder-panel .command').append(outputItem);
                        $('#builder-panel .command .text:last').html(cmd);
                        $('#builder-panel .command .status:last').html("Running...");

                        execute(function (data, time) {
                            $('#builder-panel .builder-content').html(time);
                            $('#builder-panel .command .status:last').html(data);
                        });
                    }
                });
            }
        }).done();
    }

    //save list if it has been changed
    function closePopUp() {
        if (($('#framework-list option').length - 1) < frameworks.length) {
            nodeConnection.connect(true).fail(function (err) {
                console.error("[[Brackets Builder]] Cannot connect to node: ", err);
            }).then(function () {
                console.log('Saving framework list...\n');

                return nodeConnection.loadDomains([domainPath], true).fail(function (err) {
                    console.error("[[Brackets Builder]] Cannot register domain: ", err);
                });
            }).then(function () {
                nodeConnection.domains["builder.execute"].save('framework.json', frameworks, function (res) {
                    if (typeof res === 'object') {
                        if (res.message !== 'done.') {
                            Dialogs.showModalDialog(
                                '',
                                'Brackets Builder Extention',
                                res.message
                            );
                        }
                    }
                    $('#framework-list option').remove();
                });
            });
        }
    }

    function chooseFramework() {
        //show pop-up
        popUp = Dialogs.showModalDialogUsingTemplate(popUpHTML, false);
        $("#add-framework").hide('fast');
        //PopUpManager.addPopUp($(popUpHTML), closePopUp, false);
        //set the select
        frameworks.forEach(function (el) {
            $("#framework-list").append('<option value="' + el.code + '">' + el.name + '</option>');
        });

        //add click handler on button#confirm
        $("#confirm").click(function (e) {
            //ensure that nobody will annoy us
            e.preventDefault();
            //set framework to execute
            framework = $("#framework-list option:selected").val();
            //close the pop-up
            closePopUp();
            popUp.close();
        });
        //add click handler on button#cancel
        $("#cancel").click(function (e) {
            //stop propagation here
            e.preventDefault();
            //close pop up
            popUp.close();
        });
        //add click handler on button#add
        $("#add").click(function (e) {
            //no e.preventDefault(); because we are double binding the button
            //hide framework select, display form
            $("#choose-framework").hide('fast', function () {
                $("#add-framework").show('fast', function () {
                    $("#add").html('save');

                    $("#add").click(function (e) {
                        //stop propagation here
                        e.preventDefault();
                        //check params
                        var checker = function (obj, err) {
                            if ($(obj).length) {
                                if ($(obj).val().length) {
                                    return true;
                                } else {
                                    Dialogs.showModalDialog(
                                        '',
                                        'Brackets Builder Extention',
                                        err
                                    );
                                    closePopUp();
                                    popUp.close();
                                }
                            }
                        };
                        //add object to framework list
                        frameworks.push({
                            'code': (checker($('#code'), 'The code must be defined')) ? $('#code').val().replace(/ /g, ' ') : '',
                            'name': (checker($('#name'), 'The name must be defined')) ? $('#name').val() : '',
                            'env': $('#env').val(),
                            'run': (checker($('#run'), 'The run command line must be defined')) ? $('#run').val() : ''
                        });
                        closePopUp();
                        popUp.close();
                    });
                });
            });
        });
    }

    function runEnvironment() {
        executeAction('env');
    }

    function compile() {
        executeAction('compile');
    }

    function run() {
        executeAction('run');
    }

    function runCompiled() {
        executeAction('runCompiled');
    }

    AppInit.appReady(function () {
        panel = PanelManager.createBottomPanel("brackets-builder-panel", $(panelHTML), 100);
        $('#builder-panel .close').on('click', function () {
            panel.hide();
        });

        //add button for framework choice
        CommandManager.register('Choose a framework', 'builder.chooseFramework', chooseFramework);

        CommandManager.register('Run environment', 'builder.runEnvironment', runEnvironment);
        CommandManager.register('Run', 'builder.run', run);
        CommandManager.register('Compile', 'builder.compile', compile);
        CommandManager.register('Run compiled', 'builder.runCompiled', runCompiled);

        Menus.addMenu("Build", menuId, Menus.AFTER, Menus.AppMenuBar.NAVIGATE_MENU);
        var menu = Menus.getMenu(menuId);
        menu.addMenuItem("builder.chooseFramework", "Alt-F12", Menus.BEFORE, 'builder.chooseFramework');
        menu.addMenuItem("builder.runEnvironment", "Alt-F8", Menus.BEFORE, 'builder.runEnvironment');
        menu.addMenuItem("builder.run", "Alt-F1", Menus.BEFORE, 'builder.run');
        menu.addMenuItem("builder.compile", "F10", Menus.BEFORE, 'builder.compile');
        menu.addMenuItem("builder.runCompiled", "F11", Menus.BEFORE, 'builder.runCompiled');

        // Add menu item to edit .json file
        var menu = Menus.getMenu(Menus.AppMenuBar.EDIT_MENU);

        menu.addMenuDivider();
        // Create menu item that opens the config .json-file
        CommandManager.register("Script Builder Configuration", 'builder.open-conf', function () {
            Dialogs.showModalDialog('', 'Brackets Builder Extention', 'You must restart Brackets after changing this file.');
            var src = FileUtils.getNativeModuleDirectoryPath(module) + "/builder.json";

            DocumentManager.getDocumentForPath(src).done(
                function (doc) {
                    DocumentManager.setCurrentDocument(doc);
                }
            );
        });

        menu.addMenuItem('builder.open-conf');

        // Load panel css
        ExtensionUtils.loadStyleSheet(module, "brackets-builder.css");
    });

});