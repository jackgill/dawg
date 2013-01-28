# Usage

dawg is a commandline tool that is meant to as simple as possible to use and get started with.
Therefor the command can be run without any parameters:

```
$ dawg
15:12:34 - info   - dawg listening on http://127.0.0.1:5678
```

The defaults that `dawg` uses will look for a `docs` directory in your current working directory
(where you executed the command) and serve the markdown files from that directory through a webserver
on [locahost:5678](http://localhost:5678). When the `docs` directory can't be found an error will
be shown.

The behaviour of `dawg` can be changed by supplying options on the commandline. The options are
explained below.

## Installation

dawg is a [Node.js](http://nodejs.org) program so this must be installed on the system. dawg
itself can be installed through [NPM](http://npmjs.org), which comes with Node.js:

```
$ npm install -g dawg
```

The `-g` flag will install dawg globally so it's command is available system wide.

## Options

The `--help` flag will display the usage string and all available options:

```
$ dawg --help
Usage: dawg

Options:
  --config, -c  Path to a config file with parameters to load.
  --source, -s  Source path for chapter files. Default: ./docs
  --output, -o  Write converted files to this path.
  --clear       Clear the output path before converting. Default: off
  --watch       Watch source files for changes. Default: off
  --serve       Serve the converted files through a webserver. Default: on
  --port        Port for the webserver. Default: 5678
  --host        Host for the webserver. Default: 127.0.0.1
  --dev         Run in development mode. Default: off
  --quiet       Don't output logging. Default: off
```

### config

> default: ./.dawg

Full path to a configuration file containing parameters for `dawg`. The configuration file will
be read before applying any other parameters. This means that parameters specified on the
commandline will always override the parameters read from the configuration file.

The configuration file with it's options and syntax are explained below.

### source

> default: ./docs

This is the full path to the source file or directory to convert or serve.

### output

> default: off

When an output path is given the converted source file(s) will be written here. When only a single
source file is give the output can also be a filename. If a single file is given as an output path
and multiple files are found in the source path an error will be shown.

When providing an output path file serving is disabled by default. This can be re-enabled using the `--serve` option on the commandline. For example:
```
$ dawg --output ./build --serve
```

The output option can also be used with the `--watch` option. When this is enabled the source file(s)
will be converted and written to the output path every time the source is changed.

### clear

> default: off

When set the output path will be cleared before writing to it.

**WARNING**: Use with caution. This setting will delete all files in the output directory.

This option is usefull when the directory needs to be completely clear of old outputted files.

```
$ dawg -o ./build --clear
```

### watch

> default: off

Enable watching the source files for changes. This will regenerated the output when source file(s)
change.

When this option is used with the webserver the chapters will be updated once the page is refreshed,
when used with an output path the chapters will be written directly.

### serve

> default: on

This option is used to explicitly enable the webserver for viewing the converted source files. It
can be used to enable both outputting to a path and serving through a webserver:

```
$ dawg -o ./build --serve --watch
```

### port

> default: 5678

The port for the webserver to serve the converted source file(s) on.

### host

> default: 127.0.0.1 (or localhost)

The host the webserver should bind to.

### dev

> default: off

Run `dawg` in development mode. This will show debug logging and disable internal caching.

### quiet

> default: off

Do not show any logging output, even in development mode.

## Configuration file

Any option that can be set on the commandline can also be set through a configuration file. The
configuration file that should be loaded can be configured with the `--config` option. As a default
`dawg` will search for a `.dawg` file in the current working directory.

A configuration file contains a simple json object that lists each option with it's value. It uses
generic json values so options that require a value are configured as strings and options that
can be switched convert to booleans. Short options are not supported, each option must be listed
with their full name.

A customized configuration file for `dawg` might look like this:

```json
{
  "source": "./documentation",
  "output": "./build",
  "serve":  true,
  "watch":  true
}
```

The above configuration is equal to this command:

```
$ dawg --source ./documentation --output ./build --serve --watch
```

Configuration files are a feature of the `dawg` cli, it is not part of dawg's core functionality.
