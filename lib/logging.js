var utils = require('./utils');

// The main log Object
var log = module.exports = Object.create(null);

// Some configuration
log.prefix = true;
log.silent = false;
log.stream = process.stdout;

// The main log method
log.log = function(category, message) {
    if (this.silent) return;
    if (arguments.length <= 0) return;

    // Trap multiple messages and shave off the category
    var messages = Array.prototype.slice.call(arguments);
    var category = (messages.length > 1) ? messages.shift() : null;

    // Collect ouput in an array
    var output = [messages.join(' ')];

    // Check if there is a message category
    if (category) {
        output.unshift(category);
    }

    // Check if we need to prefix the message
    if (this.prefix) {
        output.unshift(prefix());
    }

    // Write the output to the stream
    this.stream.write(output.join(' - ') + "\n");
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

    return time;
}
