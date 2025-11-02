import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "redis";
import PEA_SYSTEM_PROMPT from "./peaSystemPrompt.js";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
// Initialize Gemini client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const gemini = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
// Initialize Redis client
let redis;
let redisInitializing = false;
let redisInitialized = false;

async function initRedis() {
  if (redisInitialized || redisInitializing) return redis;
  
  redisInitializing = true;
  try {
    if (!process.env.REDIS_URL) {
      console.log("⚠️  No REDIS_URL found - conversations will not persist");
      redisInitializing = false;
      return null;
    }

    redis = createClient({
      url: process.env.REDIS_URL,
    });

    redis.on("error", (err) => console.error("Redis Client Error", err));
    redis.on("connect", () => console.log("✅ Redis connected"));

    await redis.connect();
    redisInitialized = true;
    redisInitializing = false;
    return redis;
  } catch (error) {
    console.error("Failed to connect to Redis:", error);
    console.log("⚠️  Running without Redis - conversations will not persist");
    redisInitializing = false;
    return null;
  }
}

// Initialize Redis on startup (for non-serverless)
if (!process.env.VERCEL) {
  initRedis();
}

// Detect serverless environment (Vercel sets VERCEL=1)
const isServerless = Boolean(process.env.VERCEL);

// Provider Registry
// REPLACE THE PROVIDER_REGISTRY IN YOUR BACKEND WITH THIS:

// UPDATED PROVIDER REGISTRY - MORE CREDIBLE WITH KCL TIES

const PROVIDER_REGISTRY = {
  "dr-emma-therapist": {
    id: "dr-emma-therapist",
    name: "Dr. Emma Chen",
    specialty: "Anxiety & Academic Stress",
    category: "Mental Health",
    bio: "CBT therapist with 8 years specializing in student mental health at King's College London. I help with exam anxiety, imposter syndrome, and building resilience through evidence-based approaches.",
    credentials:
      "DClinPsy, King's College London | HCPC Registered | 8 years clinical practice",
    affiliations: "Former King's College London Counselling Service",
    color: "bg-blue-100",
    accentColor: "bg-blue-600",
    aiNote: "Dr. Emma's AI - trained on her 8 years of clinical practice",
    prompt: `You are Dr. Emma Chen, a warm CBT therapist who specializes in helping students manage anxiety and academic stress. You use evidence-based approaches but speak in an accessible, non-clinical way. You help students identify thought patterns, develop coping strategies, and build resilience. You understand the pressure of deadlines, perfectionism, and imposter syndrome. You have 8 years of clinical experience working with students at King's College London.`,
  },
  "tom-osteopath": {
    id: "tom-osteopath",
    name: "Tom Richardson",
    specialty: "Back Pain & Posture",
    category: "Musculoskeletal",
    bio: "Osteopath with 10 years helping London students with back pain, poor posture from desk work, and sports injuries. I give you practical exercises that work without a gym membership.",
    credentials: "MOst, BSc (Hons) Osteopathy | GOsC Registered #8294",
    affiliations: "Practices near King's College London campuses",
    color: "bg-green-100",
    accentColor: "bg-green-600",
    aiNote: "Tom's AI - trained on his 10 years treating students",
    prompt: `You are Tom Richardson, a friendly osteopath who helps students with back pain and posture issues. You're practical and solution-focused. You explain what's happening in their body clearly and give exercises they can actually do in their room or library. You know students sit at desks all day, carry heavy backpacks, and can't always afford gym memberships or regular appointments. You have 10 years of experience working with London students.`,
  },
  "maya-yoga": {
    id: "maya-yoga",
    name: "Maya Patel",
    specialty: "Gentle Movement & Chronic Conditions",
    category: "Movement & Wellness",
    bio: "Trauma-informed yoga instructor who works with people managing chronic conditions and fatigue. I teach adaptable movement that supports your energy, not depletes it.",
    credentials:
      "E-RYT 500 | Trauma-Informed Yoga Certification | Chronic Illness Specialist Training",
    affiliations: "Teaches at London studios serving KCL students",
    color: "bg-orange-100",
    accentColor: "bg-orange-600",
    aiNote: "Maya's AI - trained on her adaptive movement methods",
    prompt: `You are Maya Patel, a trauma-informed yoga instructor who understands chronic conditions, fatigue, and the reality that some days your body just won't cooperate. You're NOT about toxic positivity or pushing through pain. You help people find gentle movement that feels good and supports their energy levels. You adapt everything to what they can actually do that day. You have specialized training in working with chronic illness and trauma.`,
  },
  "lisa-nutritionist": {
    id: "lisa-nutritionist",
    name: "Lisa Ahmed",
    specialty: "Student Nutrition & Budget-Friendly Eating",
    category: "Nutrition & Wellness",
    bio: "Registered nutritionist who gets that students are broke and busy. I help with practical, affordable eating that supports your health without diet culture nonsense.",
    credentials:
      "RNutr (Registered Nutritionist) | MSc Public Health Nutrition, King's College London",
    affiliations: "Trained at King's College London",
    color: "bg-yellow-100",
    accentColor: "bg-yellow-600",
    aiNote: "Lisa's AI - trained on her student nutrition expertise",
    prompt: `You are Lisa Ahmed, a registered nutritionist who works with students. You understand budget constraints, limited cooking facilities, shared kitchens, and busy schedules. You don't do restrictive diets or wellness culture nonsense. You help people eat in a way that supports their health and energy without making food another stressful thing. You're practical, anti-diet culture, and realistic about student life. You completed your MSc at King's College London.`,
  },
  "sarah-acupuncture": {
    id: "sarah-acupuncture",
    name: "Sarah Liu",
    specialty: "Pain Management & Stress Relief",
    category: "Alternative Therapies",
    bio: "Licensed acupuncturist combining traditional Chinese medicine with modern understanding. I help with chronic pain, migraines, and stress without the mystical woo-woo language.",
    credentials:
      "MBAcC (Member, British Acupuncture Council) | Lic.Ac. | 12 years practice",
    affiliations: "Practices in Central London, near KCL campuses",
    color: "bg-teal-100",
    accentColor: "bg-teal-600",
    aiNote: "Sarah's AI - trained on her 12 years of clinical practice",
    prompt: `You are Sarah Liu, an acupuncturist who bridges traditional Chinese medicine and modern healthcare. You're warm, down-to-earth, and speak like a real person - not overly formal or clinical. You're honest and practical about what acupuncture can and can't do.

You explain things clearly without mystical language, but you're not dry or boring about it. You have a gentle sense of humor and genuinely care about helping people feel better. You understand chronic pain, autoimmune conditions, and how frustrating it is when nothing seems to help.

You're excellent at meeting people where they're at - if they're skeptical about acupuncture, you get it and don't push. If they're desperate for relief, you're honest about realistic expectations. You adapt your approach to what someone's body can handle that day.

Key traits:
- Warm and conversational (not robotic or overly professional)
- Honest about limitations (acupuncture isn't magic, but it can help)
- Practical and realistic about what to expect
- Understanding of chronic conditions and invisible disabilities
- Uses everyday language, occasional light humor
- Genuinely empathetic without being syrupy

You have 12 years of clinical experience. Remember: You're chatting with someone, not lecturing them. Be friendly, be real, be helpful.`,
  },
  "sarah-disability-navigator": {
    id: "sarah-disability-navigator",
    name: "Dr. Sarah Bennett",
    specialty: "Disability Rights & University Accommodations",
    category: "Disability Support",
    bio: "Disability rights advocate with 10+ years helping students navigate university support systems, DSA applications, and reasonable adjustments. I know the system inside out.",
    credentials:
      "PhD Education (Disability Studies) | Former DSA Assessor | Equality Act Specialist",
    affiliations:
      "Formerly worked with King's College London Disability Support",
    color: "bg-purple-100",
    accentColor: "bg-purple-600",
    aiNote: "Dr. Bennett's AI - trained on her 10+ years of advocacy",
    prompt: `You are Dr. Sarah Bennett, a disability rights navigator who helps students with disabilities access support and accommodations. You're knowledgeable about DSA (Disabled Students' Allowance), reasonable adjustments, university disability services, access arrangements for exams, and student rights under the Equality Act. You're firm but supportive - you help students advocate for themselves without being combative. You know the language to use with disability services, how to appeal decisions, and what students are legally entitled to. You understand invisible disabilities, chronic illness, mental health disabilities, neurodivergence, and physical disabilities. You're practical about documentation, evidence, and working with the system to get results. You have 10+ years of experience and formerly worked with King's College London's disability support services.`,
  },
};

// Helper functions for Redis storage
async function getConversation(conversationId) {
  await initRedis(); // Ensure Redis is initialized
  if (!redis) return [];
  try {
    const data = await redis.get(`conversation:${conversationId}`);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Error getting conversation:", error);
    return [];
  }
}

async function saveConversation(conversationId, messages) {
  await initRedis(); // Ensure Redis is initialized
  if (!redis) return;
  try {
    // Store with 7-day TTL (in seconds)
    await redis.setEx(
      `conversation:${conversationId}`,
      60 * 60 * 24 * 7, // 7 days
      JSON.stringify(messages)
    );
  } catch (error) {
    console.error("Error saving conversation:", error);
  }
}

async function getUserProfile(conversationId) {
  await initRedis(); // Ensure Redis is initialized
  if (!redis) return { exchangeCount: 0, recommendedProviders: null };
  try {
    const data = await redis.get(`profile:${conversationId}`);
    return data
      ? JSON.parse(data)
      : {
          exchangeCount: 0,
          recommendedProviders: null,
        };
  } catch (error) {
    console.error("Error getting profile:", error);
    return {
      exchangeCount: 0,
      recommendedProviders: null,
    };
  }
}

async function saveUserProfile(conversationId, profile) {
  await initRedis(); // Ensure Redis is initialized
  if (!redis) return;
  try {
    // Store with 7-day TTL (in seconds)
    await redis.setEx(
      `profile:${conversationId}`,
      60 * 60 * 24 * 7, // 7 days
      JSON.stringify(profile)
    );
  } catch (error) {
    console.error("Error saving profile:", error);
  }
}

// Middleware
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "Backend is running",
    providersCount: Object.keys(PROVIDER_REGISTRY).length,
  });
});

// Streaming chat endpoint with provider recommendations
app.post("/api/stream-chat", async (req, res) => {
  const { conversationId, message } = req.body;

  if (!message || !conversationId) {
    return res.status(400).json({ error: "Missing conversationId or message" });
  }

  // Get or create conversation history and profile from KV
  let conversation = await getConversation(conversationId);
  let profile = await getUserProfile(conversationId);

  conversation.push({ role: "user", content: message });
  profile.exchangeCount += 1;

  // Set SSE headers
  // If we're in a serverless environment (Vercel) we cannot reliably use long-lived SSE streams.
  if (isServerless) {
    try {
      const response = await gemini.messages.create({
        model: "gemini-2.0-flash-exp",
        system: PEA_SYSTEM_PROMPT,
        messages: conversation.filter((m) => m.content && m.content.trim()),
        max_tokens: 1024,
      });

      const assistantText = Array.isArray(response?.content)
        ? response.content.map((c) => c.text || "").join("")
        : response?.content?.text || "";

      // Save complete response to conversation history
      conversation.push({ role: "assistant", content: assistantText });
      await saveConversation(conversationId, conversation);

      // (Optional) run provider recommendation logic here synchronously
      let shouldShowProviders = false;
      let recommendedProviders = profile.recommendedProviders || [];

      if (profile.exchangeCount >= 6 && !profile.recommendedProviders) {
        try {
          const recommendationResponse = await gemini.messages.create({
            model: "gemini-2.0-flash-exp",
            max_tokens: 200,
            system: `You are an expert at matching students with healthcare providers. Respond ONLY with provider IDs, comma-separated.`,
            messages: [
              {
                role: "user",
                content: `Based on this conversation, recommend 2-3 providers:\n\n${conversation
                  .map((msg) => `${msg.role}: ${msg.content}`)
                  .join("\n")}
\nProvider IDs only, comma-separated:`,
              },
            ],
          });

          const recommendedIds = recommendationResponse.content[0].text
            .trim()
            .toLowerCase()
            .split(",")
            .map((id) => id.trim());

          recommendedProviders = recommendedIds
            .map((id) => PROVIDER_REGISTRY[id])
            .filter(Boolean);
          if (recommendedProviders.length) {
            profile.recommendedProviders = recommendedProviders;
            await saveUserProfile(conversationId, profile);
            shouldShowProviders = true;
          }
        } catch (err) {
          console.error(
            "Recommendation (serverless) failed:",
            err?.message || err
          );
        }
      }

      return res.json({
        message: assistantText,
        shouldShowProviders,
        recommendedProviders,
      });
    } catch (err) {
      console.error("Serverless chat error:", err);
      return res.status(500).json({ error: err.message || "Unknown error" });
    }
  }

  // Set SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  // Send a comment to keep connection alive
  res.write(": connected\n\n");

  try {
    // Create Gemini stream
    /*const stream = await gemini.messages.stream({
      model: "gemini-2.0-flash-exp",
      system: PEA_SYSTEM_PROMPT,
      messages: conversation.filter((m) => m.content && m.content.trim()),
      max_tokens: 1024,
    });*/
    const stream = await gemini.generateContentStream({
  contents: conversation
    .filter((m) => m.content && m.content.trim())
    .map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    })),
  systemInstruction: {
    parts: [{ text: PEA_SYSTEM_PROMPT }]
  },
  generationConfig: {
    maxOutputTokens: 1024,
  }
});
   
    let fullResponse = "";

    // Process each chunk
    for await (const event of stream.stream) {
    /*  if (
        event.type === "content_block_delta" &&
        event.delta?.type === "text_delta"
      ) */{
        //const text = event.delta.text;
        const text = event.text();
        fullResponse += text;

        // Send the text chunk
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
      }
    }

    // Save complete response to conversation history
    conversation.push({ role: "assistant", content: fullResponse });
    await saveConversation(conversationId, conversation);

    // Check if we should recommend providers
    let shouldShowProviders = false;
    let recommendedProviders = [];

    // Helper: Check if Pea has mentioned care team in conversation
    const peaMentionedCareTeam = (conversation) => {
      const peaMessages = conversation
        .filter((m) => m.role === "assistant")
        .map((m) => m.content.toLowerCase())
        .join(" ");

      const careTeamKeywords = [
        "care team",
        "support team",
        "specialists",
        "introduce you to",
        "meet some people",
        "build a team",
        "putting together",
      ];

      return careTeamKeywords.some((keyword) => peaMessages.includes(keyword));
    };

    // Helper: Detect if user is expressing interest in help/support
    // ONLY counts as interest if Pea already mentioned care team
    const userWantsHelp = (message) => {
      const lower = message.toLowerCase();
      const helpKeywords = [
        "yes",
        "yeah",
        "sure",
        "okay",
        "ok",
        "sounds good",
        "that would be great",
        "would love",
        "let's do it",
        "i'm interested",
      ];
      return helpKeywords.some((keyword) => lower.includes(keyword));
    };

    // Helper: Detect high gravity (multiple stressors)
    // Now requires BOTH high gravity AND sufficient exchanges
    const detectHighGravity = (conversation) => {
      const allMessages = conversation
        .map((m) => m.content)
        .join(" ")
        .toLowerCase();
      const stressors = [
        "pain",
        "stress",
        "anxiety",
        "burnout",
        "overwhelm",
        "exhausted",
        "struggling",
        "difficult",
        "hard",
        "can't cope",
        "too much",
        "pressure",
        "chronic",
        "flare",
        "migraine",
        "insomnia",
        "panic",
      ];
      const matchedStressors = stressors.filter((s) => allMessages.includes(s));
      return matchedStressors.length >= 3;
    };

    const userMessage = conversation[conversation.length - 1].content;
    const hasMentionedCareTeam = peaMentionedCareTeam(conversation);
    const highGravity = detectHighGravity(conversation);
    const userExpressedInterest = userWantsHelp(userMessage);

    console.log(
      `📊 Provider check: exchangeCount=${
        profile.exchangeCount
      }, hasRecommendations=${!!profile.recommendedProviders}, highGravity=${highGravity}, userInterest=${userExpressedInterest}, peaMentionedTeam=${hasMentionedCareTeam}`
    );

    // Trigger recommendations ONLY if:
    // 1. User expressed interest AND Pea already mentioned care team
    // 2. OR high gravity detected AND at least 4+ exchanges (give time for conversation)
    // 3. OR after 8+ messages as final fallback
    const shouldTrigger =
      !profile.recommendedProviders &&
      ((userExpressedInterest && hasMentionedCareTeam) ||
        (highGravity && profile.exchangeCount >= 4) ||
        profile.exchangeCount >= 8);

    // If providers already exist, always show them (stay persistent)
    if (profile.recommendedProviders) {
      console.log("✅ Showing existing providers (persistent view)");
      recommendedProviders = profile.recommendedProviders;
      shouldShowProviders = true;
    } else if (shouldTrigger) {
      try {
        console.log(
          "🔍 Analyzing conversation for provider recommendations..."
        );

        // Build conversation summary
        const conversationSummary = conversation
          .map((msg) => `${msg.role}: ${msg.content}`)
          .join("\n");

        // Ask Claude to recommend providers
        const recommendationResponse = await gemini.messages.create({
          model: "gemini-2.0-flash-exp",
          max_tokens: 200,
          system: `You are an expert at matching students with healthcare providers. 
Analyze conversations and recommend 2-3 providers who would be most helpful.
Respond ONLY with provider IDs, comma-separated.`,
          messages: [
            {
              role: "user",
              content: `Based on this conversation, recommend 2-3 providers:

${conversationSummary}

Available providers:
- dr-emma-therapist: Anxiety, exam stress, imposter syndrome, academic pressure
- tom-osteopath: Back pain, posture, desk work injuries, joint problems
- maya-yoga: Gentle movement, chronic fatigue, autoimmune conditions, mobility
- lisa-nutritionist: Budget-friendly eating, meal planning, energy management
- sarah-acupuncture: Chronic pain, migraines, stress relief, sleep issues
- sarah-disability-navigator: Disability rights, university accommodations, DSA applications

Provider IDs only, comma-separated:`,
            },
          ],
        });

        const recommendedIds = recommendationResponse.content[0].text
          .trim()
          .toLowerCase()
          .split(",")
          .map((id) => id.trim());

        console.log("💡 Recommended provider IDs:", recommendedIds);

        // Get full provider objects
        recommendedProviders = recommendedIds
          .map((id) => PROVIDER_REGISTRY[id])
          .filter((p) => p); // Remove any invalid IDs

        // Store recommendations
        if (recommendedProviders.length > 0) {
          profile.recommendedProviders = recommendedProviders;
          shouldShowProviders = true;
          await saveUserProfile(conversationId, profile);
          console.log(
            "✅ Providers recommended:",
            recommendedProviders.map((p) => p.name)
          );
        }
      } catch (error) {
        console.error("❌ Error getting recommendations:", error);
        // Continue without recommendations if this fails
      }
    }

    // Send metadata with completion
    res.write(
      `data: ${JSON.stringify({
        done: true,
        shouldShowProviders,
        recommendedProviders: profile.recommendedProviders || [],
      })}\n\n`
    );
    res.end();
  } catch (error) {
    console.error("Stream error:", error);
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
});

// Provider-specific chat endpoint
// ADD THIS TO YOUR BACKEND (server.js or index.js)
// ADD THIS NEW ENDPOINT AFTER YOUR /api/stream-chat ENDPOINT:

// Provider-specific chat endpoint
app.post("/api/provider-chat", async (req, res) => {
  const { conversationId, providerId, message } = req.body;

  if (!message || !conversationId || !providerId) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  // Get provider from registry
  const provider = PROVIDER_REGISTRY[providerId];
  if (!provider) {
    return res.status(404).json({ error: "Provider not found" });
  }

  // Get or create conversation history for this provider
  const providerConvKey = `${conversationId}-${providerId}`;
  let providerConversation = await getConversation(providerConvKey);

  // CRITICAL: If this is the first message to this provider, get context from main Pea conversation
  if (providerConversation.length === 0) {
    const mainConversation = await getConversation(conversationId);

    // Create a context summary from Pea conversation
    if (mainConversation.length > 0) {
      const contextSummary = mainConversation
        .filter((msg) => msg.role === "user") // Only user messages to understand their situation
        .map((msg) => msg.content)
        .join("\n");

      // Add system context as first message
      providerConversation.push({
        role: "user",
        content: `[Context from Pea: The person you're talking to has shared the following with Pea:\n\n${contextSummary}\n\nNow they're reaching out to you specifically for help with ${provider.specialty.toLowerCase()}. Be warm and acknowledge what they've been dealing with.]`,
      });

      // Add a system acknowledgment so the provider knows to reference it
      providerConversation.push({
        role: "assistant",
        content: `Got it - I understand the context. I'll be warm and reference what they've shared.`,
      });
    }
  }

  providerConversation.push({ role: "user", content: message });

  try {
    // Use provider-specific system prompt
    const response = await gemini.messages.create({
      model: "gemini-2.0-flash-exp",
      system: provider.prompt, // Each provider has their own personality/expertise prompt
      messages: providerConversation.filter(
        (m) => m.content && m.content.trim()
      ),
      max_tokens: 1024,
    });

    const assistantText = Array.isArray(response?.content)
      ? response.content.map((c) => c.text || "").join("")
      : response?.content?.text || "";

    // Save response
    providerConversation.push({ role: "assistant", content: assistantText });
    await saveConversation(providerConvKey, providerConversation);

    return res.json({
      message: assistantText,
      provider: {
        id: provider.id,
        name: provider.name,
        specialty: provider.specialty,
      },
    });
  } catch (error) {
    console.error("Provider chat error:", error);
    return res.status(500).json({ error: error.message || "Unknown error" });
  }
});

// EXPLANATION OF THE FIX:
// When a user first chats with a provider, we now:
// 1. Check if this is their first message to this provider (empty conversation history)
// 2. If yes, get the main Pea conversation history
// 3. Extract all user messages (their actual situation/struggles)
// 4. Pass this as context to the provider
// 5. Provider can now reference what the user shared with Pea
//
// This way when Sarah says "Pea filled me in", she actually HAS been filled in!

// Get all providers endpoint (optional, for debugging)
app.get("/api/providers", (req, res) => {
  res.json(Object.values(PROVIDER_REGISTRY));
});

// Clear conversation endpoint
app.post("/api/clear-conversation", (req, res) => {
  const { conversationId } = req.body;
  conversations.delete(conversationId);
  userProfiles.delete(conversationId);
  res.json({ success: true });
});

// Dismiss provider recommendations
app.post("/api/dismiss-providers", async (req, res) => {
  try {
    const { conversationId } = req.body;

    // Get existing profile
    const profile = await getUserProfile(conversationId);

    // Remove recommended providers
    delete profile.recommendedProviders;

    // Save updated profile
    await saveUserProfile(conversationId, profile);

    console.log(`✅ Dismissed providers for conversation ${conversationId}`);
    res.json({ success: true });
  } catch (error) {
    console.error("Error dismissing providers:", error);
    res.status(500).json({ error: "Failed to dismiss providers" });
  }
});

// Load conversation history (for page refresh)
app.post("/api/load-conversation", async (req, res) => {
  try {
    const { conversationId } = req.body;

    // Get main Pea conversation
    const messages = await getConversation(conversationId);

    // Get user profile (for recommended providers)
    const profile = await getUserProfile(conversationId);

    // Get all provider conversations
    const providerConversations = {};
    if (
      profile.recommendedProviders &&
      profile.recommendedProviders.length > 0
    ) {
      for (const provider of profile.recommendedProviders) {
        const providerConvKey = `${conversationId}-${provider.id}`;
        const providerMessages = await getConversation(providerConvKey);
        if (providerMessages.length > 0) {
          providerConversations[provider.id] = providerMessages;
        }
      }
    }

    res.json({
      messages: messages || [],
      recommendedProviders: profile.recommendedProviders || [],
      providerConversations: providerConversations,
    });
  } catch (error) {
    console.error("Error loading conversation:", error);
    res.status(500).json({ error: "Failed to load conversation" });
  }
});

// Start server (only for local development)
if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => {
    console.log(`✅ Backend running on http://localhost:${PORT}`);
    console.log(
      `✅ API Key configured: ${process.env.GEMINI_API_KEY ? "Yes" : "No"}`
    );
    console.log(
      `✅ Providers loaded: ${Object.keys(PROVIDER_REGISTRY).length}`
    );
  });
}

// EXPORT FOR VERCEL: one request at a time
export default function handler(req, res) {
  return app(req, res);
}
