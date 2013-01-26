# Introduction

> This documentation can be viewed using dawg itself, to follow a well known mantra: `eat your own dawg food`

_dawg_ is a small tool for converting and viewing markdown documentation files, called chapters. A
simple example of this is dawg's own documentation, which lives in the docs directory of the project.
It has the following structure that produces this documentation when viewed with _dawg_:

```bash
docs
  |- 01-introduction.md
  |- 02-usage.md
  |- 03-customization.md
  |- 04-integration.md
  `- 05-development.md
```

Each file is treated as a chapter. These chapters are indexed and parsed using a markdown parser
which also supports [github flavored markdown](http://github.github.com/github-flavored-markdown/).

The numbers at the beginning of each file are meant to sort the chapters. _dawg_ does not know or
support ways to sort chapters, it uses the order on the filesystem for this.

Files can be either converted and written to an output directory or served using a webserver.
For more usage information see [the usage chapter](02-usage.md).

## Goals

The main goal is to be a **simple** tool for view your markdown documentation, either while you
are writing or when presenting it to others. It should be **customizable** to fit specific situations
but stay **interchangeable** with other systems and tools.

First of all _dawg_ should be dead **simple** to use and to get started with. It uses sensible
defaults and starts as unobtrusive as possible. _dawg_ can be run without parameters and will not
get in your way. Files are served from a default directory and you can get right to writing or
viewing your documentation.

When the default configuration is not sufficient _dawgs_ behaviour is easily **customizable**
through the commandline interface. By specifying options on the commandline you can change or
extend the default behaviour to your specific situation.

Finally _dawg_ will not impose any syntax in your documentation files. It supports plain markdown
syntax with [Github Flavored Markdown](http://github.github.com/github-flavored-markdown/) as an
optional extension. Any features that are specific to _dawg_ will be supported through the rendering layer,
not through the syntax of the documentation files. This way _dawg_ is able to work with existing documentation files
and is **interchangeable** with other systems that can display or convert markdown, like [GitHub's](https://github/com)
website or tools like [markdoc](http://markdoc.org).

## Need fancy features?

Dawg is meant to be a simple tool. If you are missing some features, or if you require more advanced
features you might consider using a more advance tool, like [Sphinx](http://sphinx-doc.org/) or [Docbook](http://www.docbook.org/).

