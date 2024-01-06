const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand } = require("@aws-sdk/lib-dynamodb");

const config = require('./config');
console.dir(config.getAWSConfig());

module.exports = async function dynamoPutObject(item) {
    // Initialize the DynamoDB client
    const client = new DynamoDBClient(config.getAWSConfig());
    const docClient = DynamoDBDocumentClient.from(client);

    try {
        // Insert the item into the DynamoDB table
        const data = await docClient.send(new PutCommand(item));
        console.log("Item inserted successfully:", data);
        return true;
    } catch (error) {
        console.error("Error inserting item into DynamoDB:", error);
        return false;
    }
};
