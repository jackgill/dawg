#!/usr/bin/env node

var fs     = require('fs'),
    path   = require('path'),
    _      = require('underscore'),
    handlebars = require('handlebars'),
    parser = require('github-flavored-markdown');

// Supported file extensions
var SUPPORTED = [
    'markdown',
    'mdown',
    'md'
];

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
 * Gather chapters from a source directory.
 * @param {String} source
 * @return {Array}
 */
function gather(source) {
    // Find all chapters
    var chapters = fs.readdirSync(source);

    // Create complete file list
    chapters = chapters.filter(isSupported).map(function(fileName) {
        var fullPath = path.join(source, fileName);
        var content  = fs.readFileSync(fullPath, 'utf-8');
        return {
            file:    fileName,
            path:    fullPath,
            content: content,
            parsed:  parser.parse(content),
            target:  fileName.substring(0, (fileName.length - path.extname(fileName).length)) + '.html'
        }
    });

    return chapters;
}

/**
 * Render a source to a destination
 * @param {Array} chapters
 */
function render(chapters) {
    // Build TOC
    var toc = chapters.map(function(chapter) {
        var filename = chapter.target.substring(0, chapter.target.length - 5);
        return [filename, chapter.target];
    });

    // Load template
    var template = fs.readFileSync(path.join(__dirname, 'template'), 'utf-8');
    var compiled = handlebars.compile(template);

    // Render each chapter
    chapters.forEach(function(chapter) {
        chapter.rendered = compiled({
            toc:     toc,
            chapter: chapter,
            content: chapter.parsed
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
    // Create destination
    fs.mkdirSync(destination);

    // Write each chapter
    chapters.forEach(function(chapter) {
        fs.writeFileSync(path.join(destination, chapter.target), chapter.rendered);
    });
}

function serve(source, opts) {
    opts = opts || { port: 5678 };

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

    // Create and start the server
    var server = require('http').createServer(handleRequest).listen(opts.port);
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
        .options('adress', {
            'alias':    'a',
            'describe': 'The address to serve the chapters on',
            'default':  'localhost:5678'
        })
        .argv;

    if (args._.length < 1) {
        // Serve the files from a webserver
        serve(args['s']);
    }
    else {
        // Write to destination
        var chapters = gather(args['s']);
        chapters = render(chapters, args['t']);
        write(chapters, args._[0]);
    }
}

// our awesome export products
module.exports = {
    gather: gather,
    render: render,
    write:  write
};

// Check if this is the main module being run
if (module.filename === __filename) {
    cli();
}
