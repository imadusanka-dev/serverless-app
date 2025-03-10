'use strict';
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand, UpdateCommand, DeleteCommand, GetCommand, ScanCommand } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({ region: "us-east-1" });
const ddbDocClient = DynamoDBDocumentClient.from(client);

const tableName = process.env.TABLE_NAME;

module.exports.createNote = async (event) => {
  const data = JSON.parse(event.body);

  try {
    await ddbDocClient.send(
      new PutCommand({
        TableName: tableName,
        Item: {
          noteId: crypto.randomUUID(),
          title: data.title,
          body: data.body,
        },
        ConditionExpression: "attribute_not_exists(noteId)"
      })
    );

    return {
      statusCode: 201,
      body: JSON.stringify({
        message: "Note created successfully",
      }),
    }
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: error.message,
      }),
    }
  }
};

module.exports.updateNote = async (event) => {
  const noteId = event.pathParameters.id;
  const data = JSON.parse(event.body);

  try {
    await ddbDocClient.send(
      new UpdateCommand({
        TableName: tableName,
        Key: {
          noteId: noteId
        },
        UpdateExpression: "set #title = :title, #body = :body",
        ExpressionAttributeNames: {
          "#title": "title",
          "#body": "body"
        },
        ExpressionAttributeValues: {
          ":title": data.title,
          ":body": data.body
        },
        ConditionExpression: "attribute_exists(noteId)"
      })
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Note updated successfully",
      }),
    }
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: error.message,
      }),
    }
  }
};

module.exports.getNoteById = async (event) => {
  const noteId = event.pathParameters.id;

  try {
    const data = await ddbDocClient.send(
      new GetCommand({
        TableName: tableName,
        Key: {
          noteId: noteId
        },
      })
    );

    if (!data.Item) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          message: "Note not found",
        }),
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        data: data.Item,
      }),
    }
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: error.message,
      }),
    }
  }
};

module.exports.getAllNotes = async () => {
  try {
    let params = {
      TableName: tableName
    };

    let lastEvaluatedKey = null;
    let notes = [];

    do {
      if (lastEvaluatedKey) {
        params.ExclusiveStartKey = lastEvaluatedKey;
      }

      const data = await ddbDocClient.send(
        new ScanCommand(params)
      );
      lastEvaluatedKey = data.LastEvaluatedKey;

      notes = notes.concat(data.Items);
    } while (lastEvaluatedKey);

    return {
      statusCode: 200,
      body: JSON.stringify({
        data: notes,
      }),
    }
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: error.message,
      }),
    }
  }
};

module.exports.deleteNote = async (event) => {
  const noteId = event.pathParameters.id;

  try {
    await ddbDocClient.send(
      new DeleteCommand({
        TableName: tableName,
        Key: {
          noteId: noteId
        },
        ConditionExpression: "attribute_exists(noteId)"
      })
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Note deleted successfully",
      }),
    }
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: error.message,
      }),
    }
  }
};
