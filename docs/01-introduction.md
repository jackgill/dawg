# Introduction

> This documentation can be viewed using dawg itself, to follow a well known mantra: `eat your own dawg food`

`dawg` is a small tool that can be used to convert and view documentation that consists of a set of markdown files, called chapters that live in a directory.
A great example is the directory this file is in. It has the following structure that produces this documentation through dawg:

```bash
docs
  |- 01-introduction.md
  |- 02-usage.md
  |- 03-customization.md
  |- 04-integration.md
  `- 05-development.md
```

Each file in the `docs` directory is treated as a chapter by dawg. These chapters are indexed and
parsed using a markdown parser which also supports [github flavored markdown](http://github.github.com/github-flavored-markdown/).

The numbers at the beginning of each file are meant to sort the files. Dawg does not know or support ways to sort chapters, it uses the order on the filesystem as it's guide.

Files can be either converted and written to an output directory or served using a webserver. For more usage information see [the usage chapter](02-usage.md).

## Goals

1. Simple tool
2. Chapters must stay readable through other sources, e.g. Github
3. Easy to integrate in projects
4. Customizable

## Need fancy features?

Dawg is meant to be a simple tool. If you are missing some features, or if you require more advanced
features you might consider using a more advance tool, like [Sphinx](http://sphinx-doc.org/) or [Docbook](http://www.docbook.org/).

