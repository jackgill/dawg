# dawg - Document and whatnot generator

dawg is a simple tool to convert one or more markdown files into HTML, nothing fancy really.
The converted files can be written to disk or served through a webserver.

dawg is easy to use and integrate into your project an will not get in your way. It supports
plain markdown and GitHub flavored markdown, and it compatible with documentation stored in a
GitHub repository.

For more information see the [introduction chapter](docs/01-introduction.md).

## Install

Installation goes through [NPM](http://npmjs.org):

```
$ npm install dawg
```

## Usage

dawg has a command line interface that allows you to convert and serve or write a list of mardown
files as HTML. Use `dawg --help` for more information:

The default behaviour is to serve files from the `docs` directory of your current working directory.
The directory could have a structure like the docs directory of this project:

```
$ ls ./docs
  01-introduction.md
  02-usage.md
  03-integration.md
```

When dawg is run on this directory the files get served on http://localhost:5678.

For a complete overview of the available options and how to use them see the [usage chapter](./docs/02-usage.md).

## Development

This is a short list of features that are planned for future releases:

- Highlighting through pygments (optional)
- HTML header id's for quick jumping
- Support for emoji icons
- More templating options
  - Custom templates
  - Template presets
  - Remote stylesheets
  - More template helpers
- Internal server polish
  - use a middleware solution
  - 404 page
  - chapter index

If you want to help out, make a fork an start working an issue or one on of the features. Try to stay
as close as possible to the existing coding style.

Some features are more complex than others. If you need some help with or explanation of the project
I'm usually in #node.js on freenode under mattijs. O, and I'm in GMT +1, online during the day.

# License

[The Unlicense](http://unlicense.org):

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

_v0.1.0_

- new cli options
- file watching
- documentation
- code separated in modules
- better logging

_v0.0.1_ (prototype)

- cli interface
- chapter conversions
- chapter serving
