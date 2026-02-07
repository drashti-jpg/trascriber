// Global state
let mediaRecorder = null;
let audioChunks = [];
let recordingStartTime = null;
let timerInterval = null;
let currentAudioBlob = null;
let uploadedFile = null;

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

// Recording functions
async function startRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
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
      
      // Stop all tracks
      stream.getTracks().forEach(track => track.stop());
    };

    mediaRecorder.start();
    recordingStartTime = Date.now();
    
    recordButton.classList.add('hidden');
    stopButton.classList.remove('hidden');
    recordingStatus.textContent = 'Recording in progress...';
    recordingTimer.classList.remove('hidden');
    recordingPulse.classList.remove('opacity-0');
    recordingPulse.classList.add('opacity-20');
    audioPreview.classList.add('hidden');
    
    startTimer();
  } catch (error) {
    showError('Failed to access microphone. Please grant permission and try again.');
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

    // Display results
    transcriptionData = data;
    transcriptionText.textContent = data.text;
    languageInfo.textContent = `Language: ${data.language || 'Unknown'}`;
    durationInfo.textContent = `Duration: ${formatDuration(data.duration)}`;
    resultsSection.classList.remove('hidden');
    
    // Scroll to results
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

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
    const blob = new Blob([transcriptionData.text], { type: 'text/plain' });
    downloadFile(blob, 'transcription.txt');
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
