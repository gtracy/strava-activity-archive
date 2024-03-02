'use strict';

const config = require('@strava/shared/config');
const logger = require('pino')(config.getLogConfig());
const dotenv = require('dotenv-json')({ path:'../shared/.env.json' });

const { DynamoDBClient, ScanCommand } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const { SQSClient, SendMessageCommand } = require("@aws-sdk/client-sqs");


async function updatePropertyForItems(archive_id_list) {
    const dynamoClient = new DynamoDBClient(config.getAWSConfig());
    const docClient = DynamoDBDocumentClient.from(dynamoClient);

    logger.debug('update fetched field for '+archive_id_list);
    const updatePromises = archive_id_list.map(id => {
        const updateParams = {
            TableName: process.env.DYNAMO_RAW_WEBHOOK_TABLE,
            Key: { 'archive_id': id },
            UpdateExpression: `set #p = :v`,
            ExpressionAttributeNames: { '#p': 'fetched' },
            ExpressionAttributeValues: { ':v': 'true' },
        };

        return docClient.send(new UpdateCommand(updateParams));
    });

    try {
        await Promise.all(updatePromises);
        logger.info('All items updated successfully');
    } catch (error) {
        logger.error(error,'Error updating items:');
    }
}

// Job only has a couple of pieces of work to do
//   1. read out all unfinished work from Dynamo
//   2. push messages (jobs) into SQS
//
async function job_handler()  {
    const dynamoClient = new DynamoDBClient(config.getAWSConfig());
    const sqsClient = new SQSClient(config.getAWSConfig(true));
    let lastEvaluatedKey = undefined;
    const groupedItems = {};

    do {
        try {
            // Query DynamoDB for work to be done and paginate through results
            const params = {
                TableName: process.env.DYNAMO_RAW_WEBHOOK_TABLE,
                FilterExpression: '#fetched = :value',
                ExpressionAttributeNames: {
                    '#fetched': 'fetched'
                },
                ExpressionAttributeValues: {
                    ':value': { S: 'false' } 
                },
                ExclusiveStartKey: lastEvaluatedKey  // pagination
            };
                        
            const response = await dynamoClient.send(new ScanCommand(params));

            // Process the items returned by the current page
            response.Items.forEach(item => {
                // the key aggregates all webhook events for a single activity
                // for each user. 
                const key = `${item.object_id.N}-${item.owner_id.N}`;
                groupedItems[key] = groupedItems[key] || [];
                groupedItems[key].push(item);
            });

            // Set the lastEvaluatedKey for the next page
            lastEvaluatedKey = response.LastEvaluatedKey;

        } catch (error) {
            logger.error(error,"Error:");
            return { statusCode: 500, body: "Internal Server Error" };
        }

    } while( lastEvaluatedKey )

    // run through the group and create a single task to be pushed into SQS
    // for each owner / activity pair. 
    // if message was successfully created, flip the fetched flag for all
    // related records.
    //
    try {
        for (const [key, items] of Object.entries(groupedItems)) {
            if (items.length > 0) {
                let messageBody = {};

                // if there is a delete record in the list, that
                // trumps everything else.
                const deleteItems = items.filter(item => item.aspect_type.S === "delete");
                if( deleteItems.length > 0 ) {
                    const item = deleteItems[0];
                    logger.info('***** DELETE *****');
                    messageBody = {
                        athlete_id: item.owner_id.N,
                        activity_id: item.object_id.N,
                        archive_id: item.archive_id.S,
                        aspect_type: 'delete'
                    };
                } else {
                    const item = items[0];
                    messageBody = {
                        athlete_id: item.owner_id.N,
                        activity_id: item.object_id.N,
                        archive_id: item.archive_id.S,
                        aspect_type: item.aspect_type.S
                    };
                }

                logger.info('new activity task created: ',messageBody);
                const params = {
                    QueueUrl: config.getSQSConfig('activity_fetch'),
                    MessageBody: JSON.stringify(messageBody),
                };

                // Send the message to SQS
                const result = await sqsClient.send(new SendMessageCommand(params));
                logger.debug(`Message sent for key ${key}:`, result.MessageId);

                // toggle the fetched flag to mark all of these items as processed
                const archiveIds = items.map(item => item.archive_id.S);
                updatePropertyForItems(archiveIds);

            }
        }
        return { statusCode: 200, body: "Process completed successfully" };
    } catch (error) {
        logger.error(error,"Error:", );
        return { statusCode: 500, body: "Internal Server Error" };
    }
        
};

exports.handler = job_handler;
