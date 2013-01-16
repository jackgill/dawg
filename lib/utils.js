var path = require('path');
var crypto = require('crypto');

/**
 * Public: Strip the extension of a path
 *
 * p - The path to strip the extension from
 *
 * Returns the path without the extension.
 */
module.exports.stripExtension = function stripExtension(p) {
    return p.substring(0, p.length - path.extname(p).length);
}

/**
 * Public: Check if a value is an Boolean
 *
 * value - The value to check
 *
 * Return a boolean indicating whether the input value is a Boolean.
 */
module.exports.isBoolean = function isBoolean(value) {
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
module.exports.hasOP = function hasOP(target, key) {
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
module.exports.defaults = function defaults(target, defaults) {
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
module.exports.makeHash = function makeHash(val) {
    return crypto.createHash('md5')
        .update(val)
        .digest('hex');
}
