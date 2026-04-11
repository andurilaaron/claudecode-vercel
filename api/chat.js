import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

export const config = {
  runtime: 'edge',
  maxDuration: 30,
};

export default async function handler(request) {
  // CORS headers
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

    // Create Bedrock client with credentials from environment
    const client = new BedrockRuntimeClient({
      region: process.env.AWS_DEFAULT_REGION || 'us-west-2',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        sessionToken: process.env.AWS_SESSION_TOKEN,
      },
    });

    // Build messages array
    const messages = [];
    for (const h of history.slice(0, -1)) {
      messages.push({ role: h.role, content: h.content });
    }
    messages.push({ role: 'user', content: message });

    // Prepare the request
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

    // Invoke the model
    const response = await client.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));

    return new Response(JSON.stringify({
      response: responseBody.content[0].text,
    }), {
      status: 200,
      headers,
    });

  } catch (error) {
    console.error('Chat error:', error);
    return new Response(JSON.stringify({
      error: error.message || 'Failed to process request',
    }), {
      status: 500,
      headers,
    });
  }
}