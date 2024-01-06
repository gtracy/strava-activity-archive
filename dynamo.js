const dotenv = require('dotenv-json')();
const { v4: uuidv4 } = require('uuid');

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand } = require("@aws-sdk/lib-dynamodb");
const { CreateTableCommand } = require("@aws-sdk/client-dynamodb");

const config = require('./config');
console.dir(config.getAWSConfig());

async function dynamoPutObject(item) {
    // Initialize the DynamoDB client
    const client = new DynamoDBClient(config.getAWSConfig());
    const docClient = DynamoDBDocumentClient.from(client);

    try {
        // add-on a unique identifier for the record
        item.Item['archive_id'] = uuidv4();

        // Insert the item into the DynamoDB table
        const data = await docClient.send(new PutCommand(item));
        console.log("Item inserted successfully:", data);
        return true;
    } catch (error) {
        console.error("Error inserting item into DynamoDB:", error);
        return false;
    }
};


async function createTableWithGSI() {
    const client = new DynamoDBClient(config.getAWSConfig());

    const params = {
        TableName: process.env.DYNAMO_RAW_WEBHOOK_TABLE,
        KeySchema: [
            { AttributeName: "owner_id", KeyType: "HASH" },  // Partition key
            { AttributeName: "archive_id", KeyType: "RANGE" }  // Sort key
        ],
        AttributeDefinitions: [
            { AttributeName: "owner_id", AttributeType: "S" },
            { AttributeName: "archive_id", AttributeType: "S" },
            { AttributeName: "event_time", AttributeType: "N" } // Additional attribute for GSI
        ],
        GlobalSecondaryIndexes: [
            {
                IndexName: "EventTimeIndex",
                KeySchema: [
                    { AttributeName: "event_time", KeyType: "HASH" }  // GSI Partition key
                    // Optionally add a sort key here
                ],
                Projection: {
                    ProjectionType: "ALL" // You can choose KEYS_ONLY, INCLUDE, or ALL
                },
                ProvisionedThroughput: {
                    ReadCapacityUnits: 1,
                    WriteCapacityUnits: 1
                }
            }
        ],
        ProvisionedThroughput: {
            ReadCapacityUnits: 1,
            WriteCapacityUnits: 1
        }
    };
    console.dir(params);

    try {
        const data = await client.send(new CreateTableCommand(params));
        console.log("Table Created", data);
    } catch (err) {
        console.error("Error", err);
    }
}

module.exports = {dynamoPutObject, createTableWithGSI};
