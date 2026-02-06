# Quick Start Guide

## 🚀 Using the App Right Now

**Live Demo**: https://3000-inw9v4akyow5sac4ewxk7-b32ec7bb.sandbox.novita.ai

### Important Note
⚠️ The app requires an **OpenAI API key** to function. The transcription uses OpenAI's Whisper API which costs approximately **$0.006 per minute** of audio.

## 🔑 Getting Your OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com/signup)
2. Sign up for a free account
3. Navigate to [API Keys](https://platform.openai.com/api-keys)
4. Click **"Create new secret key"**
5. Copy the key (starts with `sk-`)
6. Add credits to your account (minimum $5 recommended)

## 🎯 Two Ways to Use This App

### Option 1: Use the Sandbox (Temporary - Current Session)
The app is running at the URL above, but you need to configure the API key:

**For testing in sandbox:**
```bash
# Create .dev.vars file
echo 'OPENAI_API_KEY=sk-your-key-here' > /home/user/webapp/.dev.vars

# Restart the service
cd /home/user/webapp
pm2 restart webapp
```

### Option 2: Deploy to Cloudflare Pages (Permanent & Free)
Deploy your own copy that runs forever:

```bash
# 1. Build the project
cd /home/user/webapp
npm run build

# 2. Create Cloudflare Pages project
npx wrangler pages project create webapp --production-branch main

# 3. Deploy
npx wrangler pages deploy dist --project-name webapp

# 4. Add your API key as a secret
npx wrangler pages secret put OPENAI_API_KEY --project-name webapp
# (paste your OpenAI API key when prompted)
```

Your app will be live at: `https://webapp.pages.dev`

## 📱 How to Use

### Recording Audio
1. Click **🎤 Record** tab
2. Click **Start Recording** (grant microphone permission)
3. Speak or record your meeting
4. Click **Stop Recording**
5. Click **Transcribe Recording**

### Uploading Files
1. Click **📁 Upload** tab
2. Upload your audio/video file (MP3, WAV, M4A, MP4, etc.)
3. Click **Transcribe File**

### Features
- ✅ Auto-language detection (99+ languages)
- ✅ Timestamps for each segment
- ✅ Copy to clipboard
- ✅ Download as TXT or JSON
- ✅ Works on mobile and desktop

## 💰 Pricing Reference

OpenAI Whisper API costs:
- **$0.006 per minute** (~$0.36 per hour)
- 10 minute meeting = $0.06
- 1 hour meeting = $0.36
- Very affordable for regular use!

## 🛠️ Alternative: 100% Free Offline Options

If you don't want to use the OpenAI API, consider these alternatives:

1. **Whisper Desktop** - Free offline app
   - Download: [GitHub - whisper.cpp](https://github.com/ggerganov/whisper.cpp)
   - Runs completely offline on your laptop
   - No API costs

2. **MacWhisper** (Mac only)
   - Free tier with unlimited transcriptions
   - Native Mac app
   - Download: https://goodsnooze.gumroad.com/l/macwhisper

3. **Whispering** - Open source
   - Beautiful UI, works offline
   - GitHub: [Whispering](https://github.com/Whisper-Transcription/Whispering)

## 📊 Project Files

```
webapp/
├── src/index.tsx          # Backend API with Whisper integration
├── public/static/app.js   # Frontend recording logic
├── .dev.vars.example      # API key template
└── README.md              # Full documentation
```

## 🆘 Troubleshooting

**"OpenAI API key not configured" error**
- Create `.dev.vars` file with your API key
- Restart the service: `pm2 restart webapp`

**Microphone not working**
- Grant microphone permissions in browser settings
- Try Chrome or Edge browser

**Transcription fails**
- Check your OpenAI account has credits
- Verify API key is correct
- Try a smaller file first

## 📧 Need Help?

See the full [README.md](./README.md) for detailed documentation.

---

**Built with Hono + Cloudflare Pages + OpenAI Whisper**
