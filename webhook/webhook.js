const dotenv = require('dotenv-json')();
const logme = require('logme');

const {dynamoPutObject} = require('../dynamo');

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
    
    // validate the request and go straight to Dynamo with the object
    // 
    // {
    //   aspect_type: 'create',
    //   event_time: 1704129726,
    //   object_id: 10474819548,
    //   object_type: 'activity',
    //   owner_id: 6866927,
    //   subscription_id: 253557,
    //   updates: {}
    // }
    //
    app.post('/webhook', async (req, res) => {
        logme.debug(JSON.stringify(req.body));
        logme.debug(JSON.stringify(req.headers));
        try {
          // Verify the request signature (replace with your actual verification logic)
          const parsedSubscriptionID = parseInt(process.env.STRAVA_SUBSCRIPTION_ID);
          if (req.body.subscription_id !== parsedSubscriptionID) {
            logme.error('failed to validate the webhook request '+req.body.subscription_id+' against configuration '+process.env.STRAVA_SUBSCRIPTION_ID);
            return res.status(400).send('Invalid signature');
          }
      
          // Process the webhook data
          const item = {
            TableName: process.env.DYNAMO_RAW_WEBHOOK_TABLE,
            Item: req.body
                // owner_id: Partition key
                // object_id: Sort key
          };
          const success = await dynamoPutObject(item);
          if( success ) {
            res.status(200).send('Webhook processed successfully');
          } else {
            res.status(500).send('Internal server error');
          }
        } catch (error) {
          console.error('Error processing webhook:', error);
          res.status(500).send('Internal server error');
        }
      });
      
};