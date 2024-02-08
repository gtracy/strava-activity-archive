'use strict';

const axios = require('axios');
const { SecretsManagerClient, PutSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
const config = require('../../config');
const logger = require('pino')(config.getLogConfig());

// Initialize AWS Secrets Manager Client
const secretsManagerClient = new SecretsManagerClient(config.getAWSConfig(true));


// OAuth configuration - replace with your own values
const tokenEndpoint = 'https://www.strava.com/oauth/token';

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

            const { access_token, refresh_token } = tokenResponse.data;

            // Store tokens in AWS Secrets Manager
            const putSecretValueCommand = new PutSecretValueCommand({
                SecretId: 'YourSecretName', // Replace with your secret name
                SecretString: JSON.stringify({ access_token, refresh_token })
            });

            await secretsManagerClient.send(putSecretValueCommand);

            res.send('Tokens stored successfully');
        } catch (error) {
            console.error('Error handling OAuth redirect:', error);
            console.dir(error);
            res.status(500).send('An error occurred');
        }
    });

}