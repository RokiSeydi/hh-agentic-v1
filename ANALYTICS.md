# PostHog Analytics Setup

## ✅ What's Tracked

### Key Metrics (Automatic)

- **DAU (Daily Active Users)** - Unique users per day
- **WAU/MAU** - Weekly/Monthly Active Users
- **Retention** - Cohort-based retention curves (D1, D7, D30)
- **Session Duration** - Time spent in app per session
- **Session Count** - How many times users return

### Custom Events

1. **`session_started`** - User opens/refreshes app
   - Properties: 
     - `has_history` (returning vs new user)
     - `message_count` (total messages in conversation)
     - `has_providers` (whether they have recommendations)

2. **`message_sent`** - User sends message to Pea
   - Property: `message_length`
   - **Use this to calculate:** Messages per session, engagement depth

3. **`providers_recommended`** - Care team shown to user
   - Properties: `provider_count`, `provider_ids`
   - **Use this to calculate:** % of users who get recommendations

4. **`provider_chat_started`** 🎯 **KEY ACTIVATION METRIC**
   - User clicks on a provider to start chatting
   - Properties: `provider_id`, `provider_name`, `provider_specialty`
   - **Use this to calculate:** Activation rate, most popular providers

5. **`provider_message_sent`** - User sends message to a provider
   - Properties: `provider_id`, `provider_name`, `message_length`
   - **Use this to calculate:** Provider engagement, conversation depth

## 📊 How to Access Your Dashboard

1. Go to https://app.posthog.com
2. Navigate to **Insights** → Create new insight
3. Use these queries:

### DAU (Daily Active Users)

- Event: Any event
- Aggregation: Unique users
- Time: Last 30 days

### Activation Rate

- Event: `provider_chat_started`
- As percentage of: `session_started`

### Retention

- Go to **Retention** tab
- Cohort: Users who did `session_started`
- Came back and did: Any event

## 🔑 Setup Instructions

1. **Sign up:** https://posthog.com/signup (free, takes 30 seconds)

2. **Get your API key:**

   - Go to Project Settings
   - Copy the API key (starts with `phc_...`)

3. **Add to environment:**

   - Local: Add to `frontend/.env.local`
   - Production: Add to Vercel environment variables

   ```
   VITE_POSTHOG_KEY=phc_your_key_here
   ```

4. **Deploy!**
   ```bash
   git add .
   git commit -m "Add PostHog analytics"
   git push origin main
   ```

## 🎯 Key Questions You Can Answer

### User Acquisition & Growth
- **How many daily/weekly/monthly active users?**
- **What's our growth rate week-over-week?**
- **How many new users vs returning users each day?**

### Engagement
- **Average messages per session with Pea?**
  - Count `message_sent` events per user per day
- **How long do users chat with Pea before getting recommendations?**
  - Time from `session_started` to `providers_recommended`
- **Average session duration?**
  - Built-in PostHog metric

### Activation & Conversion
- **What % of users get provider recommendations?**
  - `providers_recommended` / `session_started`
- **What % activate by chatting with a provider?** 🎯
  - `provider_chat_started` / `providers_recommended`
- **Which providers are most popular?**
  - Count `provider_chat_started` grouped by `provider_name`
- **How deep do users engage with providers?**
  - Count `provider_message_sent` per user

### Retention
- **What's our D1/D7/D30 retention?**
  - Built-in retention cohorts
- **Do users who chat with providers retain better?**
  - Compare retention: users who did `provider_chat_started` vs those who didn't

## 🔒 Privacy

PostHog is GDPR/HIPAA-friendly:

- No PII is tracked (we use `conversationId` as user ID)
- Can self-host if needed
- EU cloud option available
- Respects Do Not Track

## 📈 Next Steps

Once you have 100+ users, you can add:

- Feature flags (A/B testing)
- Session recordings (watch user sessions)
- Funnels (track conversion flows)
- Cohorts (segment power users)
