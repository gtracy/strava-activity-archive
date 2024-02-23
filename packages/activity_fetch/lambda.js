'use strict';

const dotenv = require('dotenv-json')({ path:'../shared/.env.json' });
const config = require('@strava/shared/config');
const logger = require('pino')(config.getLogConfig());

const axios = require('axios');
const Strava = require('@strava/shared/strava');

// event message schema:
//      owner_id: athlete_id that owns the activity,
//      object_id: specific activity_id that was created/edited,
//      archive_id: item.archive_id.S,
//      aspect_type: item.aspect_type.S

//exports.process_message = async (event) => {
async function job_handler(event)  {
    // Assuming the event is the SQS message
    const records = event.Records;

    // Loop through each record (message)
    for (let record of records) {
        const message = JSON.parse(record.body);
        logger.debug(message);
        const { activity_id, athlete_id, archive_id, aspect_type } = message;

        try {
            logger.info('setup strava client for '+athlete_id);
            let strava = new Strava();
            await strava.init(athlete_id);

            // Fetch the activity data
            const activityData = await strava.fetchStravaActivity(String(activity_id));
            logger.info(activityData.name,"Fetched activity data:");

            // Process the activity data as needed
            // ...

        } catch (error) {
            logger.error("Error processing message:", error);
            //throw(error);
        }
    }
};


exports.handler = job_handler;

// this enables you to run the script directly from the CLI
// e.g. node lambda.js 123
//
if (require.main === module) {
    logger.debug('running function from the CLI');
    (async () => {
        const mock_messages = [
            {athlete_id: 129273352,activity_id:10688463137,archive_id:"0",aspect_type:'created'},
            //{athlete_id: 129273352,activity_id:10691054107,archive_id:"0",aspect_type:'created'},
        ]
        let mock_records = {
            "Records": [
              {
                "messageId": "some-message-id",
                "receiptHandle": "some-receipt-handle",
                "body": "",
                "attributes": {
                  "ApproximateReceiveCount": "1",
                  "SentTimestamp": "1234567890",
                  "SenderId": "some-sender-id",
                  "ApproximateFirstReceiveTimestamp": "1234567890"
                },
                "messageAttributes": {},
                "md5OfBody": "some-md5-hash",
                "eventSource": "aws:sqs",
                "eventSourceARN": "arn:aws:sqs:some-region:123456789012:some-queue",
                "awsRegion": "some-region"
              }
            ]
        }
        
        for( let i=0; i < mock_messages.length; i++ ) {
            mock_records.Records[0].body = JSON.stringify(mock_messages[i]);
            await job_handler(mock_records);
        }
    })();
}