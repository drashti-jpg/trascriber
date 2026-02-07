# 🎙️ Meeting Transcriber

A free, open-source web application for recording and transcribing meetings using OpenAI's Whisper API. Built with Hono and deployable to Cloudflare Pages.

## ✨ Features

- **🎤 Record Audio**: Record meetings directly in your browser
- **📁 Upload Files**: Upload existing audio/video files (MP3, WAV, M4A, MP4, etc.)
- **🌍 Multi-language Support**: Auto-detect or specify language (99+ languages)
- **📝 Accurate Transcription**: Powered by OpenAI's Whisper API
- **⚡ Fast & Private**: Runs on Cloudflare's edge network
- **💾 Export Options**: Download as TXT or JSON with timestamps
- **📋 Easy Sharing**: One-click copy to clipboard
- **🎯 No Installation**: Works in any modern browser
- **🎨 Modern UI**: Beautiful dark theme with glassmorphism effects
- **✨ Smooth Animations**: Polished user experience with transitions
- **📱 Responsive Design**: Works perfectly on mobile and desktop

## 🚀 Live Demo

**Sandbox URL**: https://3000-inw9v4akyow5sac4ewxk7-b32ec7bb.sandbox.novita.ai

## 🔧 Setup Instructions

### Prerequisites

1. **OpenAI API Key** (Required for transcription)
   - Sign up at [OpenAI Platform](https://platform.openai.com/signup)
   - Create an API key at [API Keys](https://platform.openai.com/api-keys)
   - Whisper API costs: ~$0.006 per minute of audio

### Local Development

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd webapp
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure API Key**
   Create a `.dev.vars` file in the project root:
   ```
   OPENAI_API_KEY=sk-your-openai-api-key-here
   ```

4. **Build and run**
   ```bash
   npm run build
   npm run dev:sandbox
   ```

5. **Access the app**
   Open http://localhost:3000 in your browser

### Production Deployment to Cloudflare Pages

1. **Build the project**
   ```bash
   npm run build
   ```

2. **Deploy to Cloudflare**
   ```bash
   # First time setup
   npx wrangler pages project create webapp --production-branch main
   
   # Deploy
   npx wrangler pages deploy dist --project-name webapp
   ```

3. **Add API Key Secret**
   ```bash
   npx wrangler pages secret put OPENAI_API_KEY --project-name webapp
   # Enter your OpenAI API key when prompted
   ```

4. **Access your app**
   Your app will be live at: `https://webapp.pages.dev`

## 📖 How to Use

### Recording Audio

1. Click the **🎤 Record** tab
2. Click **Start Recording**
3. Grant microphone permissions if prompted
4. Speak or record your meeting
5. Click **Stop Recording** when done
6. Click **Transcribe Recording**

### Uploading Files

1. Click the **📁 Upload** tab
2. Click to browse or drag and drop your audio/video file
3. Supported formats: MP3, WAV, M4A, MP4, WEBM, and more
4. Click **Transcribe File**

### Language Options

- **Auto-detect**: Let Whisper detect the language automatically
- **Specify Language**: Choose from 12+ common languages for better accuracy

### Export Results

- **📋 Copy**: Copy transcription to clipboard
- **💾 Download TXT**: Download as plain text file
- **💾 Download JSON**: Download with timestamps and metadata

## 🏗️ Tech Stack

- **Backend**: [Hono](https://hono.dev/) - Lightweight web framework
- **Runtime**: [Cloudflare Pages/Workers](https://pages.cloudflare.com/) - Edge deployment
- **API**: [OpenAI Whisper](https://platform.openai.com/docs/guides/speech-to-text) - Speech-to-text
- **Frontend**: Vanilla JavaScript + Tailwind CSS
- **Build Tool**: Vite

## 📊 Project Structure

```
webapp/
├── src/
│   ├── index.tsx          # Main Hono application with API routes
│   └── renderer.tsx       # HTML renderer
├── public/
│   └── static/
│       ├── app.js         # Frontend JavaScript
│       └── style.css      # Custom styles
├── dist/                  # Build output (auto-generated)
├── ecosystem.config.cjs   # PM2 configuration
├── package.json           # Dependencies and scripts
├── wrangler.jsonc         # Cloudflare configuration
└── README.md             # This file
```

## 🔐 Privacy & Security

- **API Key Security**: Your OpenAI API key is stored as an environment variable, never exposed to the client
- **No Data Storage**: Audio files are processed in real-time and not stored on servers
- **HTTPS Only**: All communication is encrypted
- **Client-side Recording**: Audio recording happens in your browser

## 💰 Cost Estimate

OpenAI Whisper API pricing (as of 2026):
- **$0.006 per minute** of audio
- Example: 1 hour meeting = $0.36
- Very affordable for occasional use

## 🛠️ Development Scripts

```bash
npm run dev           # Start Vite dev server
npm run dev:sandbox   # Start Wrangler dev server on 0.0.0.0:3000
npm run build         # Build for production
npm run preview       # Preview production build
npm run deploy        # Build and deploy to Cloudflare Pages
npm run clean-port    # Kill process on port 3000
npm test              # Test local server with curl
```

## 🤝 Contributing

Contributions are welcome! Feel free to:
- Report bugs
- Suggest new features
- Submit pull requests

## 📝 License

MIT License - Feel free to use this project for personal or commercial purposes.

## 🆘 Troubleshooting

### Microphone not working
- Grant microphone permissions in your browser
- Check browser console for errors
- Try a different browser (Chrome/Edge recommended)

### Transcription fails
- Verify your OpenAI API key is correct
- Check that you have credits in your OpenAI account
- Ensure audio file is not corrupted
- Try a smaller file first (< 5 minutes)

### Build errors
- Delete `node_modules` and `dist` folders
- Run `npm install` again
- Ensure Node.js version is 18+ (`node --version`)

## 🔗 Useful Links

- [OpenAI Whisper API Docs](https://platform.openai.com/docs/guides/speech-to-text)
- [Hono Documentation](https://hono.dev/)
- [Cloudflare Pages Docs](https://developers.cloudflare.com/pages/)
- [Wrangler CLI Guide](https://developers.cloudflare.com/workers/wrangler/)

## 📧 Support

For issues or questions:
1. Check the troubleshooting section above
2. Open an issue on GitHub
3. Consult OpenAI Whisper API documentation

---

**Built with ❤️ using Hono + Cloudflare Pages**
