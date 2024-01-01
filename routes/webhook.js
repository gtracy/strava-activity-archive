const dotenv = require('dotenv-json')();
var logme = require('logme');
var fs = require('fs');
var path = require('path');

module.exports = function(app) {

    // endpoint handler must exist to support the webhook registration step
    // endpoint systax must match the POST call below
    //
    app.get('/webhook', (req, res) => {
        // Strava will send a 'hub.challenge' parameter for verification
        const challenge = req.query['hub.challenge'];
        const verify_token = req.query['hub.verify_token'];
        if( verify_token !== process.env.STRAVA_VERIFY_TOKEN ) {
          res.status(400).send('Invalid signature');
        } else {
          res.status(200).json({ 'hub.challenge': challenge });
        }
    });
    
    app.post('/webhook', (req, res) => {
        console.dir(req.body);
        console.dir(req.headers);
        try {
          // Verify the request signature (replace with your actual verification logic)
          const parsedSubscriptionID = parseInt(process.env.STRAVA_SUBSCRIPTION_ID);
          if (req.body.subscription_id !== parsedSubscriptionID) {
            logme.error('failed to validate the webhook request '+req.body.subscription_id+' against configuration '+process.env.STRAVA_SUBSCRIPTION_ID);
            return res.status(400).send('Invalid signature');
          }
      
          // Process the webhook data
          console.log('Received webhook:', req.body);
      
          // TODO: Implement your webhook logic here, such as:
          // - Sending notifications
          // - Updating databases
          // - Triggering other actions
      
          res.status(200).send('Webhook processed successfully');
        } catch (error) {
          console.error('Error processing webhook:', error);
          res.status(500).send('Internal server error');
        }
      });
      
};