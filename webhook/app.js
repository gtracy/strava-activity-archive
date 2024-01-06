'use strict';
var logme = require('logme');
var morgan = require('morgan');

var express = require('express');
var bodyParser = require('body-parser');
var routes = require('./webhook'); 


// create the express web application server
var app = express();
app.use(morgan('combined'));
app.use(bodyParser.json()); // Parse JSON requests
app.use(bodyParser.urlencoded({ extended: true })); // For parsing application/x-www-form-urlencoded

// Routes
routes(app); 

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