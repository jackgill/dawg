#!/usr/bin/env node

var fs     = require('fs'),
    path   = require('path'),
    _      = require('underscore'),
    handlebars = require('handlebars'),
    marked = require('marked'),
    hljs   = require('highlight.js'), 
    watch  = require('watch');

// Supported file extensions
var SUPPORTED = [ 'markdown', 'mdown', 'md' ];

// Default template directory
var TEMPLATE  = path.join(__dirname, 'template.html');

/** Chapter ==================================================================================== */

function Chapter(source) {
    if (!fs.existsSync(source)) {
        throw new Error('Source "' + source + '" does not exist.');
    }
    else if (!fs.statSync(source).isFile()) {
        throw new Error('Source "' + source + '" is not a file.');
    }

    this.autoTitle = true;

    this.path = source;
    this.filename = path.basename(source);
    this.target = stripExtension(this.filename) + '.html';

    this._content = null;
    this._parsed  = null;
    this._title   = null;
}

Chapter.prototype.content = function(noCache) {
    noCache = (isBoolean(noCache)) ? noCache : false;

    if (noCache || this._content === null) {
        this._content = fs.readFileSync(this.path, 'utf-8');
    }

    return this._content;
};

Chapter.prototype.title = function() {
    function filenameTitle(filename) {
        var title = stripExtension(filename);

        // Strip of leading digits
        var matches = /^([0-9]*\-)/.exec(title);
        if (matches) {
            title = title.substring(matches[1].length);
        }

        return title;
    }

    if (this.autoTitle) {
        // Try to find the first available title
        var content = this.content();
        var matches = content.match(/#*\s+([^\n]+)/);

        this._title = (matches) ? matches[1] : filenameTitle(this.filename);
    }
    else {
        this._filename = filenameTitle(this.filename);
    }

    return this._title;
};

/** Public functions =========================================================================== */

/**
 * Gather chapters from a source directory.
 * @param {String} source
 * @return {Array}
 */
function gather(source, options) {
    // Find all chapters
    var chapters = fs.readdirSync(source);

    // Create complete file list
    chapters = chapters.filter(isSupported).map(function(filename) {
        return new Chapter(path.join(source, filename));
    });

    return chapters;
}

/**
 * Render a list of chapters with a template.
 * @param {Array} chapters      The list of chapters to render
 * @param {String} template     The path to the template file
 */
function render(chapters, template) {
    // Register chapter template helpers. This needs to be done everytime chapters
    // are rendered because the list might have changed since the last render.
    registerChapterHelpers(chapters);

    // Compile the template
    template = compileTemplate(template);

    // Set markdown options
    marked.setOptions({
        gfm: true,
        highlight: function(code, lang) {
            if (lang && lang.length) {
                return hljs.highlight(lang, code).value;
            }
            else {
                return hljs.highlightAuto(code).value;
            }
        }
    });

    // Render each chapter
    var rendered = {};
    chapters.forEach(function(chapter) {
        rendered[chapter.filename] = template({
            chapter: chapter,
            content: marked(chapter.content())
        });
    });

    return rendered;
}

/**
 * Convert a source directory to a destination directory.
 * @param {String} source
 * @param {String} destination
 * @param {Object} options
 */
function convert(source, destination, options) {
    // Check if the destination directory exists, and empty it
    if (fs.existsSync(destination) && fs.statSync(destination).isDirectory()) {
        remove(destination);
    }

    // Create destination directory
    fs.mkdirSync(destination);

    // Gather chapters
    var chapters = gather(source);

    // Render each chapter
    var rendered = render(chapters, options.template);

    // Write out the rendered chapters
    for (var original in rendered) {
        if (rendered.hasOwnProperty(original)) {
            var content = rendered[original];
            var target  = stripExtension(original) + '.html';
            fs.writeFileSync(path.join(destination, target), content);
        }
    }
}

/**
 * Serve chapters from a source directory through an HTTP server
 * @param {String} source
 * @param {Object} options
 */
function serve(source, options) {
    // Add defaults to the options
    options = _.defaults(options, { address: 'localhost:5678', template: TEMPLATE, watch: true });

    // Get a list of chapters and their rendered version
    var chapters = gather(source);
    var rendered = render(chapters, options.template);

    if (options.watch) {
        // Create a watch on the chapter directory
        var synching = false;
        watch.watchTree(source, function(f) {
            if (synching) return;
            synching = true;

            console.log('Synching source directory');
            chapters = gather(source);
            rendered = render(chapters, options.template);

            synching = false;
        });
    }

    function handleRequest(request, response) {
        // Find the chapter name
        var chapterName = request.url;
        if (request.url.charAt(0) === '/') {
            chapterName = chapterName.substring(1);
        }

        var chapter = null;
        if (chapterName === '') {
            chapter = chapters[0];
        }
        else {
            // Try to find the chapter
            chapter = null;
            chapters.forEach(function(availableChapter) {
                if (availableChapter.target === chapterName) {
                    chapter = availableChapter;
                }
            });
        }

        if (!chapter) {
            response.writeHead(404);
            response.end();
        }
        else {
            response.writeHead(200);
            response.end(rendered[chapter.filename]);
        }
    }

    // Parse the address
    var address = (isObject(options.address)) ? options.address : parseAddress(options.address);

    // Create and start the server
    var server = require('http')
        .createServer(handleRequest)
        .listen(address.port, address.host);

    console.log('Server listening on ' + address.host + ':' + address.port);
}

/** Exports ==================================================================================== */

// our awesome export products
module.exports = {
    gather:  gather,
    render:  render,
    serve:   serve,
    convert: convert
};

/** CLI ======================================================================================== */

/**
 * CLI runner
 */
function cli() {
    // Define the cli
    var cli = require('optimist');

    // Source option
    var args = cli
        .usage('Usage: $0 [DESTINATION]')
        .options('source', {
            'alias':   's',
            'describe': 'Source directory containing chapter files',
            'default': './docs',
        })
        .options('template', {
            'alias':   't',
            'describe': 'Template path',
            'default': 'template.html',
        })
        .options('address', {
            'alias':    'a',
            'describe': 'Webserver address',
            'default':  'localhost:5678'
        })
        .argv;

    if (args['help']) {
        cli.showHelp(console.log);
        process.exit(0);
    }

    // Find the source directory
    var source = path.resolve(args['source']);
    if (!fs.existsSync(source)) {
        throw new Error('Source directory "' + source + '" does not exist.');
    }

    // Destination (if provided)
    var destination = args._[0];

    // Find the template
    var template = args['template'];
    if (template.charAt(0) != '.' && template.charAt(0) != '/') {
        template = path.join(source, args.template);
    }
    if (!fs.existsSync(template) || !fs.statSync(template).isFile()) {
        // Use default template
        template = TEMPLATE;
    }

    // Build options
    var options = {
        address:  parseAddress(args['address']),
        template: template
    }

    if (!destination) {
        // Serve the files from source
        serve(source, options);
    }
    else {
        // Convert from source to destination
        convert(source, destination, options);
    }
}

// Check if this is the main module being run
if (module.filename == __filename) {
    cli();
}

/** Utilities ================================================================================== */

/**
 * Compile a template from a file and a list of chapters. Returns a function that can be used
 * to render an HTML page with a context.
 * @param {String} template
 * @return {Function}
 */
function compileTemplate(template, chapters) {
    // Check if the template exists
    if (!fs.existsSync(template) || !fs.statSync(template).isFile()) {
        // Use default template
        template = TEMPLATE;
    }

    // Get the contents of the template
    var content = fs.readFileSync(template, 'utf-8');

    // Compile the template using handlebars
    return handlebars.compile(content);
}

/**
 * Register a set of template helpers for working with chapters. These helpers need an active
 * list chapters to work of of.
 * @param {Array} chapters
 */
function registerChapterHelpers(chapters) {
    // Chapter index helper
    handlebars.registerHelper('listChapters', function(title) {
        var html = [];
        if (title) {
            html.push('<h1>' + title + '</h1>');
        }
        html.push('<ol class="chapters">');
        chapters.forEach(function(chapter) {
            var target = stripExtension(chapter.filename) + '.html';
            html.push('<li><a href="' + target + '">' + chapter.title() + '</a></li>');
        });
        html.push('</ol>');

        return html.join('\n');
    });

    // Chapter Table of Contents helper
    handlebars.registerHelper('listTOC', function(chapter) {
        var html = '<ul class="toc"></ul>';

        return html;
    });
}


/**
 * Check if a file is supported
 * @param {String} file
 * @return {Boolean}
 */
function isSupported(file) {
    var extension = path.extname(file).substr(1);
    return SUPPORTED.indexOf(extension) >= 0;
};

/**
 * Strip the extension of a path
 * @param {String} path
 * @return {String}
 */
function stripExtension(p) {
    return p.substring(0, p.length - path.extname(p).length);
}

/**
 * Recursively remove a file or directory, synchronous.
 * @param {String} dir
 */
function remove(file) {
    file = path.normalize(file);
    var stat = path.lstatSync(file);

    // Check if it is a file
    if (stat.isFile()) {
        fs.unlinkSync(file);
    }
    else {
        // ... it must be directory
        fs.readdirSync(file).forEach(function(child) {
            remove(path.join(file, child));
        });

        fs.rmdirSync(file);
    }
}

/**
 * Parse an addres. This a combination of host and port like `localhost:5678`.
 * The address is parsed into an Object with a host and port key.
 * @param {String} address
 * @return {Object}
 */
function parseAddress(address) {
    var split = (String(address)).split(':', 2);

    var address = {
        port: split.pop(),
        host: split.pop() || '127.0.0.1'
    };

    if (address.host == 'localhost') {
        address.host = '127.0.0.1';
    }

    return address;
}

/**
 * Check if a value is an Object
 * @param {Mixed} obj
 * @return {Boolean}
 */
function isObject(val) {
    return val == Object(val);
}

/**
 * Check if a value is an Boolean
 * @param {Mixed} val
 * @return {Boolean}
 */
function isBoolean(val) {
    return typeof(val) == 'boolean';
}

/** RUN ======================================================================================== */
