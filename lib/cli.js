var fs    = require('fs');
var path  = require('path');
var _     = require('lodash');
var dawg  = require('./dawg');

// Some constants
const RCFILE = '.dawg';

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
        .options('config', {
            'alias':    'c',
            'describe': 'Path to a config file with parameters to load. Default: ./' + RCFILE
        })
        .options('source', {
            'alias':   's',
            'describe': 'Source path for chapter files. Default: ./docs',
        })
        .options('output', {
            'alias': 'o',
            'describe': 'Write converted files to this path.'
        })
        .describe('clear', 'Clear the output path before converting. Default: off')
        .describe('watch', 'Watch source files for changes. Default: off')
        .describe('serve', 'Serve the converted files through a webserver. Default: on')
        .describe('port',  'Port for the webserver. Default: 5678')
        .describe('host',  'Host for the webserver. Default: 127.0.0.1')
        .describe('dev',   'Run in development mode. Default: off')
        .describe('quiet', "Don't output logging. Default: off")
        .argv;

    // Check for help argument
    if (args['help']) {
        cli.showHelp(console.log);
        console.log("More: See https://github.com/mattijs/dawg for extended documentation.");
        process.exit(0);
    }

    // Base for defined options
    var options = {};

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

    // Pick options from the cli args and extend the loaded options
    var valid = [ 'config', 'source', 'output', 'clear', 'watch', 'serve', 'port', 'host', 'dev', 'quiet' ];
    options = _.extend(options, _.pick(args, valid));

    // Create a full options object with dawg's defaults
    options = dawg.options(options);

    // Run dawg with the options
    dawg.run(options);
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
