'use strict';

const axios = require('axios');
const { SecretsManagerClient, PutSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
const config = require('../../config');
const logger = require('pino')(config.getLogConfig());


const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand } = require("@aws-sdk/lib-dynamodb");

// OAuth configuration - replace with your own values
const tokenEndpoint = 'https://www.strava.com/oauth/token';

// save oauth tokens to Dynamo
//
async function saveTokens(athlete_id, access_token, refresh_token, expires_at) {
  // Initialize the DynamoDB client
  const client = new DynamoDBClient(config.getAWSConfig());
  const docClient = DynamoDBDocumentClient.from(client);
  const item = {
    TableName: process.env.DYNAMO_OAUTH_TOKEN_TABLE,
    Item: {}
  };

  try {
      // add-on a unique identifier for the record
      item.Item['athlete_id'] = athlete_id;
      item.Item['access_token'] = access_token;
      item.Item['refresh_token'] = refresh_token;
      item.Item['expires_at'] = expires_at;
      logger.debug('insert oauth tokens');
      logger.debug(JSON.stringify(item, null, 2));

      // Insert the item into the DynamoDB table
      const data = await docClient.send(new PutCommand(item));
      logger.debug("Item inserted successfully:");
      return true;
  } catch (error) {
      logger.error("Error inserting item into DynamoDB:", JSON.stringify(error));
      console.dir(error);
      return false;
  }
};

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
        return true;
    } catch (error) {
        logger.error("Error inserting item into DynamoDB:", JSON.stringify(error));
        console.dir(error);
        return false;
    }
  };
  
module.exports = async function(app) {

    app.get('/oauth_redirect', (req,res) => {

    })

    app.get('/exchange_token', async (req, res) => {
        try {
            const code = req.query.code;

            // Exchange authorization code for tokens
            const tokenResponse = await axios.post(tokenEndpoint, {
                client_id: process.env.STRAVA_CLIENT_ID,
                client_secret: process.env.STRAVA_CLIENT_SECRET,
                code: code,
                grant_type: 'authorization_code',
                redirect_uri: process.env.STRAVA_REDIRECT_URI
            });
            console.dir(tokenResponse.data);

            const { access_token, refresh_token, expires_in, athlete } = tokenResponse.data;

            // Store tokens in Dynamo
            await saveTokens(athlete.id,access_token,refresh_token,expires_in);
            await saveAthlete(athlete);
            res.send('Tokens stored successfully');
        } catch (error) {
            console.error('Error handling OAuth redirect:', error);
            console.dir(error);
            res.status(500).send('An error occurred');
        }
    });

}