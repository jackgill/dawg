var fs = require('fs');
var path = require('path');
var crypto = require('crypto');

/**
 * Public: Check if a value is an Boolean
 *
 * value - The value to check
 *
 * Return a boolean indicating whether the input value is a Boolean.
 */
module.exports.isBoolean = function(value) {
    return typeof(value) == 'boolean';
}

/**
 * Public: Check if a value is an Object.
 *
 * value - The value to check
 *
 * Return a boolean indicating whether the input value is an Object.
 */
module.exports.isObject = function isObject(value) {
    return value === Object(value);
};

/**
 * Public: Check if an object has a property.
 *
 * target - The target Object to check
 * key - The property key to check
 *
 * Returns a Boolean.
 */
module.exports.hasOP = function(target, key) {
    return Object.prototype.hasOwnProperty.call(target, key);
};

/**
 * Add default values to a target object.
 *
 * target - The object to add defaults
 * defaults - The defaults to add
 *
 * Returns the target Object.
 */
module.exports.defaults = function(target, defaults) {
    for (var key in defaults) {
        if (!exports.hasOP(target, key)) {
            target[key] = defaults[key];
        }
    }

    return target;
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
