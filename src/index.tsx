import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { renderer } from './renderer'
import { formatInternalMOM, formatClientMOM, formatStandardTranscript } from './formatting'

const app = new Hono()

app.use(renderer)

// Enable CORS for API routes
app.use('/api/*', cors())

// API route for transcription
app.post('/api/transcribe', async (c) => {
  try {
    const formData = await c.req.formData()
    const audioFile = formData.get('audio')
    
    if (!audioFile || !(audioFile instanceof File)) {
      return c.json({ error: 'No audio file provided' }, 400)
    }

    // Get API key from environment (user will need to provide their own)
    const apiKey = c.env?.OPENAI_API_KEY
    
    if (!apiKey) {
      return c.json({ 
        error: 'OpenAI API key not configured. Please add OPENAI_API_KEY to your environment variables.',
        instructions: 'You can get a free API key from https://platform.openai.com/api-keys'
      }, 500)
    }

    // Create form data for Whisper API
    const whisperFormData = new FormData()
    whisperFormData.append('file', audioFile)
    whisperFormData.append('model', 'whisper-1')
    whisperFormData.append('language', formData.get('language') || 'en')
    whisperFormData.append('response_format', 'verbose_json')

    // Call OpenAI Whisper API
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: whisperFormData,
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('Whisper API error:', error)
      return c.json({ error: 'Transcription failed', details: error }, response.status)
    }

    const result = await response.json()
    
    return c.json({
      success: true,
      text: result.text,
      language: result.language,
      duration: result.duration,
      segments: result.segments,
    })
  } catch (error) {
    console.error('Transcription error:', error)
    return c.json({ 
      error: 'Internal server error', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    }, 500)
  }
})

// Health check endpoint
app.get('/api/health', (c) => {
  return c.json({ 
    status: 'ok', 
    hasApiKey: !!c.env?.OPENAI_API_KEY,
    hasDatabase: !!c.env?.DB
  })
})

// API Key Configuration endpoint
app.post('/api/config/api-key', async (c) => {
  try {
    const { apiKey } = await c.req.json()
    
    if (!apiKey || typeof apiKey !== 'string') {
      return c.json({ error: 'API key is required' }, 400)
    }

    // Validate API key format
    if (!apiKey.startsWith('sk-')) {
      return c.json({ 
        error: 'Invalid API key format. OpenAI keys should start with "sk-"',
        warning: true
      }, 400)
    }

    // Since we're in Cloudflare Workers environment, we can't directly write to files
    // Instead, we'll return the key and instructions for the user
    // The frontend will handle calling an external endpoint
    
    return c.json({ 
      success: true,
      apiKey: apiKey,
      message: 'API key validated. Updating configuration...',
      instructions: 'The server will restart automatically to load the new key.'
    })
  } catch (error: any) {
    console.error('API key validation error:', error)
    return c.json({ 
      error: 'Failed to validate API key',
      details: error.message 
    }, 500)
  }
})

// Project Management APIs
app.get('/api/projects', async (c) => {
  try {
    const db = c.env?.DB
    if (!db) {
      return c.json({ error: 'Database not configured' }, 500)
    }

    const { results } = await db.prepare(
      'SELECT * FROM projects ORDER BY updated_at DESC'
    ).all()

    return c.json({ projects: results })
  } catch (error) {
    console.error('Get projects error:', error)
    return c.json({ error: 'Failed to fetch projects' }, 500)
  }
})

app.post('/api/projects', async (c) => {
  try {
    const db = c.env?.DB
    if (!db) {
      return c.json({ error: 'Database not configured' }, 500)
    }

    const { name, description, color } = await c.req.json()
    
    if (!name) {
      return c.json({ error: 'Project name is required' }, 400)
    }

    const result = await db.prepare(
      'INSERT INTO projects (name, description, color) VALUES (?, ?, ?)'
    ).bind(name, description || '', color || '#3b82f6').run()

    return c.json({ 
      success: true, 
      projectId: result.meta.last_row_id 
    })
  } catch (error) {
    console.error('Create project error:', error)
    return c.json({ error: 'Failed to create project' }, 500)
  }
})

// Save transcript with formatting
app.post('/api/transcripts', async (c) => {
  try {
    const db = c.env?.DB
    if (!db) {
      return c.json({ error: 'Database not configured' }, 500)
    }

    const { 
      project_id,
      title,
      transcript_text,
      language,
      duration,
      audio_source,
      format_type,
      formatted_output,
      segments
    } = await c.req.json()

    if (!project_id || !title || !transcript_text) {
      return c.json({ error: 'Missing required fields' }, 400)
    }

    const result = await db.prepare(`
      INSERT INTO transcripts (
        project_id, title, transcript_text, language, duration,
        audio_source, format_type, formatted_output, segments
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      project_id,
      title,
      transcript_text,
      language || 'unknown',
      duration || 0,
      audio_source || 'microphone',
      format_type || 'standard',
      formatted_output || transcript_text,
      JSON.stringify(segments || [])
    ).run()

    // Update project's updated_at
    await db.prepare(
      'UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).bind(project_id).run()

    return c.json({ 
      success: true, 
      transcriptId: result.meta.last_row_id 
    })
  } catch (error) {
    console.error('Save transcript error:', error)
    return c.json({ error: 'Failed to save transcript' }, 500)
  }
})

// Get transcripts for a project
app.get('/api/projects/:id/transcripts', async (c) => {
  try {
    const db = c.env?.DB
    if (!db) {
      return c.json({ error: 'Database not configured' }, 500)
    }

    const projectId = c.req.param('id')
    
    const { results } = await db.prepare(
      'SELECT * FROM transcripts WHERE project_id = ? ORDER BY created_at DESC'
    ).bind(projectId).all()

    return c.json({ transcripts: results })
  } catch (error) {
    console.error('Get transcripts error:', error)
    return c.json({ error: 'Failed to fetch transcripts' }, 500)
  }
})

// Get single transcript
app.get('/api/transcripts/:id', async (c) => {
  try {
    const db = c.env?.DB
    if (!db) {
      return c.json({ error: 'Database not configured' }, 500)
    }

    const transcriptId = c.req.param('id')
    
    const result = await db.prepare(
      'SELECT * FROM transcripts WHERE id = ?'
    ).bind(transcriptId).first()

    if (!result) {
      return c.json({ error: 'Transcript not found' }, 404)
    }

    return c.json({ transcript: result })
  } catch (error) {
    console.error('Get transcript error:', error)
    return c.json({ error: 'Failed to fetch transcript' }, 500)
  }
})

// Format transcript
app.post('/api/format', async (c) => {
  try {
    const { transcriptData, meetingInfo, formatType } = await c.req.json()
    
    if (!transcriptData || !formatType) {
      return c.json({ error: 'Missing required fields' }, 400)
    }

    let formattedOutput = ''
    
    switch (formatType) {
      case 'internal':
        formattedOutput = formatInternalMOM(transcriptData, meetingInfo || {})
        break
      case 'client':
        formattedOutput = formatClientMOM(transcriptData, meetingInfo || {})
        break
      case 'standard':
        formattedOutput = formatStandardTranscript(transcriptData, meetingInfo || {})
        break
      default:
        return c.json({ error: 'Invalid format type' }, 400)
    }

    return c.json({ 
      success: true,
      formatted: formattedOutput,
      formatType
    })
  } catch (error) {
    console.error('Format error:', error)
    return c.json({ error: 'Failed to format transcript' }, 500)
  }
})

app.get('/', (c) => {
  return c.render(
    <div class="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative">
      {/* Subtle background */}
      <div class="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-slate-900 to-blue-500/5"></div>

      <div class="container mx-auto px-4 py-12 relative z-10">
        <div class="max-w-5xl mx-auto">
          {/* Header */}
          <div class="text-center mb-10 animate-slide-down">
            <div class="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg mb-6 icon-bounce">
              <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path>
              </svg>
            </div>
            <div class="relative">
              <h1 class="text-4xl md:text-5xl font-semibold text-white mb-3">
                Meeting Transcriber
              </h1>
              <button id="settingsBtn" class="absolute top-0 right-0 p-2.5 rounded-lg bg-white/5 hover:bg-white/10 backdrop-blur-sm border border-white/10 transition-all icon-bounce">
                <svg class="w-5 h-5 text-gray-400 hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                </svg>
              </button>
            </div>
            <p class="text-lg text-gray-400 max-w-2xl mx-auto">
              AI-powered audio transcription for meetings and interviews
            </p>
          </div>

          {/* Project Selector */}
          <div class="glass-card rounded-2xl shadow-xl p-6 mb-6 animate-slide-up delay-100">
            <div class="flex items-center justify-between mb-4">
              <label class="text-lg font-bold text-white">📁 Select Project</label>
              <button id="newProjectBtn" class="smart-button-secondary text-sm">
                <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                </svg>
                New Project
              </button>
            </div>
            <select id="projectSelect" class="smart-select">
              <option value="1">📁 General</option>
            </select>
          </div>

          {/* Main Card */}
          <div class="glass-card rounded-3xl shadow-2xl p-8 mb-8 animate-slide-up delay-200">
            {/* Tabs */}
            <div class="flex gap-2 p-2 bg-white/5 rounded-2xl mb-8">
              <button id="recordTab" class="modern-tab active flex-1 px-6 py-4 font-semibold rounded-xl transition-all duration-300">
                <svg class="w-5 h-5 inline-block mr-2 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path>
                </svg>
                Record Audio
              </button>
              <button id="uploadTab" class="modern-tab flex-1 px-6 py-4 font-semibold rounded-xl transition-all duration-300">
                <svg class="w-5 h-5 inline-block mr-2 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                </svg>
                Upload File
              </button>
            </div>

            {/* Record Tab Content */}
            <div id="recordContent" class="tab-content">
              {/* Audio Source Selection */}
              <div class="mb-8 p-6 bg-white/5 rounded-2xl backdrop-blur-sm border border-white/10">
                <label class="block text-sm font-semibold text-gray-300 mb-4">Select Audio Source</label>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button id="micSourceBtn" class="audio-source-btn active group">
                    <div class="flex flex-col items-center space-y-3 p-4">
                      <div class="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center group-hover:bg-blue-500/30 transition-colors">
                        <svg class="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path>
                        </svg>
                      </div>
                      <div class="text-center">
                        <div class="font-semibold text-white text-sm mb-1">Microphone</div>
                        <div class="text-xs text-gray-400">Your mic input</div>
                      </div>
                    </div>
                  </button>
                  
                  <button id="tabSourceBtn" class="audio-source-btn group">
                    <div class="flex flex-col items-center space-y-3 p-4">
                      <div class="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center group-hover:bg-purple-500/30 transition-colors">
                        <svg class="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                        </svg>
                      </div>
                      <div class="text-center">
                        <div class="font-semibold text-white text-sm mb-1">Browser Tab ⚠️</div>
                        <div class="text-xs text-red-400">Shows screen share</div>
                      </div>
                    </div>
                  </button>
                  
                  <button id="systemSourceBtn" class="audio-source-btn group">
                    <div class="flex flex-col items-center space-y-3 p-4">
                      <div class="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center group-hover:bg-green-500/30 transition-colors">
                        <svg class="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                        </svg>
                      </div>
                      <div class="text-center">
                        <div class="font-semibold text-white text-sm mb-1">System Audio ✓</div>
                        <div class="text-xs text-green-400">More discreet</div>
                      </div>
                    </div>
                  </button>
                </div>
                
                {/* Private Recording Extension Notice */}
                <div class="mt-4 p-4 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl border border-purple-500/30">
                  <div class="flex items-start space-x-3">
                    <svg class="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                    </svg>
                    <div class="text-sm">
                      <div class="font-bold text-purple-300 mb-1">🔒 Want TRULY Private Recording?</div>
                      <div class="text-gray-300 mb-2">
                        Use our <strong>Chrome Extension</strong> for recording with <strong>NO screen share indicator</strong> visible to meeting participants!
                      </div>
                      <a href="/static/meeting-recorder-extension.zip" download class="inline-flex items-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-lg transition-all">
                        <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                        </svg>
                        Download Extension (10 KB)
                      </a>
                    </div>
                  </div>
                </div>
                
                {/* Help Text */}
                <div class="mt-4 p-4 bg-blue-500/10 rounded-xl border border-blue-500/20">
                  <div class="flex items-start space-x-3">
                    <svg class="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <div id="sourceHelpText" class="text-sm text-gray-300">
                      <strong class="text-blue-400">Microphone:</strong> Records from your microphone (for in-person meetings or voice notes)
                    </div>
                  </div>
                </div>
              </div>

              <div class="text-center space-y-5">
                <div class="relative inline-flex items-center justify-center">
                  <div id="recordingPulse" class="absolute w-24 h-24 bg-red-500 rounded-full opacity-0 animate-pulse-subtle"></div>
                  <div class="relative w-24 h-24 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
                    <svg id="micIcon" class="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path>
                    </svg>
                  </div>
                </div>
                
                <div id="recordingStatus" class="text-lg font-medium text-gray-300">
                  Ready to record
                </div>
                
                <div id="recordingTimer" class="text-4xl font-mono font-semibold text-blue-400 hidden">
                  00:00
                </div>
                
                <div class="flex justify-center gap-4">
                  <button id="recordButton" class="smart-button-primary">
                    <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path>
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    Start Recording
                  </button>
                  <button id="stopButton" class="smart-button-danger hidden">
                    <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"></path>
                    </svg>
                    Stop Recording
                  </button>
                </div>
                
                <div id="audioPreview" class="hidden mt-8 space-y-4 animate-fade-in">
                  <div class="bg-white/5 rounded-2xl p-6 backdrop-blur-sm">
                    <audio id="audioPlayer" controls class="w-full custom-audio"></audio>
                  </div>
                  <button id="transcribeRecording" class="smart-button-success">
                    <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                    </svg>
                    Transcribe Recording
                  </button>
                </div>
              </div>
            </div>

            {/* Upload Tab Content */}
            <div id="uploadContent" class="tab-content hidden">
              <div class="space-y-6">
                <div class="upload-zone group">
                  <input type="file" id="fileInput" accept="audio/*,video/*" class="hidden" />
                  <label for="fileInput" class="cursor-pointer block">
                    <div class="flex flex-col items-center justify-center py-12">
                      <svg class="w-20 h-20 text-gray-400 group-hover:text-blue-400 transition-colors duration-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                      </svg>
                      <div class="text-xl font-semibold text-white mb-2 group-hover:text-blue-400 transition-colors">
                        Click to upload or drag and drop
                      </div>
                      <div class="text-sm text-gray-400">
                        MP3, WAV, M4A, MP4, WEBM (Max 25MB)
                      </div>
                    </div>
                  </label>
                </div>
                
                <div id="fileInfo" class="hidden animate-fade-in">
                  <div class="bg-white/5 rounded-2xl p-6 backdrop-blur-sm">
                    <div class="flex items-center justify-between mb-4">
                      <div class="flex items-center space-x-3">
                        <div class="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                          <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"></path>
                          </svg>
                        </div>
                        <div>
                          <p id="fileName" class="text-white font-semibold"></p>
                          <p id="fileSize" class="text-sm text-gray-400"></p>
                        </div>
                      </div>
                      <svg class="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                      </svg>
                    </div>
                  </div>
                  <button id="transcribeFile" class="smart-button-success w-full mt-4">
                    <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                    </svg>
                    Transcribe File
                  </button>
                </div>
              </div>
            </div>

            {/* Language Selection */}
            <div class="mt-8 pt-8 border-t border-white/10">
              <label class="block text-sm font-semibold text-gray-300 mb-3">
                Language (optional)
              </label>
              <select id="languageSelect" class="smart-select">
                <option value="">Auto-detect</option>
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
                <option value="it">Italian</option>
                <option value="pt">Portuguese</option>
                <option value="nl">Dutch</option>
                <option value="pl">Polish</option>
                <option value="ru">Russian</option>
                <option value="zh">Chinese</option>
                <option value="ja">Japanese</option>
                <option value="ko">Korean</option>
              </select>
            </div>
          </div>

          {/* Results Section */}
          <div id="resultsSection" class="hidden glass-card rounded-3xl shadow-2xl p-8 animate-fade-in-up">
            <div class="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
              <h2 class="text-3xl font-bold text-white">Transcription Results</h2>
              <button id="copyButton" class="smart-button-secondary">
                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                </svg>
                Copy Text
              </button>
            </div>
            
            <div id="transcriptionMeta" class="flex flex-wrap gap-4 mb-6">
              <div class="flex items-center space-x-2 bg-white/5 px-4 py-2 rounded-xl backdrop-blur-sm">
                <svg class="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"></path>
                </svg>
                <span id="languageInfo" class="text-gray-300 font-medium"></span>
              </div>
              <div class="flex items-center space-x-2 bg-white/5 px-4 py-2 rounded-xl backdrop-blur-sm">
                <svg class="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <span id="durationInfo" class="text-gray-300 font-medium"></span>
              </div>
            </div>
            
            <div class="bg-white/5 rounded-2xl p-6 backdrop-blur-sm mb-6">
              <div id="transcriptionText" class="text-white leading-relaxed whitespace-pre-wrap min-h-[200px] max-h-[400px] overflow-y-auto custom-scrollbar"></div>
            </div>
            
            <div class="flex flex-wrap gap-3">
              <button id="downloadTxt" class="smart-button-secondary">
                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
                Download TXT
              </button>
              <button id="downloadJson" class="smart-button-secondary">
                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"></path>
                </svg>
                Download JSON
              </button>
            </div>
          </div>

          {/* Loading Spinner */}
          <div id="loadingSpinner" class="hidden fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
            <div class="glass-card rounded-3xl p-12 text-center max-w-md">
              <div class="relative w-24 h-24 mx-auto mb-6">
                <div class="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full animate-spin-slow"></div>
                <div class="absolute inset-2 bg-slate-900 rounded-full flex items-center justify-center">
                  <svg class="w-10 h-10 text-blue-400 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path>
                  </svg>
                </div>
              </div>
              <p class="text-2xl font-bold text-white mb-2">Transcribing audio...</p>
              <p class="text-gray-400">This may take a moment</p>
            </div>
          </div>

          {/* Error Message */}
          <div id="errorMessage" class="hidden glass-card rounded-2xl p-6 mt-6 border-2 border-red-500/50 animate-shake">
            <div class="flex items-start space-x-3">
              <svg class="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <div>
                <p class="font-bold text-red-400 text-lg mb-1">Error</p>
                <p id="errorText" class="text-gray-300"></p>
              </div>
            </div>
          </div>

          {/* Format Selection Modal */}
          <div id="formatModal" class="hidden fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div class="glass-card rounded-3xl p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <h2 class="text-3xl font-bold text-white mb-2">🎉 Recording Complete!</h2>
              <p class="text-gray-300 mb-6">Choose how you'd like to format your transcript</p>
              
              {/* Format Options */}
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <button class="format-option-btn" data-format="internal">
                  <div class="flex items-start space-x-4">
                    <div class="text-4xl">📝</div>
                    <div class="text-left">
                      <div class="font-bold text-white text-lg mb-1">Internal MOM</div>
                      <div class="text-sm text-gray-400">Casual team format with action items</div>
                    </div>
                  </div>
                </button>
                
                <button class="format-option-btn" data-format="client">
                  <div class="flex items-start space-x-4">
                    <div class="text-4xl">📄</div>
                    <div class="text-left">
                      <div class="font-bold text-white text-lg mb-1">Client-Facing MOM</div>
                      <div class="text-sm text-gray-400">Professional format with decisions table</div>
                    </div>
                  </div>
                </button>
                
                <button class="format-option-btn" data-format="standard">
                  <div class="flex items-start space-x-4">
                    <div class="text-4xl">📋</div>
                    <div class="text-left">
                      <div class="font-bold text-white text-lg mb-1">Standard Transcript</div>
                      <div class="text-sm text-gray-400">Full text with timestamps</div>
                    </div>
                  </div>
                </button>
                
                <button class="format-option-btn" data-format="pdf">
                  <div class="flex items-start space-x-4">
                    <div class="text-4xl">📥</div>
                    <div class="text-left">
                      <div class="font-bold text-white text-lg mb-1">PDF Export</div>
                      <div class="text-sm text-gray-400">Download as PDF document</div>
                    </div>
                  </div>
                </button>
              </div>
              
              {/* Meeting Info Form */}
              <div class="space-y-4 mb-6">
                <div>
                  <label class="block text-sm font-semibold text-gray-300 mb-2">Meeting Title *</label>
                  <input type="text" id="meetingTitle" class="smart-input" placeholder="e.g., Weekly Team Sync" required />
                </div>
                
                <div>
                  <label class="block text-sm font-semibold text-gray-300 mb-2">Attendees</label>
                  <input type="text" id="meetingAttendees" class="smart-input" placeholder="e.g., John, Sarah, Mike" />
                </div>
                
                <div>
                  <label class="block text-sm font-semibold text-gray-300 mb-2">Company/Client Name</label>
                  <input type="text" id="meetingCompany" class="smart-input" placeholder="e.g., Acme Corp" />
                </div>
                
                <div>
                  <label class="block text-sm font-semibold text-gray-300 mb-2">Date</label>
                  <input type="date" id="meetingDate" class="smart-input" />
                </div>
              </div>
              
              {/* Actions */}
              <div class="flex gap-3">
                <button id="cancelFormatBtn" class="smart-button-secondary flex-1">Cancel</button>
                <button id="saveTranscriptBtn" class="smart-button-success flex-1">
                  <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  Save Transcript
                </button>
              </div>
            </div>
          </div>

          {/* New Project Modal */}
          <div id="newProjectModal" class="hidden fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div class="glass-card rounded-3xl p-8 max-w-md w-full">
              <h2 class="text-2xl font-bold text-white mb-6">Create New Project</h2>
              
              <div class="space-y-4 mb-6">
                <div>
                  <label class="block text-sm font-semibold text-gray-300 mb-2">Project Name *</label>
                  <input type="text" id="newProjectName" class="smart-input" placeholder="e.g., Client A Meetings" required />
                </div>
                
                <div>
                  <label class="block text-sm font-semibold text-gray-300 mb-2">Description</label>
                  <textarea id="newProjectDesc" class="smart-input" rows="3" placeholder="Brief description..."></textarea>
                </div>
                
                <div>
                  <label class="block text-sm font-semibold text-gray-300 mb-2">Color</label>
                  <div class="flex gap-2">
                    <button class="color-btn active" data-color="#3b82f6" style="background: #3b82f6"></button>
                    <button class="color-btn" data-color="#8b5cf6" style="background: #8b5cf6"></button>
                    <button class="color-btn" data-color="#ec4899" style="background: #ec4899"></button>
                    <button class="color-btn" data-color="#10b981" style="background: #10b981"></button>
                    <button class="color-btn" data-color="#f59e0b" style="background: #f59e0b"></button>
                    <button class="color-btn" data-color="#ef4444" style="background: #ef4444"></button>
                  </div>
                </div>
              </div>
              
              <div class="flex gap-3">
                <button id="cancelProjectBtn" class="smart-button-secondary flex-1">Cancel</button>
                <button id="createProjectBtn" class="smart-button-primary flex-1">
                  <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                  </svg>
                  Create Project
                </button>
              </div>
            </div>
          </div>

          {/* Settings Modal */}
          <div id="settingsModal" class="hidden fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div class="glass-card rounded-3xl p-8 max-w-lg w-full">
              <div class="flex items-center justify-between mb-6">
                <h2 class="text-2xl font-bold text-white">⚙️ Settings</h2>
                <button id="closeSettingsBtn" class="p-2 rounded-lg hover:bg-white/10 transition-colors">
                  <svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              </div>
              
              <div class="space-y-6">
                {/* API Key Section */}
                <div>
                  <label class="block text-sm font-semibold text-gray-300 mb-2">
                    🔑 OpenAI API Key
                  </label>
                  <div class="flex gap-2">
                    <input 
                      type="password" 
                      id="apiKeyInput" 
                      class="smart-input flex-1" 
                      placeholder="sk-proj-..." 
                    />
                    <button id="toggleApiKeyBtn" class="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors">
                      <svg id="eyeIcon" class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                      </svg>
                    </button>
                  </div>
                  <p class="text-xs text-gray-400 mt-2">
                    Get your API key from <a href="https://platform.openai.com/api-keys" target="_blank" class="text-blue-400 hover:text-blue-300 underline">OpenAI Platform</a>
                  </p>
                </div>

                {/* Current Status */}
                <div id="apiKeyStatus" class="hidden p-4 rounded-xl bg-green-500/10 border border-green-500/30">
                  <div class="flex items-center space-x-2">
                    <svg class="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <span class="text-green-400 font-semibold">API Key Configured</span>
                  </div>
                </div>

                {/* Info Box */}
                <div class="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
                  <div class="flex items-start space-x-3">
                    <svg class="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <div class="text-sm text-gray-300">
                      <p class="font-semibold text-blue-400 mb-1">How it works:</p>
                      <ul class="list-disc list-inside space-y-1 text-xs">
                        <li>Your API key is stored securely in .dev.vars</li>
                        <li>The server needs to restart to load the new key</li>
                        <li>Cost: ~$0.006 per minute of audio</li>
                        <li>Never share your API key publicly</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <div class="flex gap-3 mt-6">
                <button id="cancelSettingsBtn" class="smart-button-secondary flex-1">Cancel</button>
                <button id="saveApiKeyBtn" class="smart-button-primary flex-1">
                  <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  Save & Restart
                </button>
              </div>
            </div>
          </div>

          {/* Setup Instructions */}
          <div class="glass-card rounded-2xl p-6 mt-8 border border-blue-500/30 animate-slide-up delay-300">
            <div class="flex items-start space-x-3">
              <svg class="w-6 h-6 text-blue-400 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"></path>
              </svg>
              <div>
                <h3 class="text-lg font-bold text-blue-400 mb-2">🔑 Setup Required</h3>
                <p class="text-gray-300 mb-3">
                  This app uses OpenAI's Whisper API for transcription. To get started:
                </p>
                <ol class="list-decimal list-inside text-gray-300 space-y-2 ml-4">
                  <li>Get a free API key from <a href="https://platform.openai.com/api-keys" target="_blank" class="text-blue-400 hover:text-blue-300 underline font-medium">OpenAI Platform</a></li>
                  <li>Add it as <code class="bg-white/10 px-2 py-1 rounded text-blue-300">OPENAI_API_KEY</code> environment variable</li>
                  <li>For local dev: Create <code class="bg-white/10 px-2 py-1 rounded text-blue-300">.dev.vars</code> file</li>
                  <li>For production: Use <code class="bg-white/10 px-2 py-1 rounded text-blue-300">wrangler secret put OPENAI_API_KEY</code></li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
})

export default app
