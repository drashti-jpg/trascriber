# 🎙️ Meeting Transcriber

A free, open-source web application for recording and transcribing meetings using OpenAI's Whisper API. Built with Hono and deployable to Cloudflare Pages.

## ✨ Features

### 🎙️ Audio Capture
- **🎤 Microphone Recording**: Record your voice directly
- **🖥️ Browser Tab Audio**: Capture audio from meeting tabs (Google Meet, Teams, Zoom)
- **🔊 System Audio**: Record desktop app audio with your voice
- **🎵 Audio Mixing**: Combines your microphone + meeting audio in real-time

### 📁 Project Management
- **📂 Organize by Projects**: Create folders for different clients/teams
- **🎨 Color Coding**: Assign colors to projects for easy identification
- **📊 Track Transcripts**: All recordings saved to selected project
- **🔍 Easy Navigation**: Switch between projects with dropdown

### 📝 Professional Formatting
- **📋 Internal MOM**: Casual team format with action items
- **📄 Client-Facing MOM**: Professional format with decisions table
- **📃 Standard Transcript**: Full text with timestamps
- **📥 PDF Export**: Download formatted documents

### 🌍 Transcription
- **🎯 99+ Languages**: Auto-detect or specify language
- **⚡ Fast Processing**: Powered by OpenAI's Whisper API
- **📊 Word-level Timestamps**: Precise timing for each word
- **💾 Multiple Formats**: TXT, JSON export options

### 💻 User Experience
- **🎨 Modern UI**: Dark theme with glassmorphism effects
- **✨ Smooth Animations**: Polished transitions and interactions
- **📱 Responsive Design**: Works on mobile and desktop
- **🎯 No Installation**: Pure web application
- **⚡ Edge Performance**: Runs on Cloudflare's global network

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
   git clone https://github.com/drashti-jpg/trascriber.git
   cd trascriber
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

### 1️⃣ Select or Create a Project

1. Use the **📁 Select Project** dropdown to choose an existing project
2. Or click **➕ New Project** to create a new folder:
   - Enter project name (e.g., "Client A Meetings")
   - Add description (optional)
   - Choose a color for easy identification
   - Click **Create Project**

### 2️⃣ Choose Audio Source

**Option A: Microphone** 🎤
- Records your voice only
- Best for: Voice notes, in-person meetings

**Option B: Browser Tab** 🖥️ (Recommended for online meetings)
- Captures your voice + meeting audio
- Works with: Google Meet, Microsoft Teams (web), Zoom (web)
- Steps:
  1. Click "Browser Tab"
  2. Grant microphone permission
  3. Select the meeting tab when prompted
  4. ✅ Check "Share audio" checkbox (CRITICAL!)
  5. Start recording

**Option C: System Audio** 🔊
- Captures your voice + all system audio
- Works with: Desktop apps (Zoom desktop, Teams desktop)
- Steps:
  1. Click "System Audio"
  2. Grant microphone permission
  3. Select screen/window to share
  4. ✅ Check "Share system audio" checkbox
  5. Start recording

### 3️⃣ Record or Upload

**Recording:**
1. Click **Start Recording**
2. Grant necessary permissions
3. Recording shows timer and pulse animation
4. Click **Stop Recording** when done
5. Preview audio playback
6. Click **Transcribe Recording**

**Uploading:**
1. Switch to **📁 Upload** tab
2. Drag and drop or click to browse
3. Supported formats: MP3, WAV, M4A, MP4, WEBM
4. Max size: 25MB
5. Click **Transcribe File**

### 4️⃣ Choose Format & Save

After transcription completes:
1. **Select Format Type**:
   - 📝 Internal MOM (team meetings)
   - 📄 Client-Facing MOM (professional)
   - 📋 Standard Transcript (verbatim)
   - 📥 PDF Export

2. **Add Meeting Details**:
   - Meeting Title (required)
   - Attendees
   - Company/Client Name
   - Date

3. Click **💾 Save Transcript**

### 5️⃣ View & Export Results

- **📋 Copy Text**: Copy to clipboard
- **💾 Download TXT**: Plain text file
- **💾 Download JSON**: With timestamps and metadata
- View formatted output with:
  - Language detected
  - Duration
  - Full transcript text

## 🏗️ Tech Stack

- **Backend**: [Hono](https://hono.dev/) - Lightweight web framework
- **Runtime**: [Cloudflare Pages/Workers](https://pages.cloudflare.com/) - Edge deployment
- **Database**: [Cloudflare D1](https://developers.cloudflare.com/d1/) - SQLite at the edge
- **API**: [OpenAI Whisper](https://platform.openai.com/docs/guides/speech-to-text) - Speech-to-text
- **Audio**: Web Audio API - Real-time audio mixing
- **Frontend**: Vanilla JavaScript + Tailwind CSS
- **Build Tool**: Vite

## 🗄️ Database Schema

### Projects Table
```sql
CREATE TABLE projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#3b82f6',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Transcripts Table
```sql
CREATE TABLE transcripts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  attendees TEXT,
  company TEXT,
  meeting_date DATE,
  duration REAL,
  language TEXT,
  audio_source TEXT,
  format_type TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);
```

## 📊 Project Structure

```
webapp/
├── src/
│   ├── index.tsx          # Main Hono application with API routes
│   ├── renderer.tsx       # HTML renderer
│   └── formatting.ts      # MOM formatting logic
├── public/
│   └── static/
│       ├── app.js         # Frontend JavaScript
│       └── style.css      # Custom styles
├── migrations/
│   └── 0001_initial_schema.sql  # D1 database schema
├── dist/                  # Build output (auto-generated)
├── ecosystem.config.cjs   # PM2 configuration
├── package.json           # Dependencies and scripts
├── wrangler.jsonc         # Cloudflare configuration
├── QUICKSTART.md         # Quick start guide
├── AUDIO_CAPTURE_GUIDE.md # Audio capture documentation
├── USER_GUIDE.md         # Detailed user guide
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
npm run dev              # Start Vite dev server
npm run dev:sandbox      # Start Wrangler dev server on 0.0.0.0:3000
npm run dev:d1           # Start with D1 database (local)
npm run build            # Build for production
npm run preview          # Preview production build
npm run deploy           # Build and deploy to Cloudflare Pages
npm run deploy:prod      # Deploy with project name
npm run clean-port       # Kill process on port 3000
npm test                 # Test local server with curl

# Database commands
npm run db:migrate:local  # Apply migrations locally
npm run db:migrate:prod   # Apply migrations to production
npm run db:seed          # Seed test data
npm run db:reset         # Reset local database
npm run db:console:local # Open local D1 console
npm run db:console:prod  # Open production D1 console

# Git commands
npm run git:init         # Initialize git repo
npm run git:commit       # Commit with message
npm run git:status       # Check git status
npm run git:log          # View commit history
```

## 🤝 Contributing

Contributions are welcome! Feel free to:
- Report bugs
- Suggest new features
- Submit pull requests

## 📝 License

MIT License - Feel free to use this project for personal or commercial purposes.

## 🆘 Troubleshooting

### Audio Issues

**Microphone not working**
- Grant microphone permissions in your browser
- Check browser console for errors
- Try a different browser (Chrome/Edge recommended)

**Browser Tab audio not capturing meeting**
- ✅ **CRITICAL**: Check "Share audio" checkbox when prompted
- Ensure you selected the correct tab
- Chrome/Edge work best (Firefox has limited support)
- Keep the meeting tab open during recording

**System Audio not working**
- ✅ Check "Share system audio" checkbox
- On Mac: May need to install audio drivers
- On Windows: Works in Chrome/Edge
- Try Browser Tab option instead

**Recording is silent or incomplete**
- Verify both permissions were granted (mic + tab/screen)
- Check audio preview before transcribing
- Ensure meeting audio is playing
- Test with YouTube video first

### Transcription Issues

**Transcription fails**
- Verify your OpenAI API key is correct
- Check that you have credits in your OpenAI account
- Ensure audio file is not corrupted
- Try a smaller file first (< 5 minutes)
- Check file format is supported

**Poor transcription quality**
- Try specifying the language instead of auto-detect
- Ensure audio quality is good (not too noisy)
- Check that microphone is close to speakers
- Use headphones to reduce echo

### Project Management Issues

**New Project button not working**
- Check browser console for JavaScript errors
- Refresh the page
- Clear browser cache
- Ensure JavaScript is enabled

**Projects not loading**
- Check D1 database connection
- Run `npm run db:migrate:local` to set up database
- Verify wrangler.jsonc has D1 configuration

### Build/Deployment Issues

**Build errors**
- Delete `node_modules` and `dist` folders
- Run `npm install` again
- Ensure Node.js version is 18+ (`node --version`)

**D1 database errors**
- Run migrations: `npm run db:migrate:local`
- Reset database: `npm run db:reset`
- Check wrangler.jsonc configuration

## 🔗 Useful Links

- [OpenAI Whisper API Docs](https://platform.openai.com/docs/guides/speech-to-text)
- [Hono Documentation](https://hono.dev/)
- [Cloudflare Pages Docs](https://developers.cloudflare.com/pages/)
- [Cloudflare D1 Database](https://developers.cloudflare.com/d1/)
- [Wrangler CLI Guide](https://developers.cloudflare.com/workers/wrangler/)
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [MediaRecorder API](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder)

## 📚 Documentation

- **README.md** - Main documentation (this file)
- **QUICKSTART.md** - Quick start guide for getting up and running
- **AUDIO_CAPTURE_GUIDE.md** - Detailed guide on audio capture methods
- **USER_GUIDE.md** - Complete user guide with step-by-step instructions
- **.dev.vars.example** - Example environment variables file

## 🎯 Use Cases

- **Team Meetings**: Record and transcribe internal team discussions
- **Client Calls**: Professional MOM for client-facing meetings
- **Interviews**: Transcribe job interviews or research interviews
- **Lectures**: Convert educational content to text
- **Podcasts**: Create transcripts for podcast episodes
- **Webinars**: Capture online training sessions
- **Legal**: Document legal proceedings (check local regulations)

## ⚙️ Browser Compatibility

| Feature | Chrome | Edge | Firefox | Safari |
|---------|--------|------|---------|--------|
| Microphone Recording | ✅ | ✅ | ✅ | ✅ |
| Browser Tab Audio | ✅ | ✅ | ⚠️ Limited | ❌ |
| System Audio | ✅ | ✅ | ❌ | ❌ |
| File Upload | ✅ | ✅ | ✅ | ✅ |
| Audio Mixing | ✅ | ✅ | ✅ | ✅ |

**Recommended**: Chrome or Edge for best compatibility

## 🔄 Roadmap

### Planned Features
- [ ] Speaker diarization (identify different speakers)
- [ ] Real-time transcription (live as you speak)
- [ ] Transcript editing and correction
- [ ] Search within transcripts
- [ ] Export to more formats (Word, Markdown)
- [ ] Team collaboration features
- [ ] Integration with calendar apps
- [ ] Automated meeting summaries with AI
- [ ] Action item extraction
- [ ] Custom vocabulary/terminology support

### Recently Added
- ✅ Project management system
- ✅ MOM formatting (Internal/Client-facing)
- ✅ Browser tab audio capture
- ✅ System audio with microphone mixing
- ✅ Cloudflare D1 database integration
- ✅ Modern UI with glassmorphism
- ✅ Real-time audio mixing

## 📧 Support

For issues or questions:
1. Check the troubleshooting section above
2. Open an issue on GitHub
3. Consult OpenAI Whisper API documentation

---

**Built with ❤️ using Hono + Cloudflare Pages**
