var fs     = require('fs');
var path   = require('path');
var marked = require('marked');
var hljs   = require('highlight.js');
var List   = require('collections/list');
var utils  = require('./utils');
var log    = require('./logging');

/**
 * Public: Create a new Chapter.
 *
 * A Chapter represents a markdown file on disk.
 *
 * source - Path to the source file for the Chapter.
 * index - Index number of the Chapter.
 *
 * Returns a Chapter.
 */
function Chapter(source, options) {
    if (!fs.existsSync(source)) {
        throw new Error('Source "' + source + '" does not exist.');
    }
    else if (!fs.statSync(source).isFile()) {
        throw new Error('Source "' + source + '" is not a file.');
    }

    this.path = source;
    this.filename = path.basename(source);
    this.name = utils.stripExtension(this.filename);
    this.id = utils.makeHash(this.name);

    // Register options with defaults
    this.options = utils.defaults((options || {}), {
        discoverTitle: true,
        index: -1
    });

    // Caches
    this._content = null;
    this._parsed  = null;
    this._title   = null;
}

/**
 * Public: Get the String content of the chapter. This is the unparsed source of the Chapter.
 *
 * uncached - Boolean indicating the cache should be circumvented.
 *
 * Returns the content String of the Chapter.
 */
Chapter.prototype.content = function(uncached) {
    uncached = (utils.isBoolean(uncached)) ? uncached : false;

    if (uncached || this._content === null) {
        this._content = fs.readFileSync(this.path, 'utf-8');
    }

    return this._content;
};

/**
 * Public: Get the title for the Chapter.
 *
 * Returns the String title of the Chapter.
 */
Object.defineProperty(Chapter.prototype, 'title', {
    enumerable: true,
    get: function() {
        function filenameTitle(filename) {
            var title = utils.stripExtension(filename);

            // Strip of leading digits
            var matches = /^([0-9]*\-)/.exec(title);
            if (matches) {
                title = title.substring(matches[1].length);
            }

            return title;
        }

        if (this.options.discoverTitle) {
            // Try to find the first available title
            var content = this.content();
            var matches = content.match(/#*\s+([^\n]+)/);

            this._title = (matches) ? matches[1] : filenameTitle(this.filename);
        }
        else {
            this._filename = filenameTitle(this.filename);
        }

        return this._title;
    }
});

/**
 * Public: Get the index Number of the Chapter.
 *
 * Returns the index Number of the Chapter.
 */
Object.defineProperty(Chapter.prototype, 'index', {
    enumerable: true,
    get: function() {
        return this.options['index'];
    }
});

/**
 * Public: Parse the Chapter source into HTML.
 *
 * uncached - Boolean indicating the cache should be circumvented.
 *
 * Returns the parsed HTML String for the Chapter.
 */
Chapter.prototype.parse = function(uncached) {
    uncached = (utils.isBoolean(uncached)) ? uncached : false;

    // Set markdown options, with highlighting
    marked.setOptions({
        gfm: true,
        highlight: highlight
    });

    // Parse the content into HTML
    if (uncached || this._parsed === null) {
        this._parsed = marked(this.content(uncached));
    }

    return this._parsed;
};

/**
 * Get the String representation for the Chapter. This is the id of the Chapter based on
 * it's source filename.
 *
 * Returns the String representation of the Chapter.
 */
Chapter.prototype.toString = function() {
    return this.id;
};


/* /////////////////////////////////////////////////////////////////////////// */


/**
 * Public: Create a new ChapterCollection. This is a List where chapters can be added.
 *
 * chapters - Optional array containing initial chapters.
 *
 * Returns a ChapterCollection instance.
 */
function ChapterCollection(chapters) {
    function equals(chapter, value) {
        return chapter.id == value;
    }

    List.call(this, (chapters || []), equals);
}
ChapterCollection.prototype = Object.create(List.prototype);

/**
 * Public: Add a new Chapter to the ChapterCollection. This instantiate a new Chapter
 * and adds it to the Collection.
 *
 * source - The path to the source for the Chapter
 * index  - The index Number for the Chapter
 *
 * Returns the created Chapter.
 */
ChapterCollection.prototype.addNewChapter = function(source, options) {
    var chapter = new Chapter(source, options);
    this.push(chapter);
    return chapter;
};

/**
 * Public: Find a Chapter by its name. The extension is stripped from the name before searching.
 *
 * name - The name of the chapter to find.
 *
 * Returns the Chapter with the name or undefined when it could not be found.
 */
ChapterCollection.prototype.findByName = function(name) {
    // Create a has from the chapter name
    var hash = utils.makeHash(utils.stripExtension(name));

    // Try to locate the chapter by it's hash
    var chapter = this.find(hash);

    return (chapter) ? chapter.value : undefined;
};

/**
 * Public: Find a Chapter by it's index number.
 *
 * index - The chapter index to find
 *
 * Returns the Chapter for the index or undefined when it could not be found.
 */
ChapterCollection.prototype.findByIndex = function(index) {
    // Find the chapter with a custom equals function
    var chapter = this.find(index, function(chapter, index) {
        return chapter.index == index;
    });

    return (chapter) ? chapter.value: undefined;
};

/* /////////////////////////////////////////////////////////////////////////// */

/**
 * Public: Find supported files in the source directory and convert them to Chapters. the source
 * path can be a single file.
 *
 * source - The path to search for Chapter files.
 *
 * Returns a ChapterCollection.
 * Raises an Error when the source path does not exist.
 */
function find(source) {
    // Supported file extensions
    var supported = ['markdown', 'mdown', 'md'];

    // Make source a full path
    source = path.resolve(source);

    // Check if the source exists
    var stat = fs.lstatSync(source);

    // Find a list of chapters
    var chapters = null;
    if (stat.isFile()) {
        chapters = [ source ];
    }
    else {
        // Read the entire directory, one level deep
        chapters = fs.readdirSync(source).map(function(filename) {
            return path.join(source, filename);
        });
    }

    // Create a collection for the Chapters
    var collection = new ChapterCollection();

    // Create complete file list
    chapters.forEach(function(filename, index) {
        var extension = path.extname(filename).substr(1);
        if (supported.indexOf(extension) >= 0) {
            // Add a new Chapter with the index from disk
            collection.addNewChapter(filename, {
                index: index + 1
            });
        }
    });

    return collection;
}

/**
 * Internal: Highlight a code block.
 *
 * code - The code to highlight
 * lang - The language for the code. This can be empty if no language was defined for the code
 *   block.
 *
 * Returns a String.
 */
function highlight(code, lang) {
    // Try to highlight the code. highlight.js will throw an error
    // if it does not recognize the language.
    try {
        if (lang && lang.length) {
            return hljs.highlight(lang, code).value;
        }
        else {
            return code;
        }
    }
    catch (TypeError) {
        log.error('Could not highlight code block with language "' + lang + '".');
        // Return the original code so it can be included unhighlighted
        return code;
    }
}

// our awesome export products
module.exports = {
    Chapter: Chapter,
    ChapterCollection: ChapterCollection,
    find: find
};
