# Claude Chat Mobile - Vercel Edition

Auto-refreshing Claude chat app for mobile, deployed on Vercel.

## 🚀 Quick Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/andurilaaron/claudecode-vercel)

## 📱 Features

- Works on iPhone as PWA (Progressive Web App)
- Auto-refreshing AWS credentials
- Serverless - scales automatically
- No token expiry issues

## 🔧 Setup

1. Fork/clone this repo
2. Deploy to Vercel
3. Add environment variables in Vercel dashboard:
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `AWS_SESSION_TOKEN`
   - `AWS_DEFAULT_REGION` (default: us-west-2)
   - `MODEL_ID` (default: us.anthropic.claude-sonnet-4-6)

## 📱 Install on iPhone

1. Open deployed URL in Safari
2. Tap Share → Add to Home Screen
3. Done! You have a Claude app

## 🔄 Token Refresh

The app creates a new Bedrock client on each request, so credentials are always fresh.
Just update the environment variables in Vercel when your AWS tokens expire.

## 📝 License

MIT