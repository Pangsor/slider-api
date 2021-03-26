const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  transports: [
    new winston.transports.File({ filename: 'log/error.log', level: 'error'}),
    new winston.transports.File({ filename: 'log/info.log', level: 'info' })
  ]
});

exports.logger = logger;