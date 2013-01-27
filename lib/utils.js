var fs = require('fs');
var path = require('path');
var crypto = require('crypto');

/**
 * Public: Pad a value to a certain length with a character. The value is converted to a String.
 *
 * value - The value to pad. This is first converted to a String.
 * length - The length the String should have.
 * char - The character to pad the String with.
 * type - The type of padding to apply, can be either prepend or append.
 *
 * Returns a String.
 */
module.exports.pad = function(value, length, char, type) {
    if (!arguments.length >= 2) return value;
    else if (typeof value !== 'string' && typeof value !== 'number') return value;

    // Set default value for the padding type
    type = type || 'prepend';

    // Explicitely convert to String (for Numbers);
    value = String(value);

    // Check if value is long enough
    if (length <= value.length) return value;

    // Generate the padding String
    var padding = Array((length + 1) - value.length).join(char || ' ');

    // Return the value with the padding on the correct type
    return (type === 'append') ? value + padding : padding + value;
};

/**
 * Public: Pad a string to a certain length with a character, from the right side.
 * The value is converted to a String.
 *
 * value - The value to pad. This is first converted to a String.
 * length - The length the String should have.
 * char - The character to pad the String with.
 *
 * Returns a String.
 */
module.exports.rpad = function(value, length, char) {
    return exports.pad(value, length, char, 'append');
};

/**
 * Public: Create an insecure (saltless) MD5 hash of a String value.
 *
 * val - The String to create an MD5 hash of.
 *
 * Returns the MD5 hash of the value as a String.
 */
module.exports.makeHash = function(val) {
    return crypto.createHash('md5')
        .update(val)
        .digest('hex');
}

/**
 * Public: Create a hash from a filename. Only the filename
 * ise used and the rest of the path is discarded.
 *
 * filename - The filename or path to hash.
 * withoutExtension - Boolean indicating the hash should be created without the file's extension.
 *
 * Returns the hash String for the filename or path.
 */
module.exports.hashFilename = function(filename, withoutExtension) {
    filename = path.basename(filename);

    if (withoutExtension) {
        filename = exports.stripExtension(filename);
    }

    return exports.makeHash(filename);
};

/**
 * Public: Check if a path String is a file.
 *
 * file - The String path to the file
 *
 * Returns a Boolean indicating the file is or is not of type File.
 */
module.exports.isFile = function(file) {
    file = path.resolve(file);
    return (fs.existsSync(file) && fs.lstatSync(file).isFile());
}

/**
 * Public: Strip the extension of a path
 *
 * p - The path to strip the extension from
 *
 * Returns the path without the extension.
 */
module.exports.stripExtension = function(p) {
    return p.substring(0, p.length - path.extname(p).length);
}

/**
 * Internal: Recursively remove a direcory or a file synchronously.
 *
 * rpath - The String containing the path to remove.
 *
 * Returns nothing.
 */
module.exports.removeRecursive = function(rpath) {
    rpath = path.normalize(rpath);
    var stat = fs.lstatSync(rpath);

    // Check if it is a file
    if (stat.isFile()) {
        fs.unlinkSync(rpath);
    }
    else {
        // ... it must be directory
        fs.readdirSync(rpath).forEach(function(child) {
            exports.removeRecursive(path.join(rpath, child));
        });

        fs.rmdirSync(rpath);
    }
}
