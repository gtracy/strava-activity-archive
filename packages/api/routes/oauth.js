'use strict';

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand } = require("@aws-sdk/lib-dynamodb");

const config = require('@strava/shared/config');
const logger = require('pino')(config.getLogConfig());
const OAuthClient = require('@strava/shared/oauth_client');

const oauthClient = new OAuthClient(
    process.env.STRAVA_CLIENT_ID,
    process.env.STRAVA_CLIENT_SECRET,
    'https://www.strava.com/oauth/authorize',
    'https://www.strava.com/oauth/token',
    'https://www.strava.com/api/v3'
)

// save user profile data to
//
async function saveAthlete(athlete_obj) {
    // Initialize the DynamoDB client
    const client = new DynamoDBClient(config.getAWSConfig());
    const docClient = DynamoDBDocumentClient.from(client);

    if (athlete_obj.hasOwnProperty('id')) {
        athlete_obj['athlete_id'] = athlete_obj['id'];
        delete athlete_obj['id'];
    }

    const item = {
      TableName: process.env.DYNAMO_USER_TABLE,
      Item: athlete_obj
    };
  
    try {
        // add-on a unique identifier for the record
        logger.debug('insert user object');
        logger.debug(JSON.stringify(item, null, 2));
  
        // Insert the item into the DynamoDB table
        const data = await docClient.send(new PutCommand(item));
        logger.debug("Item inserted successfully:");
    } catch (error) {
        logger.error(JSON.stringify(error),"Error inserting item into DynamoDB:");
        throw error;
    }
  };
  
module.exports = async function(app) {

    app.get('/exchange_token', async (req, res) => {
        try {
            const code = req.query.code;
            const athlete = await oauthClient.exchangeCodeForToken(code, process.env.STRAVA_REDIRECT_URI);
            
            // stash the athlete details
            await saveAthlete(athlete);
            res.send('Tokens stored successfully');
        } catch (error) {
            logger.error(error,'Error handling OAuth redirect:');
            res.status(500).send('An error occurred');
        }
    });

    app.get('/oauth_redirect', async (req, res) => {
        logger.info('hit oath_redirect endpoint. why?!');
        logger.info(JSON.stringify(req.header));
    })

}