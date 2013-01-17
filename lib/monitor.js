var fs     = require('fs');
var path   = require('path');
var watchr = require('watchr');
var Map    = require('collections/map');
var utils  = require('./utils');

// Internal: Map of watched paths and their callbacks for changes
var watchers = new Map(function(a, b) { return a.path == b.path }, utils.makeHash);

/**
 * Public: Monitor a file or directory. The callback is executed with the filename, current
 * stat object and the event that triggered the change.
 *
 * filepath - The String path to the file or directory to watch.
 * callback - The callback Function to execute on changes.
 *
 * Returns nothing.
 */
function monitor(filepath, callback) {
    filepath = path.resolve(filepath);
    var stat = fs.lstatSync(filepath);

    // Find or create a monitor
    var watcher = watchers.get(path.dirname(filepath)) || watchers.get(filepath);
    if (!watcher) {
        // Create a new watcher for a path with a monitor and a list of callbacks
        watcher = {
            path:      filepath,
            callbacks: [],
            monitor:   watchr.watch({ path: filepath })
        };

        // Watch for changes in the monitor
        watcher.monitor.on('change', function(event, file, curStat, prevStat) {
            // Call all watch callbacks for this monitor
            watcher.callbacks.forEach(function(callback) {
                callback(event, file, curStat, prevStat);
            });
        });

        // Add it to the map
        watchers.set(filepath, watcher);
    }

    // Check if the new watcher is a directory and any of the old watchers
    // falls under this directory
    if (stat.isDirectory()) {
        watchers.forEach(function(registered) {
            if (path.dirname(registered.path) === filepath) {
                // Move the callbacks to the new watcher
                watcher.callbacks = watcher.callbacks.concat(registered.callbacks);

                // Unmonitor the path
                unmonitor(registered.path);
            }
        });
    }

    // Add the callback to the watcher
    watcher.callbacks.push(callback);
}

/**
 * Public: Unmonitor a file or directory.
 *
 * filepath - The String path to unmonitor
 *
 * Returns nothing.
 */
function unmonitor(filepath) {
    filepath = path.resolve(filepath);

    // See if there is a watcher for this path
    var watcher = watchers.get(filepath);

    // Unmonitor the watcher if it exists
    if (watcher) {
        // Close the monitor for the watcher
        watcher.monitor.close();

        // Remove the watcher
        watchers.delete(filepath);
    }
}

/**
 * Internal: Get a stat Object for a file or directory path.
 *
 * filepath - The String path to the file or directory.
 *
 * Returns a stat Object of FALSE when the path does not exist.
 */
function statPath(filepath) {
    // Resolve to full path
    filepath = path.resolve(filepath);
    try {
        return fs.lstatSync(filepath);
    }
    catch (error) {
        return false;
    }
}

// our awesome exports
module.exports = {
    monitor:   monitor,
    unmonitor: unmonitor
};

/**
 * Internal: Add a watcher for a path. This can either be a file or a directory. The watcher
 * callback will be invoke when the path or a sub-path changes.
 *
 * p - The path to watch.
 * callback - The watcher callback.
 *
 * Returns nothing.
 */
function watchPath(watchPath, callback) {
    watchPath = path.resolve(watchPath);
    var isDirectory = fs.statSync(watchPath);
    var pathHash = utils.hashFilename(watchPath);

    // Create a callback for the monitor that will call the watcher callbacks
    // for a certain event.
    function callWatchers(event) {
        return function(filename, filestat) {
            var filepath = path.resolve(filename);
            if (isDirectory) {
                filepath = path.dirname(filepath);
            }
            var hash = utils.hashFilename(filepath);

            // Find the watchers for the path
            var callbacks = _watchers[hash] || [];
            callbacks.forEach(function(callback) {
                callback(filename, filestat, event);
            });
        };
    }

    // Check if a monitor exists for the path
    if (utils.hasOP(_watchers, pathHash)) {
        _watchers[pathHash].push(callback);
    }
    else {
        // Create a list for the path and add the watcher callback
        _watchers[pathHash] = [callback];

        // Create a new monitor for the path
        watch.createMonitor(watchPath, function(monitor) {
            // Watch for changes in the path
            monitor.on('created', callWatchers('created'));
            monitor.on('changed', callWatchers('changed'));
            monitor.on('removed', callWatchers('removed'));
        });
    }
}
