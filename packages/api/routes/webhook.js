'use strict';

const dotenv = require('dotenv-json')({ path:'../shared/.env.json' });
const config = require('@strava/shared/config');
const logger = require('pino')(config.getLogConfig());

const { v4: uuidv4 } = require('uuid');

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand } = require("@aws-sdk/lib-dynamodb");
const { SQSClient, SendMessageCommand } = require("@aws-sdk/client-sqs");

// We have a supervisor job that aggregates all webhook events 
// for a single Strava activity. This function will push a 
// message into a delayed queue that triggers that supervisor task
//
// By definition, we will create multiple triggers, but the supervisor
// will discard them if all of the work has already been completed
//
async function triggerSupervisor(msg) {
    const sqsClient = new SQSClient(config.getAWSConfig(true));
    logger.info(msg,'trigger the supervisor task worker via SQS: ');
    const params = {
        QueueUrl: config.getSQSConfig('supervisor'),
        MessageBody: JSON.stringify(msg),
    };
    const result = await sqsClient.send(new SendMessageCommand(params));
}

async function dynamoPutObject(item) {
  // Initialize the DynamoDB client
  const client = new DynamoDBClient(config.getAWSConfig());
  const docClient = DynamoDBDocumentClient.from(client);

  try {
      // add-on a unique identifier for the record
      item.Item['archive_id'] = uuidv4();
      item.Item['fetched'] = "false";
      logger.debug('insert new webhook object');
      logger.debug(JSON.stringify(item, null, 2));

      // Insert the item into the DynamoDB table
      const data = await docClient.send(new PutCommand(item));
      logger.debug("Item inserted successfully:");
      return true;
  } catch (error) {
      logging.error(error,"Error inserting item into DynamoDB:");
      return false;
  }
};

module.exports = function(app) {

    // endpoint handler must exist to support the webhook registration step
    // endpoint systax must match the POST call below
    //
    app.get('/webhook', (req, res) => {
        // Strava will send a 'hub.challenge' parameter for verification
        const challenge = req.query['hub.challenge'];
        const verify_token = req.query['hub.verify_token'];
        if( verify_token !== process.env.STRAVA_VERIFY_TOKEN ) {
          logger.error('Failed to validate request signature');
          logger.error('challenge: '+ challenge + ' / verify_token: '+verify_token);
          res.status(400).send('Invalid signature');
        } else {
          logger.info('new webhook registered: '+challenge);
          res.status(200).json({ 'hub.challenge': challenge });
        }
    });
    
    // validate the request and go straight to Dynamo with the object
    // this is (example) what the webhook body looks like:
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
        logger.debug(JSON.stringify(req.body));
        logger.debug(JSON.stringify(req.headers));
        try {
          // Verify the request signature (replace with your actual verification logic)
          const parsedSubscriptionID = parseInt(process.env.STRAVA_SUBSCRIPTION_ID);
          if (req.body.subscription_id !== parsedSubscriptionID) {
            logger.error('failed to validate the webhook request '+req.body.subscription_id+' against configuration '+process.env.STRAVA_SUBSCRIPTION_ID);
            return res.status(400).send('Invalid signature');
          }
      
          // Process the webhook data
          const item = {
            TableName: process.env.DYNAMO_RAW_WEBHOOK_TABLE,
            Item: req.body
          };
          const success = await dynamoPutObject(item);
          if( success ) {
            // trigger the downstream data processor
            await triggerSupervisor({activity_id:req.body.object_id});
            res.status(200).send('Webhook processed successfully');
          } else {
            res.status(500).send('Internal server error');
          }

        } catch (error) {
          logger.error('Error processing webhook:', error);
          res.status(500).send('Internal server error');
        }
      });
      
};