# 🔑 How to Add Your OpenAI API Key

This guide shows you different ways to add your OpenAI API key to the Meeting Transcriber app.

## 📋 Prerequisites

1. **Get an OpenAI API Key**:
   - Visit: https://platform.openai.com/signup
   - Sign up or log in
   - Go to: https://platform.openai.com/api-keys
   - Click **"Create new secret key"**
   - Copy the key (starts with `sk-proj-...`)

2. **Navigate to project directory**:
   ```bash
   cd /home/user/webapp
   ```

## 🚀 Method 1: Using the Helper Script (Easiest)

We've created a simple script that updates the API key for you:

```bash
cd /home/user/webapp
./set_api_key.sh YOUR_ACTUAL_API_KEY
```

**Example**:
```bash
./set_api_key.sh sk-proj-abc123xyz789...
```

The script will:
- ✅ Update the `.dev.vars` file
- ✅ Validate the key format
- ✅ Show you next steps

Then restart the server:
```bash
pm2 restart webapp --update-env
```

## 📝 Method 2: Direct Command

Update the API key with a single command:

```bash
cd /home/user/webapp
echo "OPENAI_API_KEY=YOUR_ACTUAL_API_KEY" > .dev.vars
```

**Example**:
```bash
echo "OPENAI_API_KEY=sk-proj-abc123xyz789..." > .dev.vars
```

Then restart the server:
```bash
pm2 restart webapp --update-env
```

## ✏️ Method 3: Edit with Nano

Edit the file directly with a text editor:

```bash
cd /home/user/webapp
nano .dev.vars
```

In the nano editor:
1. Replace `sk-your-openai-api-key-here` with your actual key
2. Press `Ctrl + O` to save
3. Press `Enter` to confirm
4. Press `Ctrl + X` to exit

Then restart the server:
```bash
pm2 restart webapp --update-env
```

## 🖥️ Method 4: Edit with Vi/Vim

For vi/vim users:

```bash
cd /home/user/webapp
vi .dev.vars
```

In the vi editor:
1. Press `i` to enter insert mode
2. Replace `sk-your-openai-api-key-here` with your actual key
3. Press `Esc` to exit insert mode
4. Type `:wq` and press `Enter` to save and quit

Then restart the server:
```bash
pm2 restart webapp --update-env
```

## 🔍 Method 5: Using sed (Advanced)

Replace the placeholder with your key using sed:

```bash
cd /home/user/webapp
sed -i 's/sk-your-openai-api-key-here/YOUR_ACTUAL_API_KEY/' .dev.vars
```

Then restart the server:
```bash
pm2 restart webapp --update-env
```

## ✅ Verify the API Key is Loaded

After updating and restarting, verify the key is working:

```bash
# Method 1: Check health endpoint
curl http://localhost:3000/api/health | jq .

# Expected output:
# {
#   "status": "ok",
#   "hasApiKey": true,
#   "hasDatabase": true
# }
```

```bash
# Method 2: View the file (careful - this shows your key!)
cat .dev.vars
```

## 🧪 Test the Transcription

Once the API key is loaded:

1. Visit the app: https://3000-inw9v4akyow5sac4ewxk7-b32ec7bb.sandbox.novita.ai
2. Try recording or uploading a short audio file
3. Click **Transcribe**
4. You should see the transcription results!

## 🔐 Security Notes

### ✅ Safe Practices

- ✅ `.dev.vars` is in `.gitignore` - won't be committed to Git
- ✅ Only visible in your local development environment
- ✅ Not exposed to the frontend/client
- ✅ Automatically loaded by Wrangler

### ⚠️ Important Warnings

- ⚠️ **Never commit `.dev.vars` to Git** (already protected)
- ⚠️ **Never share your API key publicly**
- ⚠️ **Don't paste your key in chat/email** (unless encrypted)
- ⚠️ **Regenerate if compromised**: Visit https://platform.openai.com/api-keys

## 📊 API Key Format

OpenAI API keys follow this format:
- **Old format**: `sk-abc123...` (48 characters)
- **New format**: `sk-proj-abc123...` (starts with `sk-proj-`)

Both formats are valid and supported.

## 💰 Cost Information

- **Price**: $0.006 per minute of audio
- **Free credits**: New accounts get $5-$18 in credits
- **Example**: 10-minute meeting = $0.06 (6 cents)

## 🐛 Troubleshooting

### API key not detected

```bash
# Check if .dev.vars exists
ls -la /home/user/webapp/.dev.vars

# View content
cat /home/user/webapp/.dev.vars

# Ensure proper format (no spaces around =)
# Correct:   OPENAI_API_KEY=sk-proj-...
# Incorrect: OPENAI_API_KEY = sk-proj-...
```

### Server not loading the key

```bash
# Restart with environment update
cd /home/user/webapp
pm2 restart webapp --update-env

# Check PM2 logs
pm2 logs webapp --nostream

# Verify health endpoint
curl http://localhost:3000/api/health | jq .
```

### "OpenAI API key not configured" error

1. Check the `.dev.vars` file exists and has correct content
2. Restart the server with `--update-env` flag
3. Clear browser cache and reload
4. Check health endpoint returns `"hasApiKey": true`

## 🔄 For Production Deployment

**Do NOT use `.dev.vars` in production!**

For Cloudflare Pages deployment, use secrets:

```bash
# Set production secret
npx wrangler pages secret put OPENAI_API_KEY --project-name webapp

# You'll be prompted to enter your key securely
# The key is encrypted and stored in Cloudflare
```

## 📁 File Contents

Your `.dev.vars` file should look like this:

```bash
OPENAI_API_KEY=sk-proj-your-actual-key-here
```

That's it! Just one line.

## 🆘 Need Help?

If you're still having issues:

1. **Check the health endpoint**:
   ```bash
   curl http://localhost:3000/api/health | jq .
   ```

2. **View PM2 logs**:
   ```bash
   pm2 logs webapp --nostream
   ```

3. **Check OpenAI account**:
   - Visit https://platform.openai.com/account/usage
   - Ensure you have credits available
   - Verify the API key is active

4. **Restart everything**:
   ```bash
   cd /home/user/webapp
   pm2 delete webapp
   npm run build
   pm2 start ecosystem.config.cjs
   ```

## 🎉 Success!

Once you see `"hasApiKey": true` in the health check, you're ready to transcribe meetings! 🎙️

---

**Quick Reference Commands**:

```bash
# Update API key (easiest)
./set_api_key.sh YOUR_KEY

# Restart server
pm2 restart webapp --update-env

# Verify
curl http://localhost:3000/api/health | jq .

# Test app
open https://3000-inw9v4akyow5sac4ewxk7-b32ec7bb.sandbox.novita.ai
```
