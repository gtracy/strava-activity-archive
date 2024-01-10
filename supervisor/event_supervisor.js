const dotenv = require('dotenv-json')({ path:'../.env.json' });

const { DynamoDBClient, ScanCommand, QueryCommand, paginateScan } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient } = require("@aws-sdk/lib-dynamodb");
const { SQSClient, SendMessageCommand } = require("@aws-sdk/client-sqs");

const config = require('../config');

async function job_handler()  {
    const dynamoClient = new DynamoDBClient(config.getAWSConfig());
    const docClient = DynamoDBDocumentClient.from(dynamoClient);
    const sqsClient = new SQSClient(config.getAWSConfig());
    let lastEvaluatedKey = undefined;
    const groupedItems = {};

    const SQSQueueUrl = process.env.SQS_STRAVA_ACTIVITY_JOBS;

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
                const key = `${item.object_id.S}-${item.owner_id.S}`; // Assuming these are strings
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
        
    return { statusCode: 200, body: "Process completed successfully" };
};

exports.handler = job_handler;


        // Step 4: Loop through each grouping and create SQS messages
        // for (const [groupKey, items] of Object.entries(groupedItems)) {
        //     const messageBody = JSON.stringify({ groupKey, items });
        //     const sendMessageCommand = new SendMessageCommand({
        //         QueueUrl: SQSQueueUrl,
        //         MessageBody: messageBody
        //     });
        //     await sqsClient.send(sendMessageCommand);
        // }
