import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { renderer } from './renderer'

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
    hasApiKey: !!c.env?.OPENAI_API_KEY 
  })
})

app.get('/', (c) => {
  return c.render(
    <div class="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Animated background elements */}
      <div class="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10"></div>
      <div class="absolute top-0 left-0 w-full h-full">
        <div class="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div class="absolute top-1/3 right-1/4 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div class="absolute bottom-1/4 left-1/2 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <div class="container mx-auto px-4 py-12 relative z-10">
        <div class="max-w-5xl mx-auto">
          {/* Header */}
          <div class="text-center mb-12 animate-fade-in-down">
            <div class="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-2xl mb-6 transform hover:scale-110 transition-transform duration-300">
              <svg class="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path>
              </svg>
            </div>
            <h1 class="text-5xl md:text-6xl font-bold text-white mb-4 tracking-tight">
              Meeting Transcriber
            </h1>
            <p class="text-xl text-gray-300 max-w-2xl mx-auto">
              Transform your audio into text with AI-powered transcription
            </p>
          </div>

          {/* Main Card */}
          <div class="glass-card rounded-3xl shadow-2xl p-8 mb-8 animate-fade-in-up">
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
              <div class="text-center space-y-6">
                <div class="relative inline-flex items-center justify-center">
                  <div id="recordingPulse" class="absolute w-32 h-32 bg-red-500 rounded-full opacity-0 animate-ping-slow"></div>
                  <div class="relative w-32 h-32 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-2xl">
                    <svg id="micIcon" class="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path>
                    </svg>
                  </div>
                </div>
                
                <div id="recordingStatus" class="text-xl font-semibold text-white">
                  Ready to record
                </div>
                
                <div id="recordingTimer" class="text-5xl font-mono font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 hidden">
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

          {/* Setup Instructions */}
          <div class="glass-card rounded-2xl p-6 mt-8 border border-blue-500/30">
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
