var fs    = require('fs');
var path  = require('path');
var _     = require('underscore');
var dawg  = require('./dawg');
var utils = require('./utils');

// Some constants
const RCFILE = '.dawg';
const PORT = 5678;

/**
 * Public: Run the commandline interface, parsing the arguments from STDIN
 * and proceding accordingly. Possible cli options are:
 *
 * Example
 *   $ dawg --output "./build" --watch
 *
 * Returns nothing.
 */
module.exports.run = function run() {
    // Define the cli
    var cli = require('optimist');

    // Source option
    var args = cli
        .usage('Usage: $0')
        .options('source', {
            'alias':   's',
            'describe': 'Source path for chapter files. Default: ./docs',
        })
        .options('output', {
            'alias': 'o',
            'describe': 'Write converted files to this path.'
        })
        .describe('clean', 'Clean the output path before converting. Default: off')
        .describe('serve', 'Serve the converted files through a webserver. Default: on')
        .options('config', {
            "alias":    "c",
            "describe": "Path to a config file with parameters to load."
        })
        .describe('port', 'Port for the webserver. Default: 5678')
        .describe('host', 'Host for the webserver. Default: 127.0.0.1')
        .describe('watch', 'Watch source files for changes. Default: off')
        .describe('dev', 'Run in development mode. Default: off')
        .options('quiet', {
            'alias':    'q',
            'describe': "Don't output logging. Default: off"
        })
        .argv;

    // Check for help argument
    if (args['help']) {
        cli.showHelp(console.log);
        console.log("More: See https://github.com/mattijs/dawg for extended documentation.");
        process.exit(0);
    }

    // Options, with defaults
    var options = {
        source:   path.normalize('./docs'),
        serve:    true,
        host:     '127.0.0.1',
        port:     PORT,
        watch:    true,
        unlink:   false,
        dev:      false,
        silent:   false
    };

    // Determine the config to load
    var configPath = path.join(process.cwd(), RCFILE);
    if (args.hasOwnProperty(args['config'])) {
        configPath = args['config'];
    }

    if (fs.existsSync(configPath)) {
        // Try to load the config file
        try {
            options = _.extend(options, loadConfigFile(configPath));
        }
        catch (error) {
            console.error('Could not load config file: ' + error.message);
            cli.showHelp();
            process.exit(1);
        }
    }

    // --source - Find the source directory
    if (args['source']) {
        var source = path.resolve(args['source']);
        if (!fs.existsSync(source)) {
            throw new Error('Source directory "' + source + '" does not exist.');
        }
        options.source = source;
    }

    // --output - output directory (if provided)
    if (args.hasOwnProperty('output')) {
        options.destination = args['output'];
        options.watch = false;
        options.serve = false;
    }

    // --[no]-clean
    if (args.hasOwnProperty('clean')) {
        options.clean = args['clean'];
    }

    // --watch || --no-watch
    if (args.hasOwnProperty('watch')) {
        options.watch = args['watch'];
    }

    // --serve Check for explicit --serve
    if (args.hasOwnProperty('serve') && args['serve']) {
        options.serve = true;
    }

    // --host - Parse host
    if (args.hasOwnProperty('host')) {
        var host = (args['host'] === 'localhost') ? '127.0.0.1' : args['host'];
        options.host = host;
    }

    // --port - Parse port
    if (args.hasOwnProperty('port')) {
        options.port = args['port'];
    }

    // --dev
    if (args.hasOwnProperty('dev')) {
        options.dev = args['dev'];
    }

    // --quiet
    if (args.hasOwnProperty('quiet')) {
        options.silent = args['quiet'];
    }

    // Serve the files from source without a destination or explicit serve flag
    if (!options.destination || options.serve) {
        dawg.serve(options.source, options);
    }

    // Convert from source to destination if destination is provided
    if(options.destination) {
        dawg.convert(options.source, options.destination, options);
    }
}

/**
 * Internal: Load JSON configuration from a file.
 *
 * configPath - The path to load
 *
 * Returns an Object parsed as JSON from the config file.
 * Raises Error when the path does not exist or is not a file.
 * Raises Error when the file could not be parsed as JSON.
 */
function loadConfigFile(configPath) {
    configPath = path.normalize(configPath);

    if (!fs.existsSync(configPath)) {
        throw new Error('Path "' + configPath + '" does not exist.');
    }
    else if (!fs.statSync(configPath).isFile()) {
        throw new Error('Path "' + configPath + '" is not a file.');
    }

    var content = fs.readFileSync(configPath, 'utf-8');
    try {
        return JSON.parse(content);
    }
    catch (error) {
        throw new Error('Could not parse config file: ' + error.message);
    }
}
