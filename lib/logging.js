var utils = require('./utils');

// The main log Object
var log = module.exports = Object.create(null);

// Some configuration
log.prefix = true;
log.silent = false;
log.stream = process.stdout;
log.level  = 'info';

/**
 * Public: Log levels for the log method. These are based on the levels from rfc3164 but
 * altered a little bit. These levels are available:
 *   0 - emerg:  system is unusable
 *   1 - alert:  action must be taken immediately
 *   2 - crit:   critical conditions
 *   3 - error:  error conditions
 *   4 - warn:   warning conditions
 *   5 - notice: normal but significant condition
 *   6 - info:   informational messages
 *   7 - debug:  debug-level messages
 *
 * See https://www.rfc-editor.org/rfc/rfc3164.txt for the original levels.
 */
log.levels = {
    'emerg':  0,
    'alert':  1,
    'crit':   2,
    'error':  3,
    'warn':   4,
    'notice': 5,
    'info':   6,
    'debug':  7
};

/**
 * Public: Log a message with a level. If no level is provided the default level will be
 * used. The level is checked against the log.level level to see if it must be logged. When
 * the log level is greate or equal then the set level the message passes.
 *
 * When the silent flag is set all log messages will be suppressed.
 *
 * level - Level String to used for logging the message.
 * message - One or more messages to log.
 *
 * Returns nothing.
 */
log.log = function(level, message) {
    if (arguments.length <= 1) return;
    if (!pass(level)) return;

    // Trap multiple messages and shave off the level
    var messages = Array.prototype.slice.call(arguments);
    var level = (messages.length > 1) ? messages.shift() : log.level;

    // Collect ouput in an array
    var output = [messages.join(' ')];

    // Check if there is a message level
    if (level) {
        output.unshift(utils.rpad(level, 6));
    }

    // Check if we need to prefix the message
    if (this.prefix) {
        output.unshift(prefix());
    }

    // Write the output to the stream
    this.stream.write(output.join(' - ') + "\n");
};

// Create a log function for each level. Each level method automatically adds the
// level argument and calls the log.log method with the original message(s).
Object.getOwnPropertyNames(log.levels).forEach(function(level) {
    log[level] = function(message) {
        var args = Array.prototype.slice.call(arguments);
        args.unshift(level);
        return log.log.apply(log, args);
    };
});

/**
 * Internal: Check if a level passes the set log level.
 *
 * level - The level String to check.
 *
 * Returns a Boolean indicating the level passes.
 */
function pass(level) {
    return !log.silent && (log.levels[level] <= log.levels[log.level]);
}

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
