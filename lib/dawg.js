var fs     = require('fs');
var path   = require('path');

var chapter = require('./chapter');
var templating = require('./templating');
var monitor = require('./monitor').monitor;
var utils = require('./utils');

/**
 * Public: Gather chapters from a source directory.
 *
 * source  - The directory to gather Chapters from.
 * options - Object containing options for gathering Chapter.
 *
 * Returns a ChapterCollection
 */
function gather(source, options) {
    // Supported file extensions
    var supported = ['markdown', 'mdown', 'md'];

    // Create a collection for the Chapters
    var collection = new chapter.ChapterCollection();

    // Find all chapters
    var chapters = fs.readdirSync(source);

    // Create complete file list
    chapters.forEach(function(filename, index) {
        var extension = path.extname(filename).substr(1);
        if (supported.indexOf(extension) >= 0) {
            collection.addNewChapter(path.join(source, filename), {
                index: index + 1
            });
        }
    });

    return collection;
}

/**
 * Render a list of chapters with a template.
 * @param {Array} chapters      The list of chapters to render
 * @param {String} template     The path to the template file
 */
function render(chapters, options) {
    // Register chapter template helpers. This needs to be done everytime chapters
    // are rendered because the list might have changed since the last render.
    templating.registerChapterHelpers(chapters);

    // Compile the template
    var template = templating.compileTemplate(options.template);

    // Gather assets
    var css = templating.buildCSS(options.styles, options.dev, options.dev);
    var styling = '<style type="text/css" media="screen">' + css + '</style>';

    // Render each chapter
    var rendered = {};
    chapters.forEach(function(chapter) {
        if (!chapter) return;
        rendered[chapter.id] = template({
            styling: styling,
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
        utils.removeRecursive(destination);
    }

    // Create destination directory
    fs.mkdirSync(destination);

    // Gather chapters
    var chapters = gather(source);

    // Render each chapter
    var rendered = render(chapters, options);

    // Write out the rendered chapters
    for (var original in rendered) {
        if (rendered.hasOwnProperty(original)) {
            var content = rendered[original];
            // @TODO Rewrite all chapter links to .html
            var target  = utils.stripExtension(original) + '.html';
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
    options = utils.defaults(options, {
        port: 5678,
        host: '127.0.0.1',
        watch: true,
        dev:   false
    });

    // Chapters and rendered caches
    var chapters, rendered;

    // Update the list of chapters from disk
    function updateChapters(event, filename, curStat, prevStat) {
        console.log('Updating chapters');
        // Get a list of chapters and their rendered version
        chapters = gather(source);
        renderChapters();
    }

    // Rerender the list of chapters
    function renderChapters() {
        // Recompile the template circumventing the cache. This will repopulate the template cache.
        templating.compileTemplate(options.template, options.dev);

        // Recompile the stylesheets circumventing the cache. This will repopulate the styling cache.
        templating.buildCSS(options.style, options.dev, options.dev);

        console.log('Rerendering chapters');
        rendered = render(chapters, options);
    }

    // Do an initial update
    updateChapters();

    // Check if we need to watch the chapter source
    if (options.watch) {
        monitor(source, updateChapters);
    }

    // Check if we need to watch the template and stylesheets
    if (options.dev) {
        templating.watch(options.template, options.style, renderChapters);
    }

    function handleRequest(request, response) {
        // @TODO Catch browser requests (favicon.ico etc)
        // Get the chapter name
        var name = request.url;
        if (name.charAt(0) === '/') {
            name = name.substring(1);
        }

        // Try to find the chapter
        var chapter = (name.length) ? chapters.findByName(name) : chapters.findByIndex(1);
        if (!chapter) {
            response.writeHead(404);
            response.write('404 - Not Found');
        }
        else {
            response.writeHead(200);
            response.write(rendered[chapter.id]);
        }
        response.end();
    }

    // Create and start the server
    var server = require('http')
        .createServer(handleRequest)
        .listen(options.port, options.host);

    console.log('dawg listening on ' + options.host + ':' + options.port);
}

// our awesome export products
module.exports = {
    gather:  gather,
    render:  render,
    convert: convert,
    serve:   serve
};
