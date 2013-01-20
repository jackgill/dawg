var fs = require('fs');
var path = require('path');
var handlebars = require('handlebars');
var compressCSS = require('clean-css').process;
var utils = require('./utils');
var monitor = require('./monitor').monitor;

// The default template path
const TEMPLATE_PATH = path.join(__dirname, '..', 'template');

// Default template and stylesheets
const TEMPLATE = path.join(TEMPLATE_PATH, 'chapter.html');
const STYLESHEETS = [
    path.join(TEMPLATE_PATH, 'normalize.css'),
    path.join(TEMPLATE_PATH, 'highlight.js-github.css'),
    path.join(TEMPLATE_PATH, 'style.css')
];

// Caches
var _compiledTemplate = null;
var _compiledStyling  = null;

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
function compileTemplate(template, uncached) {
    if (!_compiledTemplate || uncached) {
        template = getTemplatePath(template);

        // Get the contents of the template
        var content = fs.readFileSync(template, 'utf-8');

        // Compile the template using handlebars
        _compiledTemplate = handlebars.compile(content);
    }

    return _compiledTemplate;
}

/**
 * Public: Get the path String for the template to render.
 *
 * template - The path String to the template. If this is not provided
 *   or if the path does not exist the default template will be used.
 *
 * Returns the complete path String to the template.
 */
function getTemplatePath(template) {
    template = path.resolve(template);
    return (utils.isFile(template)) ? template : TEMPLATE;
}

/**
 * Public: Get a list of path Strings to stylesheets that need to be included in the
 * template.
 *
 * paths - Array list of paths to include.
 * useDefaults - Boolean indicating the default styles should be included.
 *
 * Returns an Array list of valid stylesheet paths that can be included in the template.
 */
function getStylingPaths(paths, useDefaults) {
    paths = paths || [];

    // Add default styles?
    if (useDefaults) {
        // Append the given paths at the end of the default stylesheets list (cascading)
        paths = STYLESHEETS.concat(path);
    }

    // Check each path
    paths = paths.map(function(filepath) {
        return path.resolve(filepath);
    })
    .filter(utils.isFile);

    return paths;
}

/**
 * Public: Get the styling for the template.
 *
 * styles       - An Array of paths to stylesheets that need to be included.
 * uncompressed - Boolean indicating the CSS should not be compressed.
 * uncached     - Boolean indicating the cache should be circumvented.
 *
 * Returns a String containing the concatenated contents of the stylesheets.
 */
function buildCSS(styles, uncompressed, uncached) {
    // Use default stylesheet
    styles = styles || STYLESHEETS;

    if (!_compiledStyling || uncached) {
        var css = '';

        styles.forEach(function(filePath) {
            filePath = path.normalize(filePath);

            // Check if the stylesheet exists
            if (utils.isFile(filePath)) {
                var style = fs.readFileSync(filePath, 'utf-8');
                css += '/* ' + path.basename(filePath) + ' */\n' + style + "\n\n";
            }
        });

        // Check if we need to compress the styling
        if (!uncompressed) {
            css = compressCSS(css);
        }

        // Update the cache
        _compiledStyling = css;
    }

    // Return the cached styling
    return _compiledStyling;
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

    // Next chapter helper
    // @TODO Add next chapter helper

    // Previous chapter helper
    // @TODO Add previous chapter helper
}

/**
 * Public: Watch template and stylesheet files for changes and call the callback.
 *
 * template - The template file path to watch as a String.
 * stylesheets - An Array list of stylesheet file paths to watch as Strings
 * callback - The callback Function to invoke when changes occur.
 *
 * Returns nothing.
 */
function watch(template, stylesheets, callback) {
    var templatePath = getTemplatePath(template);
    var stylePaths   = getStylingPaths(stylesheets, !template);

    // Monitor the template file
    monitor(templatePath, callback);

    // Monitor each stylesheet
    stylePaths.forEach(function(stylePath) {
        monitor(stylePath, callback);
    });
}

/**
 * Render a list of chapters with a template.
 * @param {Array} chapters      The list of chapters to render
 * @param {String} template     The path to the template file
 */
function render(chapters, options) {
    // Register chapter template helpers. This needs to be done everytime chapters
    // are rendered because the list might have changed since the last render.
    registerChapterHelpers(chapters);

    // Compile the template
    var template = compileTemplate(options.template);

    // Gather assets
    var css = buildCSS(options.styles, options.dev, options.dev);
    var styling = '<style type="text/css" media="screen">\n' + css + '\n</style>';

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

// our awesome export products
module.exports = {
    getTemplatePath: getTemplatePath,
    getStylingPaths: getStylingPaths,
    compileTemplate: compileTemplate,
    buildCSS: buildCSS,
    registerChapterHelpers: registerChapterHelpers,
    render: render,
    watch: watch
};
