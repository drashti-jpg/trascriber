# 🎙️ Meeting Audio Capture Guide

## Overview

The Meeting Transcriber now supports **three different audio capture methods** to transcribe your online meetings from Teams, Zoom, Google Meet, and more!

## 🎯 Audio Source Options

### 1. 🎤 Microphone (Default)
**Best for:** In-person meetings, voice notes, interviews

**How it works:**
- Records from your laptop's microphone
- Simple permission request
- Traditional recording method

**Use when:**
- You're in the same room as speakers
- Recording voice notes
- Conducting in-person interviews

---

### 2. 🖥️ Browser Tab (Recommended for Online Meetings)
**Best for:** Google Meet, Microsoft Teams (web), Zoom (web), any browser-based meeting

**What it captures:**
- ✅ **Your voice** (from microphone)
- ✅ **Meeting audio** (what others are saying)
- ✅ **Complete conversation** - both sides!

**How it works:**
1. Click "Browser Tab" audio source
2. Click "Start Recording"
3. **First prompt:** Allow microphone access (for your voice)
4. **Second prompt:** Select meeting tab + Check "Share audio"
5. Browser captures and mixes both audio sources automatically

**Step-by-step for Google Meet:**
```
1. Join your Google Meet meeting
2. Open Meeting Transcriber in another tab
3. Select "Browser Tab" source
4. Click "Start Recording"
5. ✅ Allow microphone access (first popup)
6. Select your Meet tab (second popup)
7. ✅ Check "Share audio" (essential!)
8. Click Share
9. Both your voice AND meeting audio are recorded!
```

**Advantages:**
✅ Crystal clear audio quality  
✅ Captures YOUR voice + others' voices  
✅ No microphone feedback  
✅ Works perfectly with headphones  
✅ Only captures meeting audio (not your notifications)  

**Browser Support:**
- ✅ Chrome/Edge: Fully supported
- ✅ Firefox: Supported (may need to enable in settings)
- ❌ Safari: Limited support

---

### 3. 🖥️ System Audio (For Desktop Apps)
**Best for:** Zoom Desktop, Microsoft Teams Desktop, Skype, any desktop application

**What it captures:**
- ✅ **Your voice** (from microphone)
- ✅ **System audio** (from desktop app)
- ✅ **Complete conversation** - both sides!

**How it works:**
1. Click "System Audio" audio source
2. Click "Start Recording"
3. **First prompt:** Allow microphone access (for your voice)
4. **Second prompt:** Share screen + Check "Share system audio"
5. Browser captures and mixes both audio sources automatically

**Step-by-step for Zoom Desktop:**
```
1. Start your Zoom meeting
2. Open Meeting Transcriber in browser
3. Select "System Audio" source
4. Click "Start Recording"
5. ✅ Allow microphone access (first popup)
6. Choose "Entire Screen" or "Zoom window" (second popup)
7. ✅ Check "Share system audio" (essential!)
8. Click Share
9. Both your voice AND system audio are recorded!
```

**Advantages:**
✅ Works with desktop applications  
✅ Captures YOUR voice + application audio  
✅ No additional software needed  

**Note:** This also shares your screen visually, but the app only records the audio track.

---

## 🎬 Platform-Specific Guides

### Google Meet (Browser)
**Recommended:** Browser Tab
```
1. Join meeting in Chrome
2. Open transcriber in new tab
3. Select "Browser Tab"
4. Choose Meet tab + Share audio
5. Start transcribing!
```

### Microsoft Teams (Web)
**Recommended:** Browser Tab
```
1. Join Teams meeting in browser
2. Open transcriber in new tab
3. Select "Browser Tab"
4. Choose Teams tab + Share audio
5. Start transcribing!
```

### Microsoft Teams (Desktop)
**Recommended:** System Audio
```
1. Join Teams meeting in desktop app
2. Open transcriber in browser
3. Select "System Audio"
4. Share entire screen + system audio
5. Start transcribing!
```

### Zoom (Web)
**Recommended:** Browser Tab
```
1. Join Zoom in browser
2. Open transcriber in new tab
3. Select "Browser Tab"
4. Choose Zoom tab + Share audio
5. Start transcribing!
```

### Zoom (Desktop)
**Recommended:** System Audio
```
1. Join Zoom meeting
2. Open transcriber in browser
3. Select "System Audio"
4. Share screen + system audio
5. Start transcribing!
```

---

## ⚠️ Common Issues & Solutions

### "No audio track found" Error

**For Browser Tab:**
- **Fix:** Make sure you checked "Share audio" when selecting the tab
- Try again and carefully check the "Share audio" checkbox

**For System Audio:**
- **Fix:** Make sure you checked "Share system audio" 
- Some browsers show this as "Share audio from screen"

### Audio Not Being Recorded

**Check these:**
1. ✅ Did you check the "Share audio" checkbox?
2. ✅ Is the meeting audio actually playing?
3. ✅ Are you using Chrome or Edge? (Best support)
4. ✅ Is your volume up? (Test by playing in preview)

### Permission Denied

**Fix:**
1. Click the 🔒 lock icon in address bar
2. Allow "Camera" and "Microphone" permissions
3. Refresh the page
4. Try again

### Recording Stops Automatically

**Cause:** User switched away from shared tab/window

**Fix:**
- Keep the meeting tab/window open
- Don't close the meeting tab during recording
- For system audio, don't minimize the window

---

## 💡 Pro Tips

### Best Practices

1. **Test First:** Always do a 10-second test recording before important meetings
2. **Use Headphones:** Prevents echo and improves quality
3. **Check "Share Audio":** This is the #1 missed step!
4. **Keep Tab Open:** Don't close the meeting tab while recording
5. **Stop Cleanly:** Click "Stop Recording" before leaving the meeting

### Audio Quality Tips

1. **Stable Internet:** Better connection = better audio quality
2. **Browser Tab > System Audio:** Tab capture usually has better quality
3. **Close Other Apps:** Reduces system load
4. **Use Chrome/Edge:** Best browser support for audio capture

### Privacy Considerations

- ✅ Audio is processed in real-time, not stored on servers
- ✅ You control when recording starts/stops
- ⚠️ Always inform meeting participants you're recording
- ⚠️ Check your organization's recording policies

---

## 🔧 Technical Details

### How Browser Tab Capture Works

```javascript
// The app uses getDisplayMedia API
const stream = await navigator.mediaDevices.getDisplayMedia({
  video: true,  // Required by API (but we discard it)
  audio: {
    echoCancellation: false,
    noiseSuppression: false,
    autoGainControl: false
  }
});

// We extract only the audio track
const audioTrack = stream.getAudioTracks()[0];
const audioStream = new MediaStream([audioTrack]);
```

### Browser Compatibility

| Browser | Microphone | Browser Tab | System Audio |
|---------|-----------|-------------|--------------|
| Chrome  | ✅        | ✅          | ✅           |
| Edge    | ✅        | ✅          | ✅           |
| Firefox | ✅        | ⚠️ Partial   | ⚠️ Partial   |
| Safari  | ✅        | ❌          | ❌           |

**Recommendation:** Use Chrome or Edge for best experience

---

## 📞 Support

### Still Having Issues?

1. Check browser console for errors (F12)
2. Try a different browser (Chrome recommended)
3. Test with a simple video on YouTube first
4. Ensure you're using HTTPS (required for audio capture)

### Feature Requests

Want support for:
- Multiple audio sources simultaneously?
- Real-time transcription during meetings?
- Speaker identification?

Let us know!

---

**Last Updated:** 2026-02-07
