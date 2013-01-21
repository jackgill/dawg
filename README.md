# dawg - Document and whatnot generator

`dawg` is a simple tool to convert one or more markdown files into HTML, nothing fancy really. The converted files can be written to disk or served through a webserver.

`dawg` is oppurtinistic software. This means that this module best in a certain scenario and that few safeguards are in place this scenario is not optimal. This will probably change in the future though.

## Install

Installation goes through [NPM](http://npmjs.org):

```
$ npm install dawg
```

## Usage

dawg has a command line interface that allows you to convert and serve or write a list of mardown files as HTML. Use `dawg.js --help` for more information:

```
$ dawg.js --help
```

The default behaviour is to serve files from the `docs` directory of your current working directory. The directory could have a structure like the docs directory of this project:

```
$ ls ./docs
  01-introduction.md
  02-usage.md
  03-customization.md
  04-integration.md
  05-development.md
```

When dawg is run on this directory the files get served on http://localhost:5678. When no chapter is specified in the
URL the first one from the list will be taken.

## Development

For instructions on how to start developing on dawg see [the development chapter](docs/05-development.md).

This is a short list of features that are planned for future releases:

- Highlighting through pygments through cli flag
- More templating options
  - Custom templates
  - Template presets
  - Remote stylesheets
  - More template helpers
- Internal server polish
  - 404 page
  - chapter index

# License

The Unlicense:

    This is free and unencumbered software released into the public domain.

    Anyone is free to copy, modify, publish, use, compile, sell, or
    distribute this software, either in source code form or as a compiled
    binary, for any purpose, commercial or non-commercial, and by any
    means.

    In jurisdictions that recognize copyright laws, the author or authors
    of this software dedicate any and all copyright interest in the
    software to the public domain. We make this dedication for the benefit
    of the public at large and to the detriment of our heirs and
    successors. We intend this dedication to be an overt act of
    relinquishment in perpetuity of all present and future rights to this
    software under copyright law.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
    EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
    MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
    IN NO EVENT SHALL THE AUTHORS BE LIABLE FOR ANY CLAIM, DAMAGES OR
    OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
    ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
    OTHER DEALINGS IN THE SOFTWARE.

    For more information, please refer to <http://unlicense.org/>

# Changelog

_v0.0.1_ (prototype)

- cli interface
- chapter conversions
- chapter serving
