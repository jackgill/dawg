# Usage

`dawg` is meant to be used as a commandline tool. The `dawg.js` file can be run from the commandline:

```bash
$ ./dawg.js
```

Per default the `dawg.js` command will look for a `docs` directory in your current working directory and serve these markdown files from a webserver
on [localhost:5678](http://localhost:5678). When the `docs` directory cannot be found an error will be shown.

## Options

The `--help` flag will display the usage and available options:

```bash
$ ./dawg.js --help
Usage: node ./dawg.js [--source|-s SOURCE] [--output|-o OUTPUT]

Options:
  --source, -s    Source directory containing chapter files. Default: ./docs
  --output, -o    Output directory. This will disable the webserver
  --serve         Serve the files instead of outputting them.
  --config, -c    Config file with parameters
  --template, -t  Template path
  --port          Port for the webserver
  --host          Host for the webserver
  --watch         Watch source files for changes
```

### source

This is the full path to the source file or directory to convert or serve.

### output

When an output path is given the converted source file(s) will be written to this directory. When only a single source file is give the output can also be a filename.

When outputting the source files the `--serve` option is disabled by default. To still serve the files as well as outputting them explicitly add the `--serve` options to the parameters:

```bash
$ ./dawg.js --output ./build --serve
```

The output option can also be used with the `--[no-]watch` option, which is disabled by default.

### [no-]serve

This option is used to explicitly enable (`--serve`) or disable (`--no-serve`) the webserver for viewing the converted source files.

### config

Full path to a configuration file containing parameters for `dawg`.

### template

The full path to the template to use for rendering the chapter(s). See the [customization chapter](03-customization.md) for more details on templating.

### [no-]watch

Enable (`--watch`) or disable (`--no-watch`) watching the source files for changes. When watch is enabled source files will be regenerated when one changes.

## Configuration

ToDo
