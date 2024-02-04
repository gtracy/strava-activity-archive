const dotenv = require('dotenv-json')({ path:'../.env.json' });

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { CreateTableCommand } = require("@aws-sdk/client-dynamodb");

const config = require('../../config');
console.dir(config.getAWSConfig());


async function createRawWebhookTable(table_name) {
    const client = new DynamoDBClient(config.getAWSConfig());

    const params = {
        TableName: process.env.DYNAMO_RAW_WEBHOOK_TABLE,
        KeySchema: [
          { AttributeName: 'archive_id', KeyType: 'HASH' }, // Primary key
        ],
        AttributeDefinitions: [
          { AttributeName: 'archive_id', AttributeType: 'S' },
        ],
        ProvisionedThroughput: {
          ReadCapacityUnits: 5,
          WriteCapacityUnits: 5
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

