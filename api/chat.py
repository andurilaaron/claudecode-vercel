"""
Vercel Serverless Function for Claude Chat
Auto-refreshes AWS credentials on each invocation
"""

import json
import os
import boto3
from http.server import BaseHTTPRequestHandler

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        # CORS headers
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')

        if self.path == '/api/chat':
            try:
                # Get request body
                content_length = int(self.headers['Content-Length'])
                post_data = self.rfile.read(content_length)
                body = json.loads(post_data)

                message = body.get('message', '')
                history = body.get('history', [])

                # Fresh Bedrock client for each request
                bedrock = boto3.client(
                    'bedrock-runtime',
                    region_name=os.environ.get('AWS_DEFAULT_REGION', 'us-west-2'),
                    aws_access_key_id=os.environ.get('AWS_ACCESS_KEY_ID'),
                    aws_secret_access_key=os.environ.get('AWS_SECRET_ACCESS_KEY'),
                    aws_session_token=os.environ.get('AWS_SESSION_TOKEN')
                )

                # Build messages
                messages = []
                for h in history[:-1]:
                    messages.append({'role': h['role'], 'content': h['content']})

                messages.append({'role': 'user', 'content': message})

                # Invoke Claude
                response = bedrock.invoke_model(
                    modelId='us.anthropic.claude-sonnet-4-6',
                    body=json.dumps({
                        'anthropic_version': 'bedrock-2023-05-31',
                        'max_tokens': 4096,
                        'system': 'You are Claude, a helpful AI assistant.',
                        'messages': messages
                    }),
                    contentType='application/json'
                )

                result = json.loads(response['body'].read())
                text = result['content'][0]['text']

                # Send response
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'response': text}).encode())

            except Exception as e:
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'error': str(e)}).encode())

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()