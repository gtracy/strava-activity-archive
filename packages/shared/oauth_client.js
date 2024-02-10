'use strict';

const axios = require('axios');

const config = require('@strava/shared/config');
const logger = require('pino')(config.getLogConfig());

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand } = require("@aws-sdk/lib-dynamodb");


class OAuthClient {
    constructor(clientId, clientSecret, authUrl, tokenUrl, apiUrl) {
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.authUrl = authUrl; // URL to get authorization code
        this.tokenUrl = tokenUrl; // URL to exchange code for token
        this.apiUrl = apiUrl; // Base URL for API calls
    }

    // Method to get authorization code (this part is usually handled via frontend)
    async getAuthorizationCode(redirectUri, scope) {
        // Redirect user to authUrl with clientId, redirectUri, and scope
        // User will login and authorize, then be redirected back with a code
        // This code should be captured in the redirect handler
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

            // Store tokens in Dynamo
            await this.storeTokens(athlete.id,access_token,refresh_token,expires_in);
            return athlete;
        } catch (error) {
            console.error('Error exchanging code for token:', error);
            throw error;
        }
    }

    // Refresh the access token
    async refreshToken(refreshToken) {
        try {
            const response = await axios.post(this.tokenUrl, {
                client_id: this.clientId,
                client_secret: this.clientSecret,
                refresh_token: refreshToken,
                grant_type: 'refresh_token',
            });

            const { access_token, expires_in } = response.data;
            await this.storeTokens(access_token, refreshToken, expires_in);
            return access_token;
        } catch (error) {
            console.error('Error refreshing token:', error);
            throw error;
        }
    }

    // Make an API call
    async makeApiCall(endpoint, accessToken, method = 'GET', data = null) {
        try {
            const response = await axios({
                method: method,
                url: `${this.apiUrl}/${endpoint}`,
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
                data: data,
            });
            return response.data;
        } catch (error) {
            console.error('Error making API call:', error);
            // Refresh token if expired and retry API call
            if (error.response && error.response.status === 401) {
                const refreshToken = await this.getStoredRefreshToken();
                const newAccessToken = await this.refreshToken(refreshToken);
                return this.makeApiCall(endpoint, newAccessToken, method, data);
            }
            throw error;
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
            logger.info("Item inserted successfully:");
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

    // Placeholder for retrieving the stored refresh token
    async getStoredRefreshToken() {
        // Retrieve the refresh token from secure storage
    }
}

module.exports = OAuthClient;
