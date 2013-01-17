var fs = require('fs');
var path = require('path');
var handlebars = require('handlebars');
var compressCSS = require('clean-css').process;
var utils = require('./utils');

// The default template path
const TEMPLATE_PATH = path.join(__dirname, '..', 'template');

// Default template and stylesheets
const TEMPLATE = path.join(TEMPLATE_PATH, 'template.html');
const STYLESHEETS = [
    path.join(TEMPLATE_PATH, 'normalize.css'),
    path.join(TEMPLATE_PATH, 'style.css'),
    path.join(TEMPLATE_PATH, 'code.css')
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
                css += '/* ' + path.basename(filePath) + '*/\n' + style + "\n\n";
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

// our awesome export products
module.exports = {
    compileTemplate: compileTemplate,
    buildCSS: buildCSS,
    registerChapterHelpers: registerChapterHelpers
};
