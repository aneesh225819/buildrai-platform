# ⚡ Quick Start - Get BuildrAI Running in 20 Minutes

## 🎯 You Need These 3 Things:

### 1️⃣ Clerk (FREE) - 5 minutes
- **Website:** https://clerk.com
- **What to get:** 2 API keys
- **Purpose:** User login/signup

### 2️⃣ MongoDB Atlas (FREE) - 10 minutes
- **Website:** https://www.mongodb.com/cloud/atlas
- **What to get:** Connection string
- **Purpose:** Store projects and user data

### 3️⃣ Anthropic API ($20) - 5 minutes
- **Website:** https://console.anthropic.com
- **What to get:** API key + add $20 credits
- **Purpose:** AI code generation

---

## 📋 Step-by-Step Checklist

### [ ] Step 1: Sign up for Clerk
1. Go to https://clerk.com → Create account
2. Create new application: "BuildrAI"
3. Copy these keys:
   ```
   ✓ Publishable Key: pk_test_...
   ✓ Secret Key: sk_test_...
   ```

### [ ] Step 2: Sign up for MongoDB Atlas
1. Go to https://www.mongodb.com/cloud/atlas → Create account
2. Create FREE M0 cluster
3. Create database user (username + password)
4. Whitelist IP: "Allow access from anywhere" (for dev)
5. Copy connection string:
   ```
   ✓ mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/buildrai?...
   ```

### [ ] Step 3: Sign up for Anthropic
1. Go to https://console.anthropic.com → Create account
2. Add $20 credits (Settings → Billing)
3. Create API key:
   ```
   ✓ sk-ant-api03-...
   ```

### [ ] Step 4: Update .env.local
Open `/buildrai-platform/.env.local` and replace these 3 lines:

```bash
# Replace line 6:
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=YOUR_CLERK_PUBLISHABLE_KEY

# Replace line 7:
CLERK_SECRET_KEY=YOUR_CLERK_SECRET_KEY

# Replace line 14:
MONGODB_URI=YOUR_MONGODB_CONNECTION_STRING

# Replace line 17:
ANTHROPIC_API_KEY=YOUR_ANTHROPIC_API_KEY
```

### [ ] Step 5: Restart the server
```bash
# Stop the current server (Ctrl+C in terminal)
# Then run:
npm run dev
```

### [ ] Step 6: Test it!
1. Open http://localhost:3000
2. Click "Sign Up"
3. Create an account
4. You should see the dashboard!
5. Try creating a project and generating code

---

## ✅ Success Checklist

After setup, you should be able to:
- [ ] Sign up with email + password
- [ ] See the dashboard
- [ ] Create a new project
- [ ] Generate code with AI
- [ ] See no MongoDB errors in terminal

---

## 🐛 Common Issues

### "Failed to load Clerk JS"
- Double-check your Clerk keys start with `pk_test_` and `sk_test_`
- Make sure no extra spaces when copying

### "MongoDB connection error: ENOTFOUND"
- Verify you replaced `<username>` and `<password>` in the connection string
- Check you added `/buildrai` before the `?`
- Example: `mongodb+srv://user:pass@cluster0.abc.mongodb.net/buildrai?retryWrites=true...`

### "Anthropic API error"
- Check you have credits in your Anthropic account
- Verify the key starts with `sk-ant-api03-`

---

## 💰 Cost Summary

| Service | Cost | Free Tier |
|---------|------|-----------|
| Clerk | FREE | Up to 10,000 users |
| MongoDB | FREE | 512MB storage forever |
| Anthropic | $20 to start | None (pay-as-you-go) |

**Total to get started: $20**

---

## 📞 Need Help?

1. Check `SETUP_GUIDE.md` for detailed instructions
2. Check `TROUBLESHOOTING.md` for common issues
3. All features are documented in phase docs (PHASE_1...PHASE_5.md)

---

**That's it! You're ready to build with AI! 🚀**
