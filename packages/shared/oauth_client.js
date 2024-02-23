'use strict';

const axios = require('axios');

const config = require('@strava/shared/config');
const logger = require('pino')(config.getLogConfig());

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand, QueryCommand } = require("@aws-sdk/lib-dynamodb");


class OAuthClient {
    constructor(clientId, clientSecret, authUrl, tokenUrl, apiUrl) {
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.authUrl = authUrl; // URL to get authorization code
        this.tokenUrl = tokenUrl; // URL to exchange code for token
        this.apiUrl = apiUrl; // Base URL for API calls

        // cache the access and refresh tokens
        this.access_token = undefined;
        this.refresh_token = undefined;
    }

    // Activate a specific athlete by retrieving the stored tokens for an athlete
    async authenticateAthlete(athlete_id) {
        const dynamoDB = new DynamoDBClient(config.getAWSConfig());
        const docClient = DynamoDBDocumentClient.from(dynamoDB);

        const params = {
            TableName: process.env.DYNAMO_OAUTH_TOKEN_TABLE,
            KeyConditionExpression: 'athlete_id = :athleteId',
            ExpressionAttributeValues: {
                ':athleteId': athlete_id
            }
        };
    
        try {
            const data = await docClient.send(new QueryCommand(params));
            if( data.Items.length !== 1 ) {
                logger.error('Unable to fetch auth tokens for athlete: ',athlete_id);
                throw new Error('Missing athlete auth tokens');
            } else {
                const athlete_tokens = data.Items[0];
                console.dir(athlete_tokens);
                this.access_token = athlete_tokens.access_token;
                this.refresh_token = athlete_tokens.refresh_token;
                logger.info('successfully found the athlete tokens '+this.access_token);
            }
        } catch (error) {
            console.error('Error querying DynamoDB:', error);
            throw error;
        }
            
    }

    // Exchange authorization code for access token
    async exchangeCodeForToken(code, redirectUri) {
        try {
            const tokenResponse = await axios.post(this.tokenUrl, {
                client_id: this.clientId,
                client_secret: this.clientSecret,
                code: code,
                redirect_uri: redirectUri,
                grant_type: 'authorization_code',
            });
            const { access_token, refresh_token, expires_in, athlete } = tokenResponse.data;

            // Store tokens in Dynamo and then cache locally
            await this.storeTokens(athlete.id,access_token,refresh_token,expires_in);
            this.access_token = access_token;
            this.refresh_token = refresh_token;
            return athlete;
        } catch (error) {
            console.error('Error exchanging code for token:', error);
            throw error;
        }
    }

    // Refresh the access token
    async refreshAccessToken(refreshToken) {
        const params = {
            client_id: this.clientId,
            client_secret: this.clientSecret,
            refresh_token: this.refreshToken,
            grant_type: 'refresh_token',
        };
        console.dir(params);
        try {
            const response = await axios.post(this.tokenUrl, params);

            const { access_token, refresh_token, expires_in } = response.data;
            await this.storeTokens(access_token, refresh_token, expires_in);
            return access_token;
        } catch (error) {
            console.error('Error refreshing token: ',error.message);
            console.dir(error.response.data);
            throw error;
        }
    }

    // Make an API call
    async makeApiCall(endpoint, method = 'GET', data = null) {
        if( !this.access_token || !this.refresh_token ) {
            throw new Error("missing oauth tokens");
        }
        console.debug('OAuth API call: ',method,`${this.apiUrl}/${endpoint}`,data);
        // TODO - skip to the refresh token step if we no the 
        // access token is expired already

        try {
            const response = await axios({
                method: method,
                url: `${this.apiUrl}/${endpoint}`,
                headers: {
                    Authorization: `Bearer ${this.access_token}`,
                },
                data: data,
            });
            return response.data;
        } catch (error) {
            // Refresh token if expired and retry API call
            if (error.response && error.response.status === 401) {
                logger.info('refresh the access token and try again... '+this.refresh_token);
                try {
                    const newAccessToken = await this.refreshAccessToken(this.refresh_token);
                    logging.info('New auth token! ',newAccessToken);
                    return this.makeApiCall(endpoint, newAccessToken, method, data);
                } catch( refresh_error ) {
                    logger.error(refresh_error.response.data,'OAuth API failed to refresh the auth token... ');
                    throw(refresh_error);
                }
            } else {
                logger.error(error.response.data,"OAuth API call failed, ");
                throw(error);
            }
        }
    }

    // Store tokens securely in DynamoDB
    async storeTokens(athlete_id, access_token, refresh_token, expires_at) {
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
            logger.info('insert oauth tokens');
            logger.debug(JSON.stringify(item, null, 2));

            // Insert the item into the DynamoDB table
            const data = await docClient.send(new PutCommand(item));
            this.access_token = access_token;
            this.refresh_token = refresh_token;
            logger.info("OAuth tokens inserted successfully:");
            return true;
        } catch (error) {
            //logger.error("Error inserting item into DynamoDB: ",error);
            logger.error({ 
                error: {
                  message: error.message, 
                  stack: error.stack,
                  // Include any other properties you need
                } 
              }, "Error inserting item into DynamoDB");
              
            return false;
        }
    }
      
}

module.exports = OAuthClient;
