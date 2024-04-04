brackets-mybuilder
=======================
Brackets Mybuilder

Allows to run programs contained in one file (can be used for Go, C, C++, C#, Scala, Java, Python, Ruby, Node, C++, PHP, Bash) from Brackets and display results in panel.
It is possible to create own build systems via 'Edit > Script Builder Configuration' menu item and editing opened JSON file (you need to restart Brackets afterwards). 

通过此扩展, 您可以在Brackets中运行构建程序(例如运行 Go, C, C++, C#, Scala, Java, Python, Ruby, Node, C++, PHP, Bash 等单文件代码), 并在控制台中显示结果。您也可以通过“编辑>编辑生成器”菜单项编辑JSON文件(修改后需要重新启动Brackets)以创建自定义的构建系统。

Based on Brackets Script Builder (https://github.com/ghaxx/brackets-script-builder). 

Keyboard shortcuts: 
 * F4 to show the dialog for framework choice / add.
 * Ctrl+F4 to launch the environment.
 * Ctrl+I to run current file as a script. 
 * Ctrl+Shift+I to compile current file. 
 * Ctrl+Alt+I to run compilation result. 
 

***

## Changelog

- Update console logic.
  - Support quotes in output text.
  - Improve JSON output.
  - Word wrap output.
  - Make text selectable.
- Add new builder.json environment variable ($PROJ_ROOT).
- Add PHP to builder config.
- Add Bash to builder config.
- Lint code.
  - Include .jslintrc file.
- Remove menu error.
- Replace deprecated Brackets method.
- Add new 'tack' button to panel.
  - Tack on = Hide panel on file change (default setting).
  - Tack off = Keep panel open on file change.
- Change F11 keyboard shortcut to Shift-F10 (for better OS X compatibility).

## Environment Variables

- $PATH = The current files directory.当前文件目录
- $PROJ_ROOT = The current projects root directory. 当前项目的根目录
- $FILE = The current files name (including extension). 当前文件名(包括扩展名)
- $BASE_FILE = The current files name (excluding extension). 当前文件名(不包括扩展名)
- $FULL_FILE = The current files full path (including extension). 当前文件的完整路径(包括扩展名)

## Stargazers over time
[![Stargazers over time](https://starchart.cc/caarlos0/starcharts.svg?variant=adaptive)](https://starchart.cc/caarlos0/starcharts)
