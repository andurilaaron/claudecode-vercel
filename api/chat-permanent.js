/**
 * Simple chat endpoint for PERMANENT IAM credentials
 * No session token needed, no expiry issues!
 */

import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

export const config = {
  runtime: 'edge',
  maxDuration: 30,
};

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

    // Create Bedrock client with PERMANENT credentials
    // NO SESSION TOKEN NEEDED!
    const client = new BedrockRuntimeClient({
      region: process.env.AWS_DEFAULT_REGION || 'us-west-2',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,      // AKIA... (permanent)
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,  // permanent secret
        // NO sessionToken - not needed for permanent credentials!
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
      modelId: 'us.anthropic.claude-sonnet-4-6',
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 4096,
        system: 'You are Claude, a helpful AI assistant.',
        messages: messages,
      }),
    });

    const response = await client.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));

    return new Response(JSON.stringify({
      response: responseBody.content[0].text,
    }), {
      status: 200,
      headers,
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers,
    });
  }
}