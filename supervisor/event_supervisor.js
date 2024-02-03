const dotenv = require('dotenv-json')({ path:'../.env.json' });

const { DynamoDBClient, ScanCommand, QueryCommand, paginateScan } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient } = require("@aws-sdk/lib-dynamodb");
const { SQSClient, SendMessageCommand } = require("@aws-sdk/client-sqs");

const config = require('../config');

// Job only has a couple of pieces of work to do
//   1. read out all unfinished work from Dynamo
//   2. push messages (jobs) into SQS
//
async function job_handler()  {
    const dynamoClient = new DynamoDBClient(config.getAWSConfig());
    const docClient = DynamoDBDocumentClient.from(dynamoClient);
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
                console.dir(item);
                // the key aggregates all webhook events for a single activity
                // for each user. 
                const key = `${item.object_id.N}-${item.owner_id.N}`;
                groupedItems[key] = groupedItems[key] || [];
                groupedItems[key].push(item);
            });

            // Set the lastEvaluatedKey for the next page
            lastEvaluatedKey = response.LastEvaluatedKey;

        } catch (error) {
            console.error("Error:", error);
            return { statusCode: 500, body: "Internal Server Error" };
        }

    } while( lastEvaluatedKey )
    console.dir(groupedItems);

    // run the group and create a single task to be pushed into SQS
    // for each owner / activity pair
    //
    try {
        for (const [key, items] of Object.entries(groupedItems)) {
            if (items.length > 0) {
                // Select one object from the array (e.g., the first one)
                const item = items[0];

                // Prepare the message
                const messageBody = {
                    owner_id: item.owner_id.N,
                    object_id: item.object_id.N,
                    archive_id: item.archive_id.S
                };
                console.dir(messageBody);
                const params = {
                    QueueUrl: config.getSQSConfig(),
                    MessageBody: JSON.stringify(messageBody),
                };

                // Send the message to SQS
                const result = await sqsClient.send(new SendMessageCommand(params));
                console.log(`Message sent for key ${key}:`, result);
            }
        }
        return { statusCode: 200, body: "Process completed successfully" };
    } catch (error) {
        console.error("Error:", error);
        return { statusCode: 500, body: "Internal Server Error" };
    }
        
};

exports.handler = job_handler;
