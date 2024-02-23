'use strict';

const config = require('@strava/shared/config');
const logger = require('pino')(config.getLogConfig());

const OAuthClient = require('@strava/shared/oauth_client');

class Strava {
    constructor() {
        this.athlete_id = undefined;

        this.oauthClient = new OAuthClient(
            process.env.STRAVA_CLIENT_ID,
            process.env.STRAVA_CLIENT_SECRET,
            'https://www.strava.com/oauth/authorize',
            'https://www.strava.com/oauth/token',
            'https://www.strava.com/api/v3'
        );
    }

    // setup oauthclient for a specific athlete. clients should be
    // able to set and reset the athlete as much as they want with
    // this interface.
    async init(athlete_id) {
        this.athlete_id = athlete_id
        await this.oauthClient.authenticateAthlete(athlete_id);
    }

    // fetch a specific activity
    async fetchStravaActivity(activity_id) {
        if( !this.athlete_id ) {
            throw Error("Missing athlete_id");
        }

        console.debug('fetch activity: ',activity_id);
        const endpoint = `activities/${activity_id}`;
        try {
            const data = await this.oauthClient.makeApiCall(endpoint);
            return data;
        } catch (error) {
            logger.error('Failed to fetch activity from Strava, ', error);
            throw error;
        }
    }

}

module.exports = Strava;