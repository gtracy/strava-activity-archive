const dotenv = require('dotenv-json')({ path:'../.env.json' });

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { CreateTableCommand } = require("@aws-sdk/client-dynamodb");

const config = require('../../config');
console.dir(config.getAWSConfig());


async function createRawWebhookTable(table_name) {
    const client = new DynamoDBClient(config.getAWSConfig());

    const params = {
        TableName: table_name,
        KeySchema: [
            { AttributeName: "owner_id", KeyType: "HASH" },  // Partition key
            { AttributeName: "archive_id", KeyType: "RANGE" }  // Sort key
        ],
        AttributeDefinitions: [
            { AttributeName: "owner_id", AttributeType: "S" },
            { AttributeName: "archive_id", AttributeType: "S" },
            { AttributeName: "event_time", AttributeType: "N" }, // Additional attribute for GSI
            { AttributeName: "object_id", AttributeType: "S" } // Additional attribute for GSI
        ],
        GlobalSecondaryIndexes: [
            {
                IndexName: "EventTimeIndex",
                KeySchema: [
                    { AttributeName: "object_id", KeyType: "HASH" },  // GSI Partition key
                    { AttributeName: "event_time", KeyType: "RANGE"}
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

(async () => {
    createRawWebhookTable(process.env.DYNAMO_RAW_WEBHOOK_TABLE);
})();

