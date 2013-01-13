#!/usr/bin/env node

var fs     = require('fs'),
    path   = require('path'),
    fst    = require('fs-tools'),
    handlebars = require('handlebars'),
    gfm    = require('github-flavored-markdown');

// Supported file extensions
var SUPPORTED = [ 'markdown', 'mdown', 'md' ];

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

Chapter.prototype.parse = function(noCache) {
    noCache = (isBoolean(noCache)) ? noCache : false;

    if (noCache || this._parsed === null) {
        this._parsed = gfm.parse(this.content(noCache));
    }

    return this._parsed;
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

/** Base functions ============================================================================= */

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
 * Render a source to a destination
 * @param {Array} chapters
 */
function render(chapters, options) {
    // Build TOC
    var toc = chapters.map(function(chapter) {
        return [chapter.title(), chapter.target];
    });

    // Load template
    var template = fs.readFileSync(path.join(__dirname, 'template'), 'utf-8');
    var compiled = handlebars.compile(template);

    // Render each chapter
    chapters.forEach(function(chapter) {
        chapter.rendered = compiled({
            toc:     toc,
            chapter: chapter,
            content: gfm.parse(chapter.content())
        });
    });

    return chapters;
}

/**
 * Write chapters to a destination path
 * @param {Array} chapters
 * @param {String} destination
 */
function write(chapters, destination) {
    if (fs.existsSync(destination) && fs.statSync(destination).isDirectory()) {
        fst.removeSync(destination);
    }

    // Create destination
    fs.mkdirSync(destination);

    // Write each chapter
    chapters.forEach(function(chapter) {
        fs.writeFileSync(path.join(destination, chapter.target), chapter.rendered);
    });
}

function serve(source, options) {
    options = options || { address: 'localhost:5678' };

    // @TODO Create a watch on the chapter directory
    var chapters = render(gather(source));

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
            response.end(chapter.rendered);
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
            'describe': 'Template directory containing template and style files',
            'default': '_template',
        })
        .options('address', {
            'alias':    'a',
            'describe': 'The address to serve the chapters on',
            'default':  'localhost:5678'
        })
        .argv;

    // Find the source directory
    var source = path.resolve(args['source']);
    if (!fs.existsSync(source)) {
        throw new Error('Source directory "' + source + '" does not exist.');
    }

    // Find the templates directory
    var template = path.join(source, args.template);
    if (!fs.existsSync(template) || !fs.statSync(template).isDirectory()) {
        // Use default template
        template = path.join(__dirname, '_template');
    }

    // Build options
    var options = {
        address:  parseAddress(args['address']),
        template: template
    }


    if (args._.length < 1) {
        // Serve the files from a webserver
        serve(source, options);
    }
    else {
        // Write to destination
        var chapters = gather(source);
        chapters = render(chapters, options);
        write(chapters, args._[0]);
    }
}

/** Exports ==================================================================================== */

// our awesome export products
module.exports = {
    gather: gather,
    render: render,
    write:  write
};

/** Utilities ================================================================================== */

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

// Check if this is the main module being run
if (module.filename == __filename) {
    cli();
}
