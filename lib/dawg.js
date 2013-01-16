var fs     = require('fs');
var path   = require('path');
var watch  = require('watch');
var handlebars = require('handlebars');
var utils   = require('./utils');
var chapter = require('./chapter');

// The default template path
const TEMPLATE_PATH = path.join(__dirname, '..', 'template');

// Default template and styles
const TEMPLATE = path.join(TEMPLATE_PATH, 'template.html');
const STYLES = [
    path.join(TEMPLATE_PATH, 'normalize.css'),
    path.join(TEMPLATE_PATH, 'style.css'),
    path.join(TEMPLATE_PATH, 'code.css')
];

/**
 * Public: Gather chapters from a source directory.
 *
 * source - The directory to gather Chapters from.
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
module.exports.gather = gather;

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
    template = fetchTemplate(template);

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
module.exports.render = render;

/**
 * Convert a source directory to a destination directory.
 * @param {String} source
 * @param {String} destination
 * @param {Object} options
 */
function convert(source, destination, options) {
    // Check if the destination directory exists, and empty it
    if (fs.existsSync(destination) && fs.statSync(destination).isDirectory()) {
        removeRecursive(destination);
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
module.exports.convert = convert;

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
        template: TEMPLATE,
        watch: true
    });

    // Get a list of chapters and their rendered version
    var chapters = gather(source);
    var rendered = render(chapters, options.template);

    if (options.watch) {
        // Create a watch on the chapter directory
        var synching = false;
        watch.watchTree(source, function(filename, filestat) {
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
            response.write(rendered[chapter.filename]);
        }
        response.end();
    }

    // Create and start the server
    var server = require('http')
        .createServer(handleRequest)
        .listen(options.port, options.host);

    console.log('Server listening on ' + options.host + ':' + options.port);
}
module.exports.serve = serve;

// Internal: The compiled template as a Function.
var _compiledTemplate = null;

/**
 * Public: Get a template function that can be used to render an HTML page.
 *
 * This method compiles a template from a file and caches the template for reuse in the
 * running process. When the template could not be locate the default template is used.
 *
 * template - The path to the template to compile.
 * uncached - Boolean indicating the template should be fetched uncached.
 *
 * Returns a Function that can be used to render an HTML page.
 */
function fetchTemplate(template, uncached) {
    if (!_compiledTemplate || uncached) {
        // Check if the template exists
        if (!template || !fs.existsSync(template) || !fs.statSync(template).isFile()) {
            // Use default template
            template = TEMPLATE;
        }

        // Get the contents of the template
        var content = fs.readFileSync(template, 'utf-8');

        // Compile the template using handlebars
        _compiledTemplate = handlebars.compile(content);
    }

    return _compiledTemplate;
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
            html.push('<li><a href="' + chapter.filename + '">' + chapter.title + '</a></li>');
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
        return chapter.title;
    });
}

/**
 * Internal: Recursively remove a direcory or a file synchronously.
 *
 * rpath - The path to remove
 *
 * Returns nothing.
 */
function removeRecursive(rpath) {
    rpath = path.normalize(rpath);
    var stat = fs.lstatSync(rpath);

    // Check if it is a file
    if (stat.isFile()) {
        fs.unlinkSync(rpath);
    }
    else {
        // ... it must be directory
        fs.readdirSync(rpath).forEach(function(child) {
            remove(path.join(rpath, child));
        });

        fs.rmdirSync(rpath);
    }
}
