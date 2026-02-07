// Global state
let mediaRecorder = null;
let audioChunks = [];
let recordingStartTime = null;
let timerInterval = null;
let currentAudioBlob = null;
let uploadedFile = null;
let currentStream = null;
let audioSource = 'microphone'; // 'microphone', 'tab', 'system'
let transcriptionData = null;
let currentProjects = [];
let selectedProjectId = 1;
let selectedFormat = 'internal';
let selectedColor = '#3b82f6';

// DOM elements
const recordTab = document.getElementById('recordTab');
const uploadTab = document.getElementById('uploadTab');
const recordContent = document.getElementById('recordContent');
const uploadContent = document.getElementById('uploadContent');
const recordButton = document.getElementById('recordButton');
const stopButton = document.getElementById('stopButton');
const recordingStatus = document.getElementById('recordingStatus');
const recordingTimer = document.getElementById('recordingTimer');
const recordingPulse = document.getElementById('recordingPulse');
const audioPreview = document.getElementById('audioPreview');
const audioPlayer = document.getElementById('audioPlayer');
const transcribeRecording = document.getElementById('transcribeRecording');
const fileInput = document.getElementById('fileInput');
const fileInfo = document.getElementById('fileInfo');
const transcribeFile = document.getElementById('transcribeFile');
const languageSelect = document.getElementById('languageSelect');
const resultsSection = document.getElementById('resultsSection');
const transcriptionText = document.getElementById('transcriptionText');
const transcriptionMeta = document.getElementById('transcriptionMeta');
const languageInfo = document.getElementById('languageInfo');
const durationInfo = document.getElementById('durationInfo');
const copyButton = document.getElementById('copyButton');
const downloadTxt = document.getElementById('downloadTxt');
const downloadJson = document.getElementById('downloadJson');
const loadingSpinner = document.getElementById('loadingSpinner');
const errorMessage = document.getElementById('errorMessage');
const errorText = document.getElementById('errorText');

// Audio source buttons
const micSourceBtn = document.getElementById('micSourceBtn');
const tabSourceBtn = document.getElementById('tabSourceBtn');
const systemSourceBtn = document.getElementById('systemSourceBtn');
const sourceHelpText = document.getElementById('sourceHelpText');

let transcriptionData = null;

// Tab switching
recordTab.addEventListener('click', () => {
  recordTab.classList.add('active');
  uploadTab.classList.remove('active');
  recordContent.classList.remove('hidden');
  uploadContent.classList.add('hidden');
});

uploadTab.addEventListener('click', () => {
  uploadTab.classList.add('active');
  recordTab.classList.remove('active');
  uploadContent.classList.remove('hidden');
  recordContent.classList.add('hidden');
});

// Audio source selection
const helpTexts = {
  microphone: '<strong class="text-blue-400">Microphone:</strong> Records from your microphone (for in-person meetings or voice notes)',
  tab: '<strong class="text-purple-400">Browser Tab:</strong> Captures <strong>both your voice AND the meeting audio</strong> from a browser tab (perfect for Google Meet, Teams web, Zoom web meetings). Records everything you say and hear!',
  system: '<strong class="text-green-400">System Audio:</strong> Captures <strong>both your voice AND all system audio</strong> from your screen (works with desktop apps like Zoom, Teams, Skype). Records your voice plus everything from the app!'
};

micSourceBtn.addEventListener('click', () => {
  setAudioSource('microphone');
  sourceHelpText.innerHTML = helpTexts.microphone;
});

tabSourceBtn.addEventListener('click', () => {
  setAudioSource('tab');
  sourceHelpText.innerHTML = helpTexts.tab;
});

systemSourceBtn.addEventListener('click', () => {
  setAudioSource('system');
  sourceHelpText.innerHTML = helpTexts.system;
});

function setAudioSource(source) {
  audioSource = source;
  
  // Update button states
  micSourceBtn.classList.remove('active');
  tabSourceBtn.classList.remove('active');
  systemSourceBtn.classList.remove('active');
  
  if (source === 'microphone') {
    micSourceBtn.classList.add('active');
  } else if (source === 'tab') {
    tabSourceBtn.classList.add('active');
  } else if (source === 'system') {
    systemSourceBtn.classList.add('active');
  }
}

// Recording functions
async function startRecording() {
  try {
    let stream;
    
    if (audioSource === 'microphone') {
      // Standard microphone recording
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } else if (audioSource === 'tab') {
      // Tab audio capture + microphone - MIXED AUDIO
      
      // Get microphone stream
      const micStream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      // Get tab audio stream
      const tabStream = await navigator.mediaDevices.getDisplayMedia({
        video: true, // Required for tab capture
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });
      
      // Extract audio tracks
      const tabAudioTrack = tabStream.getAudioTracks()[0];
      if (!tabAudioTrack) {
        // Clean up mic stream
        micStream.getTracks().forEach(track => track.stop());
        throw new Error('No audio track found. Make sure to select "Share audio" when choosing the tab.');
      }
      
      // Stop video track to save resources
      const videoTrack = tabStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.stop();
      }
      
      // Mix both audio sources using Web Audio API
      const audioContext = new AudioContext();
      const destination = audioContext.createMediaStreamDestination();
      
      // Create sources for both streams
      const micSource = audioContext.createMediaStreamSource(micStream);
      const tabSource = audioContext.createMediaStreamSource(new MediaStream([tabAudioTrack]));
      
      // Create gain nodes to control volume
      const micGain = audioContext.createGain();
      const tabGain = audioContext.createGain();
      
      // Set volume levels (adjust if needed)
      micGain.gain.value = 1.0; // Your voice
      tabGain.gain.value = 1.0; // Meeting audio
      
      // Connect: source -> gain -> destination
      micSource.connect(micGain);
      tabGain.connect(destination);
      micGain.connect(destination);
      tabSource.connect(tabGain);
      
      // Use the mixed stream
      stream = destination.stream;
      
      // Store streams for cleanup
      currentStream = {
        audioContext,
        micStream,
        tabStream,
        combinedStream: stream,
        getTracks: function() {
          return [...micStream.getTracks(), ...tabStream.getTracks()];
        }
      };
    } else if (audioSource === 'system') {
      // System audio with screen share + microphone
      
      // Get microphone stream
      const micStream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      // Get system audio stream
      const systemStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });
      
      // Extract audio track
      const systemAudioTrack = systemStream.getAudioTracks()[0];
      if (!systemAudioTrack) {
        // Clean up mic stream
        micStream.getTracks().forEach(track => track.stop());
        throw new Error('No audio track found. Make sure to check "Share system audio" when sharing your screen.');
      }
      
      // Stop video track
      const videoTrack = systemStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.stop();
      }
      
      // Mix both audio sources
      const audioContext = new AudioContext();
      const destination = audioContext.createMediaStreamDestination();
      
      const micSource = audioContext.createMediaStreamSource(micStream);
      const systemSource = audioContext.createMediaStreamSource(new MediaStream([systemAudioTrack]));
      
      const micGain = audioContext.createGain();
      const systemGain = audioContext.createGain();
      
      micGain.gain.value = 1.0;
      systemGain.gain.value = 1.0;
      
      micSource.connect(micGain);
      systemSource.connect(systemGain);
      micGain.connect(destination);
      systemGain.connect(destination);
      
      stream = destination.stream;
      
      // Store streams for cleanup
      currentStream = {
        audioContext,
        micStream,
        systemStream,
        combinedStream: stream,
        getTracks: function() {
          return [...micStream.getTracks(), ...systemStream.getTracks()];
        }
      };
    }
    
    currentStream = stream;
    
    // Determine the best audio format
    const options = {};
    if (MediaRecorder.isTypeSupported('audio/webm')) {
      options.mimeType = 'audio/webm';
    } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
      options.mimeType = 'audio/mp4';
    }
    
    mediaRecorder = new MediaRecorder(stream, options);
    audioChunks = [];

    mediaRecorder.ondataavailable = (event) => {
      audioChunks.push(event.data);
    };

    mediaRecorder.onstop = () => {
      const audioBlob = new Blob(audioChunks, { type: mediaRecorder.mimeType });
      currentAudioBlob = audioBlob;
      const audioUrl = URL.createObjectURL(audioBlob);
      audioPlayer.src = audioUrl;
      audioPreview.classList.remove('hidden');
      
      // Stop all tracks and clean up
      if (currentStream) {
        if (currentStream.getTracks) {
          currentStream.getTracks().forEach(track => track.stop());
        }
        if (currentStream.audioContext) {
          currentStream.audioContext.close();
        }
        if (currentStream.micStream) {
          currentStream.micStream.getTracks().forEach(track => track.stop());
        }
        if (currentStream.tabStream) {
          currentStream.tabStream.getTracks().forEach(track => track.stop());
        }
        if (currentStream.systemStream) {
          currentStream.systemStream.getTracks().forEach(track => track.stop());
        }
        currentStream = null;
      }
    };

    mediaRecorder.start();
    recordingStartTime = Date.now();
    
    recordButton.classList.add('hidden');
    stopButton.classList.remove('hidden');
    
    // Update status based on source
    if (audioSource === 'microphone') {
      recordingStatus.textContent = 'Recording from microphone...';
    } else if (audioSource === 'tab') {
      recordingStatus.textContent = 'Recording: Your voice + Meeting audio';
    } else if (audioSource === 'system') {
      recordingStatus.textContent = 'Recording: Your voice + System audio';
    }
    
    recordingTimer.classList.remove('hidden');
    recordingPulse.classList.remove('opacity-0');
    recordingPulse.classList.add('opacity-20');
    audioPreview.classList.add('hidden');
    
    startTimer();
  } catch (error) {
    let errorMsg = 'Failed to start recording. ';
    
    if (error.name === 'NotAllowedError') {
      if (audioSource === 'microphone') {
        errorMsg += 'Please grant microphone permissions.';
      } else {
        errorMsg += 'Please allow screen/tab sharing.';
      }
    } else if (error.message.includes('No audio track')) {
      errorMsg += error.message;
    } else {
      errorMsg += error.message || 'Unknown error occurred.';
    }
    
    showError(errorMsg);
    console.error('Recording error:', error);
  }
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
    stopButton.classList.add('hidden');
    recordButton.classList.remove('hidden');
    recordButton.textContent = 'Record Again';
    recordingStatus.textContent = 'Recording complete';
    recordingTimer.classList.add('hidden');
    recordingPulse.classList.remove('opacity-20');
    recordingPulse.classList.add('opacity-0');
    clearInterval(timerInterval);
  }
}

function startTimer() {
  timerInterval = setInterval(() => {
    const elapsed = Date.now() - recordingStartTime;
    const seconds = Math.floor(elapsed / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    recordingTimer.textContent = `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, 1000);
}

// File upload handling
fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    uploadedFile = file;
    const fileName = document.getElementById('fileName');
    const fileSize = document.getElementById('fileSize');
    fileName.textContent = file.name;
    fileSize.textContent = formatFileSize(file.size);
    fileInfo.classList.remove('hidden');
  }
});

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// Transcription functions
async function transcribeAudio(audioBlob, filename = 'recording.webm') {
  try {
    showLoading();
    hideError();
    resultsSection.classList.add('hidden');

    const formData = new FormData();
    formData.append('audio', audioBlob, filename);
    
    const language = languageSelect.value;
    if (language) {
      formData.append('language', language);
    }

    const response = await fetch('/api/transcribe', {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Transcription failed');
    }

    if (data.error) {
      showError(data.error + (data.instructions ? '\n\n' + data.instructions : ''));
      return;
    }

    // Store transcription data and show format modal
    transcriptionData = data;
    hideLoading();
    showFormatModal();

  } catch (error) {
    showError('Transcription failed: ' + error.message);
    console.error('Transcription error:', error);
  } finally {
    hideLoading();
  }
}

function formatDuration(seconds) {
  if (!seconds) return 'Unknown';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Button event listeners
recordButton.addEventListener('click', startRecording);
stopButton.addEventListener('click', stopRecording);

transcribeRecording.addEventListener('click', () => {
  if (currentAudioBlob) {
    transcribeAudio(currentAudioBlob);
  }
});

transcribeFile.addEventListener('click', () => {
  if (uploadedFile) {
    transcribeAudio(uploadedFile, uploadedFile.name);
  }
});

// Results actions
copyButton.addEventListener('click', () => {
  if (transcriptionData) {
    navigator.clipboard.writeText(transcriptionData.text).then(() => {
      const originalHTML = copyButton.innerHTML;
      copyButton.innerHTML = `
        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
        </svg>
        Copied!
      `;
      setTimeout(() => {
        copyButton.innerHTML = originalHTML;
      }, 2000);
    });
  }
});

downloadTxt.addEventListener('click', () => {
  if (transcriptionData) {
    const content = transcriptionData.formattedOutput || transcriptionData.text;
    const blob = new Blob([content], { type: 'text/plain' });
    downloadFile(blob, 'transcript.txt');
  }
});

downloadJson.addEventListener('click', () => {
  if (transcriptionData) {
    const blob = new Blob([JSON.stringify(transcriptionData, null, 2)], { type: 'application/json' });
    downloadFile(blob, 'transcription.json');
  }
});

function downloadFile(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// UI helpers
function showLoading() {
  loadingSpinner.classList.remove('hidden');
}

function hideLoading() {
  loadingSpinner.classList.add('hidden');
}

function showError(message) {
  errorText.textContent = message;
  errorMessage.classList.remove('hidden');
  errorMessage.scrollIntoView({ behavior: 'smooth' });
}

function hideError() {
  errorMessage.classList.add('hidden');
}

// Check API status on load
fetch('/api/health')
  .then(res => res.json())
  .then(data => {
    if (!data.hasApiKey) {
      console.warn('OpenAI API key not configured');
    }
  })
  .catch(err => console.error('Health check failed:', err));

// ============================================
// PROJECT MANAGEMENT
// ============================================

// New DOM elements for project management
const projectSelect = document.getElementById('projectSelect');
const newProjectBtn = document.getElementById('newProjectBtn');
const newProjectModal = document.getElementById('newProjectModal');
const newProjectName = document.getElementById('newProjectName');
const newProjectDesc = document.getElementById('newProjectDesc');
const cancelProjectBtn = document.getElementById('cancelProjectBtn');
const createProjectBtn = document.getElementById('createProjectBtn');

// Format modal elements
const formatModal = document.getElementById('formatModal');
const formatOptionBtns = document.querySelectorAll('.format-option-btn');
const meetingTitle = document.getElementById('meetingTitle');
const meetingAttendees = document.getElementById('meetingAttendees');
const meetingCompany = document.getElementById('meetingCompany');
const meetingDate = document.getElementById('meetingDate');
const cancelFormatBtn = document.getElementById('cancelFormatBtn');
const saveTranscriptBtn = document.getElementById('saveTranscriptBtn');

// Color selection
const colorBtns = document.querySelectorAll('.color-btn');

// Load projects on page load
async function loadProjects() {
  try {
    const response = await fetch('/api/projects');
    const data = await response.json();
    
    if (data.projects) {
      currentProjects = data.projects;
      updateProjectSelect();
    }
  } catch (error) {
    console.error('Failed to load projects:', error);
  }
}

function updateProjectSelect() {
  projectSelect.innerHTML = '';
  currentProjects.forEach(project => {
    const option = document.createElement('option');
    option.value = project.id;
    option.textContent = `📁 ${project.name}`;
    if (project.id === selectedProjectId) {
      option.selected = true;
    }
    projectSelect.appendChild(option);
  });
}

// Project selection
projectSelect.addEventListener('change', (e) => {
  selectedProjectId = parseInt(e.target.value);
});

// New project modal
newProjectBtn.addEventListener('click', () => {
  newProjectModal.classList.remove('hidden');
  newProjectName.value = '';
  newProjectDesc.value = '';
  selectedColor = '#3b82f6';
  
  // Reset color buttons
  colorBtns.forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.color === selectedColor) {
      btn.classList.add('active');
    }
  });
});

cancelProjectBtn.addEventListener('click', () => {
  newProjectModal.classList.add('hidden');
});

// Color selection
colorBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    colorBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedColor = btn.dataset.color;
  });
});

// Create new project
createProjectBtn.addEventListener('click', async () => {
  const name = newProjectName.value.trim();
  
  if (!name) {
    showError('Please enter a project name');
    return;
  }
  
  try {
    const response = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        description: newProjectDesc.value.trim(),
        color: selectedColor
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      newProjectModal.classList.add('hidden');
      await loadProjects();
      selectedProjectId = data.projectId;
      updateProjectSelect();
    } else {
      showError('Failed to create project');
    }
  } catch (error) {
    console.error('Create project error:', error);
    showError('Failed to create project');
  }
});

// Format selection modal
formatOptionBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    formatOptionBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedFormat = btn.dataset.format;
  });
});

cancelFormatBtn.addEventListener('click', () => {
  formatModal.classList.add('hidden');
});

// Show format modal after transcription
function showFormatModal() {
  // Set default date to today
  meetingDate.valueAsDate = new Date();
  
  // Clear form
  meetingTitle.value = '';
  meetingAttendees.value = '';
  meetingCompany.value = '';
  
  // Reset format selection
  formatOptionBtns.forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.format === 'internal') {
      btn.classList.add('active');
    }
  });
  selectedFormat = 'internal';
  
  formatModal.classList.remove('hidden');
}

// Save transcript with formatting
saveTranscriptBtn.addEventListener('click', async () => {
  const title = meetingTitle.value.trim();
  
  if (!title) {
    showError('Please enter a meeting title');
    return;
  }
  
  if (!transcriptionData) {
    showError('No transcription data available');
    return;
  }
  
  try {
    showLoading();
    
    // Prepare meeting info
    const meetingInfo = {
      title,
      attendees: meetingAttendees.value.trim(),
      company: meetingCompany.value.trim(),
      date: meetingDate.value || new Date().toISOString().split('T')[0]
    };
    
    // Format the transcript
    const formatResponse = await fetch('/api/format', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transcriptData: {
          text: transcriptionData.text,
          language: transcriptionData.language,
          duration: transcriptionData.duration,
          segments: transcriptionData.segments
        },
        meetingInfo,
        formatType: selectedFormat
      })
    });
    
    const formatData = await formatResponse.json();
    
    if (!formatData.success) {
      throw new Error('Formatting failed');
    }
    
    // Save to database
    const saveResponse = await fetch('/api/transcripts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project_id: selectedProjectId,
        title,
        transcript_text: transcriptionData.text,
        language: transcriptionData.language,
        duration: transcriptionData.duration,
        audio_source: audioSource,
        format_type: selectedFormat,
        formatted_output: formatData.formatted,
        segments: transcriptionData.segments
      })
    });
    
    const saveData = await saveResponse.json();
    
    if (saveData.success) {
      formatModal.classList.add('hidden');
      hideLoading();
      
      // Show success message
      transcriptionText.textContent = formatData.formatted;
      resultsSection.classList.remove('hidden');
      resultsSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      
      // Update download buttons to use formatted output
      transcriptionData.formattedOutput = formatData.formatted;
    } else {
      throw new Error('Failed to save transcript');
    }
  } catch (error) {
    console.error('Save transcript error:', error);
    hideLoading();
    showError('Failed to save transcript: ' + error.message);
  }
});

// Initialize projects on page load
loadProjects();

