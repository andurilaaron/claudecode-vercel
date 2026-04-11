# 🔑 Solutions for Token Expiry

## The Problem
Your AWS credentials (with `AWS_SESSION_TOKEN`) expire every ~1 hour, breaking your app.

---

## Solution 1: Use PERMANENT AWS IAM User (Simplest) ⭐

### Steps:
1. **Create an IAM user in AWS Console:**
   - Go to AWS IAM → Users → Add User
   - Give programmatic access
   - Attach policy: `AmazonBedrockFullAccess`
   - Save the Access Key ID and Secret Key

2. **Use these PERMANENT credentials in Vercel:**
   ```
   AWS_ACCESS_KEY_ID = AKIA... (starts with AKIA, not ASIA)
   AWS_SECRET_ACCESS_KEY = [permanent secret]
   # NO AWS_SESSION_TOKEN needed!
   ```

3. **Result:** Your app NEVER expires! ✅

**Pros:** Never expires, simple
**Cons:** Less secure than temporary credentials

---

## Solution 2: GitHub Actions Auto-Refresh (Automated) 🤖

### Setup:
1. **Create GitHub Action** (`.github/workflows/refresh.yml`):
```yaml
name: Refresh AWS Credentials
on:
  schedule:
    - cron: '*/45 * * * *'  # Every 45 minutes
  workflow_dispatch:  # Manual trigger

jobs:
  refresh:
    runs-on: ubuntu-latest
    steps:
      - name: Configure AWS
        uses: aws-actions/configure-aws-credentials@v2
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: us-west-2

      - name: Update Vercel
        run: |
          curl -X PATCH https://api.vercel.com/v10/projects/${{ secrets.VERCEL_PROJECT_ID }}/env \
            -H "Authorization: Bearer ${{ secrets.VERCEL_TOKEN }}" \
            -d "{\"key\":\"AWS_ACCESS_KEY_ID\",\"value\":\"$AWS_ACCESS_KEY_ID\"}"
```

**Result:** Automatically refreshes every 45 minutes!

---

## Solution 3: AWS Lambda Token Refresher 🔄

### Create a Lambda function that:
1. Gets fresh credentials using STS
2. Updates Vercel via API
3. Runs every 45 minutes via CloudWatch Events

```python
import boto3
import requests
import os

def lambda_handler(event, context):
    # Get fresh credentials
    sts = boto3.client('sts')
    creds = sts.get_session_token(DurationSeconds=3600)

    # Update Vercel
    vercel_token = os.environ['VERCEL_TOKEN']
    project_id = os.environ['VERCEL_PROJECT_ID']

    # Update each environment variable
    for key, value in {
        'AWS_ACCESS_KEY_ID': creds['Credentials']['AccessKeyId'],
        'AWS_SECRET_ACCESS_KEY': creds['Credentials']['SecretAccessKey'],
        'AWS_SESSION_TOKEN': creds['Credentials']['SessionToken']
    }.items():
        requests.patch(
            f'https://api.vercel.com/v10/projects/{project_id}/env',
            headers={'Authorization': f'Bearer {vercel_token}'},
            json={'key': key, 'value': value}
        )

    return {'statusCode': 200}
```

---

## Solution 4: External Cron Service 🕐

Use a service like:
- **cron-job.org** (free)
- **EasyCron**
- **Zapier**

To call your `/api/refresh` endpoint every 45 minutes.

---

## Solution 5: Client-Side Workaround 📱

Modify your iPhone app to:
1. Detect token expiry errors
2. Show a "Tap to refresh" button
3. Call a refresh endpoint
4. Retry the request

```javascript
// In your app
async function chatWithRetry(message) {
  try {
    return await sendChat(message);
  } catch (error) {
    if (error.message.includes('ExpiredToken')) {
      await fetch('/api/trigger-refresh');
      await new Promise(r => setTimeout(r, 5000)); // Wait 5 seconds
      return await sendChat(message); // Retry
    }
    throw error;
  }
}
```

---

## 🎯 My Recommendation:

### For Immediate Fix:
**Use Solution 1** - Create permanent IAM credentials. Your app will never break.

### For Production:
**Use Solution 2 or 3** - Automated refresh with proper security.

### Quick Commands:

**To get permanent credentials:**
```bash
aws iam create-user --user-name claude-chat-user
aws iam attach-user-policy --user-name claude-chat-user --policy-arn arn:aws:iam::aws:policy/AmazonBedrockFullAccess
aws iam create-access-key --user-name claude-chat-user
```

**To test if credentials are permanent:**
```bash
# Permanent keys start with "AKIA"
# Temporary keys start with "ASIA"
echo $AWS_ACCESS_KEY_ID | head -c 4
```

---

## ⚠️ Current Status:

Your current credentials starting with `ASIA` are TEMPORARY and will expire.

**Choose one of the solutions above to fix this permanently!**