# Integration

Integrating dawg into existing and new projects is very easy. It's a matter of running it within your
projects directory structure and pointing it to your documentation file(s).

Since dawg itself is a Node.js application it is easier to integrate in other node projects. However,
if Node.js (and NPM with it) are installed on a system dawg can be used with any project that uses
markdown for it's documentation.

dawg tries to be an interchangeable tool to use for documentation. It does not introduce new or
special syntax for markdown files and by staying as close to plain markdown as possible
it is insured that files will be compatible with other systems. The only exception is GitHub
flavored markdown. This is supported but is optional. If your project is stored on an other
system that does not support GFM you can simply choose not to use it in your files to stay
compatible with plain markdown.

## Using GitHub?

Since GitHub supports markdown files it's now wonder you can read the same files
that dawg parses right from your [GitHub repository](https://github.com/mattijs/dawg/tree/master/docs).
dawg supports [GitHub Flavored Markdown](http://github.github.com/github-flavored-markdown/) so if
your project is on GitHub this additional markdown syntax will work there too.

When linking to other chapter files make sure to use relative paths and use the chapters original filename.
This will make links between chapter work with dawg and they will work fine on GitHub too.

## Adding a .dawg file

Too make it easier to view documentation for a project that uses dawg a `.dawg` file can be added to the project.
This file is automatically detected by dawg when run from the directory the `.dawg` file is in.

The `.dawg` file can be used to set up project specific parameters for dawg and uses the same parameter
names as the cli.

An example of a `.dawg` file would look something like this:
```json
{
  "source": "./documentation",
  "output": "./build",
  "serve":  true,
  "watch":  true
}
```

For more information on the configuration file see the [usage chapter](02-usage.md#configuration-file).

## Usage through NPM

dawg can be set up to run through NPM. This can be done by adding it to the `scripts` list in the
`package.json` file of a node.js project.

A sample `package.json` for _myproject_ might look like this:
```json
{
    "name": "myproject",
    "version": "1.0.0",
    "dependencies": {
        "dawg": "*"
    },
    "scripts": {
        "docs": "./node_modules/.bin/dawg"
    }
}
```

The documentation can now be run with the `npm run docs` command from the root of the project.

If the documentation needs specific configuration the cli options can be appended to the command.
An alternative is to add a `.dawg` file to your project. This file will be automatically detected
by dawg when run through NPM (or from the projects root).
