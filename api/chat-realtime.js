/**
 * Real-time credential fetching for work-controlled AWS keys
 * Reads credentials from AWS CLI/SSO on each request
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

const execAsync = promisify(exec);

export const config = {
  runtime: 'nodejs18.x',  // Need Node.js runtime for exec
  maxDuration: 30,
};

/**
 * Get fresh AWS credentials from the system
 * This reads from your AWS CLI configuration in real-time
 */
async function getFreshCredentials() {
  try {
    // Method 1: Try AWS CLI export-credentials (works with SSO)
    const { stdout } = await execAsync('aws configure export-credentials --format json');
    const creds = JSON.parse(stdout);

    return {
      accessKeyId: creds.AccessKeyId,
      secretAccessKey: creds.SecretAccessKey,
      sessionToken: creds.SessionToken,
      expiration: creds.Expiration
    };
  } catch (error) {
    console.error('Failed to get credentials from AWS CLI:', error);

    // Method 2: Try reading from environment (fallback)
    if (process.env.AWS_ACCESS_KEY_ID) {
      return {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        sessionToken: process.env.AWS_SESSION_TOKEN
      };
    }

    // Method 3: Try reading from ~/.aws/credentials file
    try {
      const fs = require('fs');
      const path = require('path');
      const os = require('os');

      const credFile = path.join(os.homedir(), '.aws', 'credentials');
      const credentials = fs.readFileSync(credFile, 'utf8');

      // Parse the credentials file
      const lines = credentials.split('\n');
      let accessKey, secretKey, sessionToken;

      for (const line of lines) {
        if (line.includes('aws_access_key_id')) {
          accessKey = line.split('=')[1].trim();
        } else if (line.includes('aws_secret_access_key')) {
          secretKey = line.split('=')[1].trim();
        } else if (line.includes('aws_session_token')) {
          sessionToken = line.split('=')[1].trim();
        }
      }

      if (accessKey && secretKey) {
        return {
          accessKeyId: accessKey,
          secretAccessKey: secretKey,
          sessionToken: sessionToken
        };
      }
    } catch (fileError) {
      console.error('Failed to read credentials file:', fileError);
    }

    throw new Error('No valid AWS credentials found');
  }
}

export default async function handler(request) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers });
  }

  try {
    const body = await request.json();
    const { message, history = [] } = body;

    // Get fresh credentials on every request
    console.log('Fetching fresh AWS credentials...');
    const credentials = await getFreshCredentials();
    console.log('Got credentials, expires:', credentials.expiration || 'unknown');

    // Create Bedrock client with fresh credentials
    const client = new BedrockRuntimeClient({
      region: process.env.AWS_DEFAULT_REGION || 'us-west-2',
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
        sessionToken: credentials.sessionToken,
      },
    });

    // Build messages
    const messages = [];
    for (const h of history.slice(0, -1)) {
      messages.push({ role: h.role, content: h.content });
    }
    messages.push({ role: 'user', content: message });

    // Call Bedrock
    const command = new InvokeModelCommand({
      modelId: process.env.MODEL_ID || 'us.anthropic.claude-sonnet-4-6',
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 4096,
        system: 'You are Claude, a helpful AI assistant for logistics at Anduril Australia.',
        messages: messages,
        temperature: 0.7,
      }),
    });

    const response = await client.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));

    return new Response(JSON.stringify({
      response: responseBody.content[0].text,
      credentialsExpiry: credentials.expiration || 'unknown'
    }), {
      status: 200,
      headers,
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({
      error: error.message || 'Failed to process request',
      details: 'Check if AWS CLI is configured and credentials are valid'
    }), {
      status: 500,
      headers,
    });
  }
}