var utils = require('./utils');

// The main log Object
var log = module.exports = Object.create(null);

// Some configuration
log.prefix = true;
log.silent = false;
log.stream = process.stdout;

// The main log method
log.log = function(message) {
    if (this.silent) return;

    // Check if we need to prefix the message
    if (this.prefix) {
        message = prefix() + message;
    }

    // Write the message to the output stream
    this.stream.write(message + "\n");
};

/**
 * Internal: Construct a prefix String for log messages.
 *
 * Returns a String.
 */
function prefix() {
    // Get the current date and time
    var now = new Date();

    // Construct prefix
    var time = [now.getHours(), now.getMinutes(), now.getSeconds()].map(function(i) {
        return utils.pad(i, 2, '0');
    }).join(':');

    return time + " - ";
}
