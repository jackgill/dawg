var fs   = require('fs');
var path = require('path');
var _    = require('lodash');

var log = require('./logging');
var chapter = require('./chapter');
var templating = require('./templating');
var monitor = require('./monitor').monitor;
var utils = require('./utils');

// Defaults that dawg uses for options
const DEFAULTS = {
    source:   path.join(process.cwd(), 'docs'),
    serve:    true,
    host:     '127.0.0.1',
    port:     5678,
    watch:    true,
    clear:    false,
    dev:      false,
    silent:   false
};

/**
 * Generate an options object based on the default options. This will fill
 * any options that is in the defaults and switch options on and off based on
 * the provided options.
 *
 * options - An options Object that needs to be filled with defaults.
 *
 * Returns an Object.
 */
function options(options) {
    // Build a base from default options
    var build = _.defaults({}, DEFAULTS);

    // Disable watch and serve when output is specified
    if (_.has(options, 'output')) {
        build.output = options.output;
        build.watch = false;
        build.serve = false;
    }

    // Copy the rest of the options to the build. If serve or watch were explicitly
    // defined their default values will be overridden
    build = _.extend(build, options);

    return build;
}

/**
 * Public: Run dawg with a set of options. This will serve the files, output them to a destination
 * or both depending on the options.
 *
 * If no output directory is given the source file(s) will be serve through a webserver. If an
 * output path is given the source file(s) will be converted to that path.
 * To serve and output the source file(s) the an output path can be specified with the serve
 * option set to true.
 *
 * options - An options Object.
 *
 * Returns nothing.
 */
function run(options) {
    // Serve the files from source without an output or explicit serve flag
    if (!options.output || options.serve) {
        serve(options.source, options);
    }

    // Convert from source to output if output was provided
    if(options.output) {
        convert(options.source, options.output, options);
    }
}

/**
 * Public: Serve chapters from a source directory through an HTTP server.
 * @param {String} source
 * @param {Object} options
 */
function serve(source, options) {
    // Add defaults to the options
    options = _.defaults(options, {
        port:   5678,
        host:   '127.0.0.1',
        watch:  true,
        dev:    false,
        silent: false
    });

    // Resolve source path
    source = path.resolve(source);

    // Check if we need to supress logging
    log.silence(options.silent);
    log.level = (options.dev) ? 'debug' : 'info';

    // Chapters and rendered caches
    var chapters, rendered;

    // Update the list of chapters from disk
    function updateChapters() {
        log.debug('Gathering chapters from ' + source);
        // Get a list of chapters and their rendered version
        chapters = chapter.find(source);
        renderChapters();
    }

    // Rerender the list of chapters
    function renderChapters() {
        // Recompile the template circumventing the cache. This will repopulate the template cache.
        templating.compileTemplate(options.template, options.dev);

        // Recompile the stylesheets circumventing the cache. This will repopulate the styling cache.
        templating.buildCSS(options.style, options.dev, options.dev);

        log.debug('Rerendering ' + chapters.length + ' chapters');
        rendered = templating.render(chapters, options);
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

    // @TODO convert this to middleware system like connect or strata
    function handleRequest(request, response) {
        // Get the chapter name
        var name = request.url;
        if (name.charAt(0) === '/') {
            name = name.substring(1);
        }

        // Try to find the chapter
        var chapter = (name.length) ? chapters.findByName(name) : chapters.findByIndex(1);
        if (!chapter) {
            // @TODO Serve non-chapter files from the source directory, if it is a directory
            log.debug(' >> 404 - ' + request.url);
            response.writeHead(404);
            response.write('404 - Not Found');
        }
        else {
            log.debug(' >> 200 - ' + request.url);
            response.writeHead(200);
            response.write(rendered[chapter.id]);
        }
        response.end();
    }

    // Create and start the server
    var server = require('http')
        .createServer(handleRequest)
        .listen(options.port, options.host);

    log.info('dawg listening on http://' + options.host + ':' + options.port);
}

/**
 * Convert a source directory to a destination directory.
 * @param {String} source
 * @param {String} destination
 * @param {Object} options
 */
function convert(source, destination, options) {
    // Check if logging should be disabled
    log.silence(options.silent);
    log.level = (options.dev) ? 'debug' : 'info';

    // Resolve paths
    source = path.resolve(source);
    destination = path.resolve(destination);

    // Do our first run
    converter();

    // Check if we need to watch the source directory
    if (options.watch) {
        monitor(source, converter);
    }

    // Check if we need to watch the template and stylesheets
    if (options.dev) {
        templating.watch(null, null, converter);
    }

    // Internal converter function that can be called from a monitor
    function converter() {
        log.info('Converting ' + source + ' to ' + destination);

        // Find all chapters in the source directory
        log.debug('Gathering chapters from ' + source);
        var chapters = chapter.find(source, options);

        // Write chapter(s) to the destination
        write(chapters, destination, options);

        // @TODO Copy all non-converted files to the output directory, if it is a directory
    }
}

/**
 * Internal: Write a list of Chapters to a destination directory.
 *
 * chapters - A ChapterCollection with Chapters.
 * destination - A String destination path.
 * options - An Object containing options for writing.
 *
 * Returns nothing.
 */
function write(chapters, destination, options) {
    if (!chapters || !destination) return;

    // Create the destination path
    var type = createDestination(destination, options.clear);

    // Check if destination is a file and if there are no more than 1 chapter
    if (type.isFile() && chapters.length > 1) {
        log.error('Cannot write more than one chapter to a single file');
        return;
    }

    // Render each chapter
    log.debug('Rendering ' + chapters.length + ' chapters');
    var rendered = templating.render(chapters, options);

    // Build URL replacements
    var urls = chapters.map(function(chapter) {
        var target = utils.stripExtension(chapter.filename) + '.html';
        return [
            new RegExp("href=[\"']?(" + chapter.filename + ")[\"']?", "gm"),
            'href="' + target + '"'
        ];
    });

    // Write out the rendered chapters
    log.debug('Writing ' + chapters.length + ' chapters to ' + destination);
    for (var id in rendered) {
        if (_.has(rendered, id)) {
            var chapter = chapters.get(id);
            var content = rendered[id];

            // Rewrite URLs in the chapters content
            urls.forEach(function(url) {
                content = String.prototype.replace.apply(content, url);
            });

            // Base the filename on the original filename
            var target  = utils.stripExtension(chapter.filename) + '.html';

            // Write the chapter to a file
            fs.writeFileSync(path.join(destination, target), content);
        }
    }
}

/**
 * Internal: Check a destination path. If the path appears to be a directory
 * and it does not exist it is created. If the path appears to be a file the
 * parent directory is checked.
 *
 * destination - The destination path String.
 * unlink - Boolean indicating the destination should be removed.
 *
 * Returns nothing.
 */
function createDestination(destination, unlink) {
    log.debug('Creating destination ' + destination);

    // Check if the destination exists
    var stat, wasDirectory = false, wasFile = false;
    try {
        stat = fs.lstatSync(destination);
        wasDirectory = stat.isDirectory();
        wasFile = stat.isDirectory();
    } catch(error) {
        stat = false;
    }

    // Check if the destination should be a file
    var shouldBeFile = (!wasDirectory && path.extname(destination).length > 0);

    if (stat && unlink) {
        // Empty and remove the destination directory
        utils.removeRecursive(destination);
    }

    if ((!wasDirectory && !shouldBeFile) || unlink) {
        // Recreate the destination if it was or should be a directory
        fs.mkdirSync(destination);
    }

    // Create a fake stat Object
    return {
        "isFile":      function() { return shouldBeFile; },
        "isDirectory": function() { return wasDirectory; }
    };
}

// our awesome export products
module.exports = {
    defaults: DEFAULTS,
    options:  options,
    run:      run,
    serve:    serve,
    convert:  convert
};
