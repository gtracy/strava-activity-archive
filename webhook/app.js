'use strict';
var logme = require('logme');
var morgan = require('morgan'); // For logging

var express = require('express');
var bodyParser = require('body-parser'); // For parsing JSON
var routes = require('./routes/webhook'); // Assuming this is your route file


// create the express web application server
var app = express();
app.use(morgan('combined'));
app.use(bodyParser.json()); // Parse JSON requests
app.use(bodyParser.urlencoded({ extended: true })); // For parsing application/x-www-form-urlencoded

// Routes
routes(app); // Setup your routes

// Error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

// start the web application server
var port = process.env.PORT || 8088;
app.listen(port, () => {
    logme.info('Server started on port ' + port);
});