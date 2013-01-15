#!/usr/bin/env node

var fs     = require('fs'),
    path   = require('path'),
    crypto = require('crypto'),
    _      = require('underscore'),
    List   = require('collections/list'),
    marked = require('marked'),
    hljs   = require('highlight.js'),
    watch  = require('watch'),
    handlebars = require('handlebars');

// RC filename
var RCFILE = '.dawg';

// Default port
var PORT = '5678';

// Supported file extensions
var SUPPORTED = [ 'markdown', 'mdown', 'md' ];

// Default template directory
var TEMPLATE  = path.join(__dirname, 'template.html');

/** Chapter ==================================================================================== */

function Chapter(source, index) {
    if (!fs.existsSync(source)) {
        throw new Error('Source "' + source + '" does not exist.');
    }
    else if (!fs.statSync(source).isFile()) {
        throw new Error('Source "' + source + '" is not a file.');
    }

    this.autoTitle = true;

    this.path = source;
    this.filename = path.basename(source);

    this.name = stripExtension(this.filename);
    this.id = makeHash(this.name);
    this.index  = (index) ? index : -1;

    // Caches
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

Chapter.prototype.parse = function(noCache) {
    noCache = (isBoolean(noCache)) ? noCache : false;

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

    // Parse the content into HTML
    if (noCache || this._parsed === null) {
        this._parsed = marked(this.content(noCache));
    }

    return this._parsed;
};

Chapter.prototype.toString = function() {
    return this.id;
};

/**
 * Basic collection for chapters.
 * @param {Array} chapters
 */
function ChapterCollection(chapters) {
    function equals(chapter, value) {
        return chapter.id == value;
    }

    List.call(this, (chapters || []), equals);
}
ChapterCollection.prototype = List.prototype;

/**
 * Find a Chapter by its name. The extension is stripped from the name before searching.
 * @param {String} name     The name of the chapter to find.
 * @return {Chapter}        The chapter or UNDEFINED when it does not exist
 */
ChapterCollection.prototype.findByName = function(name) {
    // Create a has from the chapter name
    var hash = makeHash(stripExtension(name));

    // Try to locate the chapter by it's hash
    var chapter = this.find(hash);

    return (chapter) ? chapter.value : undefined;
};

/**
 * Find a Chapter by it's index number.
 * @param {Integer|String} index
 * @return {Chapter}
 */
ChapterCollection.prototype.findByIndex = function(index) {
    // Find the chapter with a custom equals function
    var chapter = this.find(index, function(chapter, index) {
        return chapter.index == index;
    });

    return (chapter) ? chapter.value: undefined;
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

    // Create a collection for the Chapters
    var collection = new ChapterCollection();

    // Create complete file list
    chapters.filter(isSupported).forEach(function(filename, index) {
        var chapter = new Chapter(path.join(source, filename), index + 1);
        collection.push(chapter);
    });

    return collection;
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

    // Render each chapter
    var rendered = {};
    chapters.forEach(function(chapter) {
        if (!chapter) return;
        rendered[chapter.filename] = template({
            chapter: chapter,
            content: chapter.parse()
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
            // @TODO Rewrite all chapter links to .html
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
    options = _.defaults(options, { port: PORT, host: '127.0.0.1', template: TEMPLATE, watch: true });

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
        // @TODO Catch browser requests (favicon.ico etc)
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
            chapter = chapters.findByName(chapterName);
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

    // Create and start the server
    var server = require('http')
        .createServer(handleRequest)
        .listen(options.port, options.host);

    console.log('Server listening on ' + options.host + ':' + options.port);
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
        .usage('Usage: $0 [--source|-s SOURCE] [--output|-o OUTPUT]')
        .options('source', {
            'alias':   's',
            'describe': 'Source directory containing chapter files. Default: ./docs',
        })
        .options('output', {
            'alias': 'o',
            'describe': 'Output directory. This will disable the webserver'
        })
        .describe('serve', 'Serve the files instead of outputting them.')
        .options('config', {
            "alias":    "c",
            "describe": "Config file with parameters"
        })
        .options('template', {
            'alias':   't',
            'describe': 'Template path'
        })
        .describe('port', 'Port for the webserver')
        .describe('host', 'Host for the webserver')
        .describe('watch', 'Watch source files for changes')
        .argv;

    // Check for help argument
    if (args['help']) {
        cli.showHelp(console.log);
        process.exit(0);
    }

    // Options, with defaults
    var options = {
        source:   path.normalize('./docs'),
        template: path.join(__dirname, TEMPLATE),
        serve:    true,
        host:     '127.0.0.1',
        port:     PORT,
        watch:    true
    };

    // Determine the config to load
    var configPath = path.join(process.cwd(), RCFILE);
    if (args.hasOwnProperty(args['config'])) {
        configPath = args['config'];
    }

    if (fs.existsSync(configPath)) {
        // Try to load the config file
        try {
            options = _.extend(options, loadConfigFile(configPath));
        }
        catch (error) {
            console.err('Could not load config file: ' + error.message);
            cli.showHelp();
            process.exit(1);
        }
    }

    // --source - Find the source directory
    var source = path.resolve(args['source']);
    if (!fs.existsSync(source)) {
        throw new Error('Source directory "' + source + '" does not exist.');
    }

    // --outpu - output directory (if provided)
    if (args.hasOwnProperty('output')) {
        options.destination = args['output'];
        options.serve = false;
    }

    // --watch || --no-watch
    if (args.hasOwnProperty('watch')) {
        options.watch = args['watch'];
    }

    // --template
    if (args.hasOwnProperty('template')) {
        if (template.charAt(0) != '.' && template.charAt(0) != '/') {
            template = path.join(source, args.template);
        }

        // Check if the template exists
        if (fs.existsSync(template) && fs.statSync(template).isFile()) {
            options.template = template;
        }
    }

    // --serve Check for explicit --serve
    if (args.hasOwnProperty('serve') && args['serve']) {
        options.serve = true;
    }

    // --host - Parse host
    if (args.hasOwnProperty('host')) {
        var host = (args['host'] === 'localhost') ? '127.0.0.1' : args['host'];
        options.host = host;
    }

    // --port - Parse port
    if (args.hasOwnProperty('port')) {
        options.port = args['port'];
    }

    // Either serve or convert the source files
    if (!options.destination || options.serve) {
        // Serve the files from source
        serve(options.source, options);
    }
    else {
        // Convert from source to destination
        convert(options.source, options.destination, options);
    }
}

// Check if this is the main module being run
if (module.filename == __filename) {
    cli();
}

/** Utilities ================================================================================== */

/**
 * Load JSON configuration from a file.
 * @param {String} configPath
 * @return {Object}
 */
function loadConfigFile(configPath) {
    configPath = path.normalize(configPath);

    if (!fs.existsSync(configPath)) {
        throw new Error('Path "' + configPath + '" does not exist.');
    }
    else if (!fs.statSync(configPath).isFile()) {
        throw new Error('Path "' + configPath + '" is not a file.');
    }

    var content = fs.readFileSync(configPath, 'utf-8');
    try {
        return JSON.parse(content);
    }
    catch (error) {
        throw new Error('Could not parse config file: ' + error.message);
    }
}

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
            if (!chapter) return;
            html.push('<li><a href="' + chapter.filename + '">' + chapter.title() + '</a></li>');
        });
        html.push('</ol>');

        return html.join('\n');
    });

    // Chapter Table of Contents helper
    handlebars.registerHelper('listTOC', function(chapter) {
        var html = '<ul class="toc"></ul>';

        return html;
    });

    // Chapter title helper
    handlebars.registerHelper('title', function(chapter) {
        if (!chapter) return '';
        return chapter.title();
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
    var stat = fs.lstatSync(file);

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

/**
 * Create an insecure (saltless) MD5 hash of a String value.
 * @param {String} val
 * @return {String}
 */
function makeHash(val) {
    return crypto.createHash('md5')
        .update(val)
        .digest('hex');
}
