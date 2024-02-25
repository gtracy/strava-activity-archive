const dotenv = require('dotenv-json')({ path:'./packages/shared/.env.json' });

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { CreateTableCommand } = require("@aws-sdk/client-dynamodb");

const config = require('@strava/shared/config');
console.dir(config.getAWSConfig());

async function createActivityGoldTable(table_name) {
  const client = new DynamoDBClient(config.getAWSConfig());

  const params = {
      TableName: table_name,
      KeySchema: [
        { AttributeName: 'activity_id', KeyType: 'HASH' }
      ],
      AttributeDefinitions: [
        { AttributeName: 'activity_id', AttributeType: 'N' }
      ],
      ProvisionedThroughput: {
        ReadCapacityUnits: 5,
        WriteCapacityUnits: 5
      }
  };

  try {
      const data = await client.send(new CreateTableCommand(params));
      console.log("Table Created ", table_name);
  } catch (err) {
      if( err.name == 'ResourceInUseException' ) {
        console.log(table_name + " already exists");
      } else {
        console.error("Error", err);
      }
  }

}

async function createRawWebhookTable(table_name) {
    const client = new DynamoDBClient(config.getAWSConfig());

    const params = {
        TableName: table_name,
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

    try {
        const data = await client.send(new CreateTableCommand(params));
        console.log("Table Created ", table_name);
    } catch (err) {
        if( err.name == 'ResourceInUseException' ) {
          console.log(table_name + " already exists");
        } else {
          console.error("Error", err);
        }
    }
}


async function createUserTable(table_name) {
  const client = new DynamoDBClient(config.getAWSConfig());

  const params = {
      TableName: table_name,
      KeySchema: [
        { AttributeName: 'athlete_id', KeyType: 'HASH' },
      ],
      AttributeDefinitions: [
        { AttributeName: 'athlete_id', AttributeType: 'N' },
      ],
      ProvisionedThroughput: {
        ReadCapacityUnits: 5,
        WriteCapacityUnits: 5
      }
  };
  try {
      const data = await client.send(new CreateTableCommand(params));
      console.log("Table Created ", table_name);
  } catch (err) {
    if( err.name == 'ResourceInUseException' ) {
      console.log(table_name + " already exists");
    } else {
      console.error("Error", err);
    }
  }
}


async function createOAuthTokenTable(table_name) {
  const client = new DynamoDBClient(config.getAWSConfig());

  const params = {
      TableName: table_name,
      KeySchema: [
        { AttributeName: 'athlete_id', KeyType: 'HASH' },
      ],
      AttributeDefinitions: [
        { AttributeName: 'athlete_id', AttributeType: 'N' },
      ],
      ProvisionedThroughput: {
        ReadCapacityUnits: 5,
        WriteCapacityUnits: 5
      }
  };

  try {
      const data = await client.send(new CreateTableCommand(params));
      console.log("Table Created ", table_name);
  } catch (err) {
    if( err.name == 'ResourceInUseException' ) {
      console.log(table_name + " already exists");
    } else {
      console.error("Error", err);
    }
}
}

(async () => {
    await createRawWebhookTable(process.env.DYNAMO_RAW_WEBHOOK_TABLE);
    await createUserTable(process.env.DYNAMO_USER_TABLE);
    await createOAuthTokenTable(process.env.DYNAMO_OAUTH_TOKEN_TABLE);
    await createActivityGoldTable(process.env.DYNAMO_GOLD_ACTIVITY_TABLE);
})();

