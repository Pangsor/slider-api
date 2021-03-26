const express = require('express');
const winston = require('winston');
const app = express();

const swaggerUi = require("swagger-ui-express"),
swaggerDocument = require('./swagger.json');

require(`./startup/logging`)();
require(`./startup/routes`)(app);
require('./startup/db')();
require(`./startup/config`)();

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

const port = process.env.PORT || 3756;
app.listen(port,() => winston.info(`Listening on port ${port}...`));