#!/bin/bash

# Script to create dedicated IAM user for Claude Chat app with minimal permissions

echo "🔐 Creating dedicated IAM user for Claude Chat..."

# Variables
USER_NAME="claude-chat-app"
POLICY_NAME="ClaudeChatBedrockMinimalPolicy"

# Create the IAM user
echo "Creating IAM user: $USER_NAME"
aws iam create-user --user-name $USER_NAME

# Create minimal Bedrock policy
echo "Creating minimal Bedrock access policy..."
cat > minimal-bedrock-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "BedrockMinimalAccess",
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream"
      ],
      "Resource": [
        "arn:aws:bedrock:*::foundation-model/anthropic.claude*",
        "arn:aws:bedrock:*::foundation-model/us.anthropic.claude*"
      ]
    },
    {
      "Sid": "BedrockListModels",
      "Effect": "Allow",
      "Action": [
        "bedrock:ListFoundationModels"
      ],
      "Resource": "*"
    }
  ]
}
EOF

# Create the policy
aws iam create-policy \
  --policy-name $POLICY_NAME \
  --policy-document file://minimal-bedrock-policy.json \
  --description "Minimal Bedrock access for Claude chat app"

# Get AWS account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Attach the policy to the user
echo "Attaching minimal Bedrock policy to user..."
aws iam attach-user-policy \
  --user-name $USER_NAME \
  --policy-arn "arn:aws:iam::${ACCOUNT_ID}:policy/${POLICY_NAME}"

# Create access key for the user
echo "Creating permanent access keys..."
ACCESS_KEY_OUTPUT=$(aws iam create-access-key --user-name $USER_NAME)

# Extract the credentials
ACCESS_KEY_ID=$(echo $ACCESS_KEY_OUTPUT | jq -r '.AccessKey.AccessKeyId')
SECRET_ACCESS_KEY=$(echo $ACCESS_KEY_OUTPUT | jq -r '.AccessKey.SecretAccessKey')

# Display the results
echo ""
echo "✅ IAM User Created Successfully!"
echo "================================"
echo ""
echo "Add these to your Vercel Environment Variables:"
echo ""
echo "AWS_ACCESS_KEY_ID=$ACCESS_KEY_ID"
echo "AWS_SECRET_ACCESS_KEY=$SECRET_ACCESS_KEY"
echo "AWS_DEFAULT_REGION=us-west-2"
echo ""
echo "⚠️ IMPORTANT:"
echo "- These are PERMANENT credentials (start with 'AKIA')"
echo "- NO AWS_SESSION_TOKEN needed!"
echo "- They will NEVER expire"
echo "- Save the secret key now - you can't retrieve it again!"
echo ""
echo "🔒 Security Notes:"
echo "- This user has MINIMAL permissions (Bedrock InvokeModel only)"
echo "- Can only access Claude models"
echo "- Cannot access any other AWS services"
echo ""

# Clean up
rm -f minimal-bedrock-policy.json

echo "Done! Your app will never have token expiry issues again! 🎉"