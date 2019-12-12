const path = require('path');
const bunyan = require('bunyan');
const PrettyStream = require('bunyan-pretty-colors');

const prettyStdOut = new PrettyStream();
prettyStdOut.pipe(process.stdout);

const logger = (option = {}) => {
    return bunyan.createLogger({
        name: 'log',
        src: false,
        streams: [
            {
                level: 'info',
                stream: prettyStdOut
            },
            {
                level: 'info',
                type: 'rotating-file',
                path: path.join(option.root || 'data.log/', '/', option.file || 'info.log'),
                period: '1d', // daily rotation
                count: 30 // keep 30 days
            }
        ]
    });
};

module.exports = logger; // trace, debug, info, warn, error, fatal
