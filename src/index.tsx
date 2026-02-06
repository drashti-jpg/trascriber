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
    <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div class="container mx-auto px-4 py-8">
        <div class="max-w-4xl mx-auto">
          {/* Header */}
          <div class="text-center mb-8">
            <h1 class="text-4xl font-bold text-gray-800 mb-2">
              🎙️ Meeting Transcriber
            </h1>
            <p class="text-gray-600">Record or upload audio files for instant transcription</p>
          </div>

          {/* Main Card */}
          <div class="bg-white rounded-lg shadow-lg p-6 mb-6">
            {/* Tabs */}
            <div class="flex border-b border-gray-200 mb-6">
              <button id="recordTab" class="tab-button active px-6 py-3 font-medium">
                🎤 Record
              </button>
              <button id="uploadTab" class="tab-button px-6 py-3 font-medium">
                📁 Upload
              </button>
            </div>

            {/* Record Tab Content */}
            <div id="recordContent" class="tab-content">
              <div class="text-center space-y-4">
                <div id="recordingStatus" class="text-lg font-medium text-gray-700">
                  Ready to record
                </div>
                <div id="recordingTimer" class="text-3xl font-mono text-blue-600 hidden">
                  00:00
                </div>
                <button id="recordButton" class="btn-primary">
                  Start Recording
                </button>
                <button id="stopButton" class="btn-danger hidden">
                  Stop Recording
                </button>
                <div id="audioPreview" class="hidden mt-4">
                  <audio id="audioPlayer" controls class="w-full"></audio>
                  <button id="transcribeRecording" class="btn-success mt-4">
                    Transcribe Recording
                  </button>
                </div>
              </div>
            </div>

            {/* Upload Tab Content */}
            <div id="uploadContent" class="tab-content hidden">
              <div class="space-y-4">
                <div class="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <input type="file" id="fileInput" accept="audio/*,video/*" class="hidden" />
                  <label for="fileInput" class="cursor-pointer">
                    <div class="text-6xl mb-4">📄</div>
                    <div class="text-lg font-medium text-gray-700 mb-2">
                      Click to upload or drag and drop
                    </div>
                    <div class="text-sm text-gray-500">
                      Supports MP3, WAV, M4A, MP4, and more
                    </div>
                  </label>
                </div>
                <div id="fileInfo" class="hidden">
                  <p class="text-sm text-gray-600 mb-4"></p>
                  <button id="transcribeFile" class="btn-success w-full">
                    Transcribe File
                  </button>
                </div>
              </div>
            </div>

            {/* Language Selection */}
            <div class="mt-6 pt-6 border-t border-gray-200">
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Language (optional)
              </label>
              <select id="languageSelect" class="w-full px-3 py-2 border border-gray-300 rounded-md">
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
          <div id="resultsSection" class="hidden bg-white rounded-lg shadow-lg p-6">
            <div class="flex justify-between items-center mb-4">
              <h2 class="text-2xl font-bold text-gray-800">Transcription Results</h2>
              <button id="copyButton" class="btn-secondary">
                📋 Copy
              </button>
            </div>
            <div id="transcriptionMeta" class="text-sm text-gray-600 mb-4"></div>
            <div id="transcriptionText" class="bg-gray-50 rounded-lg p-4 min-h-[200px] max-h-[500px] overflow-y-auto whitespace-pre-wrap font-mono text-sm"></div>
            <div class="mt-4 flex gap-2">
              <button id="downloadTxt" class="btn-secondary">
                💾 Download TXT
              </button>
              <button id="downloadJson" class="btn-secondary">
                💾 Download JSON
              </button>
            </div>
          </div>

          {/* Loading Spinner */}
          <div id="loadingSpinner" class="hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div class="bg-white rounded-lg p-8 text-center">
              <div class="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
              <p class="text-lg font-medium text-gray-700">Transcribing audio...</p>
            </div>
          </div>

          {/* Error Message */}
          <div id="errorMessage" class="hidden bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mt-4">
            <p class="font-bold">Error</p>
            <p id="errorText"></p>
          </div>

          {/* Setup Instructions */}
          <div class="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-6">
            <h3 class="text-lg font-bold text-blue-900 mb-2">🔑 Setup Required</h3>
            <p class="text-blue-800 mb-2">
              This app uses OpenAI's Whisper API for transcription. You'll need:
            </p>
            <ol class="list-decimal list-inside text-blue-800 space-y-1 ml-4">
              <li>Get a free API key from <a href="https://platform.openai.com/api-keys" target="_blank" class="underline font-medium">OpenAI Platform</a></li>
              <li>Add it as <code class="bg-blue-100 px-2 py-1 rounded">OPENAI_API_KEY</code> environment variable</li>
              <li>For local dev: Create <code class="bg-blue-100 px-2 py-1 rounded">.dev.vars</code> file with <code class="bg-blue-100 px-2 py-1 rounded">OPENAI_API_KEY=your-key</code></li>
              <li>For production: Use <code class="bg-blue-100 px-2 py-1 rounded">wrangler secret put OPENAI_API_KEY</code></li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
})

export default app
