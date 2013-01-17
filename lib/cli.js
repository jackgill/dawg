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
 *   --help
 *   --source
 *   --output
 *   --config
 *   --template
 *   --port
 *   --host
 *   --watch
 *   --dev
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
        .usage('Usage: $0 [--source|-s SOURCE] [--output|-o OUTPUT]')
        .options('source', {
            'alias':   's',
            'describe': 'Source directory containing chapter files. Default: ./docs',
        })
        .options('output', {
            'alias': 'o',
            'describe': 'Output directory. This will disable the webserver'
        })
        .describe('serve', 'Serve the files instead of outputting them.')
        .options('config', {
            "alias":    "c",
            "describe": "Config file with parameters"
        })
        .options('template', {
            'alias':   't',
            'describe': 'Template path'
        })
        .describe('port', 'Port for the webserver')
        .describe('host', 'Host for the webserver')
        .describe('watch', 'Watch source files for changes')
        .describe('dev', 'Run in development mode')
        .argv;

    // Check for help argument
    if (args['help']) {
        cli.showHelp(console.log);
        process.exit(0);
    }

    // Options, with defaults
    var options = {
        source:   path.normalize('./docs'),
        serve:    true,
        host:     '127.0.0.1',
        port:     PORT,
        watch:    true,
        dev:      false
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
    var source = path.resolve(args['source']);
    if (!fs.existsSync(source)) {
        throw new Error('Source directory "' + source + '" does not exist.');
    }

    // --outpu - output directory (if provided)
    if (args.hasOwnProperty('output')) {
        options.destination = args['output'];
        options.serve = false;
    }

    // --watch || --no-watch
    if (args.hasOwnProperty('watch')) {
        options.watch = args['watch'];
    }

    // --template
    if (args.hasOwnProperty('template')) {
        // Check if the template exists
        if (utils.isFile(template)) {
            options.template = template;
        }
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

    // Either serve or convert the source files
    if (!options.destination || options.serve) {
        // Serve the files from source
        dawg.serve(options.source, options);
    }
    else {
        // Convert from source to destination
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
