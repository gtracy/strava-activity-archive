'use strict';
const cors = require('cors');
var morgan = require('morgan');
var express = require('express');
var bodyParser = require('body-parser');

var app = express();
app.use(morgan('combined'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors({
    origin: '*',
    methods: 'GET',
    allowedHeaders: 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
    preflightContinue: true
}));

// Routes
require('./routes/webhook')(app); 
require('./routes/oauth')(app);


// API backstop
app.get('*', (req,res) => {
    res.json({
        "status": -1,
        "description": 'unsupported endpoint'
    });
});

// Error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

module.exports = app;
