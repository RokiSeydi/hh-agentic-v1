import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Anthropic from "@anthropic-ai/sdk";
import PEA_SYSTEM_PROMPT from "./peaSystemPrompt.js";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Provider Registry
const PROVIDER_REGISTRY = {
  "dr-emma-therapist": {
    id: "dr-emma-therapist",
    name: "Dr. Emma Chen",
    specialty: "Anxiety & Academic Stress",
    category: "Mental Health",
    bio: "CBT therapist specializing in student mental health. I help with exam anxiety, imposter syndrome, and building resilience through evidence-based approaches that actually make sense for student life.",
    credentials: "CBT-certified | 8+ years with students",
    color: "bg-blue-100",
    accentColor: "bg-blue-600",
    prompt: `You are Dr. Emma Chen, a warm CBT therapist who specializes in helping students manage anxiety and academic stress. You use evidence-based approaches but speak in an accessible, non-clinical way. You help students identify thought patterns, develop coping strategies, and build resilience. You understand the pressure of deadlines, perfectionism, and imposter syndrome.`,
  },
  "tom-osteopath": {
    id: "tom-osteopath",
    name: "Tom Richardson",
    specialty: "Back Pain & Posture",
    category: "Musculoskeletal",
    bio: "Osteopath helping students with back pain, poor posture from desk work, and sports injuries. I give you practical exercises that actually work for student life - no gym membership required.",
    credentials: "10 years experience | GOsC registered",
    color: "bg-green-100",
    accentColor: "bg-green-600",
    prompt: `You are Tom Richardson, a friendly osteopath who helps students with back pain and posture issues. You're practical and solution-focused. You explain what's happening in their body clearly and give exercises they can actually do in their room or library. You know students sit at desks all day, carry heavy backpacks, and can't always afford gym memberships or regular appointments.`,
  },
  "maya-yoga": {
    id: "maya-yoga",
    name: "Maya Patel",
    specialty: "Gentle Movement & Chronic Conditions",
    category: "Movement & Wellness",
    bio: "Trauma-informed yoga instructor who works with people managing chronic conditions and fatigue. I'm not about pushing through pain - I help you move in ways that feel good and support your energy.",
    credentials: "200hr certified | Trauma-informed training",
    color: "bg-orange-100",
    accentColor: "bg-orange-600",
    prompt: `You are Maya Patel, a trauma-informed yoga instructor who understands chronic conditions, fatigue, and the reality that some days your body just won't cooperate. You're NOT about toxic positivity or pushing through pain. You help people find gentle movement that feels good and supports their energy levels. You adapt everything to what they can actually do that day.`,
  },
  "lisa-nutritionist": {
    id: "lisa-nutritionist",
    name: "Lisa Ahmed",
    specialty: "Student Nutrition & Budget-Friendly Eating",
    category: "Nutrition & Wellness",
    bio: "Registered nutritionist who gets that students are broke and busy. I help with practical, affordable eating that supports your health without the diet culture BS or complicated meal prep.",
    credentials: "RNutr registered | Anti-diet approach",
    color: "bg-yellow-100",
    accentColor: "bg-yellow-600",
    prompt: `You are Lisa Ahmed, a registered nutritionist who works with students. You understand budget constraints, limited cooking facilities, shared kitchens, and busy schedules. You don't do restrictive diets or wellness culture nonsense. You help people eat in a way that supports their health and energy without making food another stressful thing. You're practical, anti-diet culture, and realistic about student life.`,
  },
  "sarah-acupuncture": {
    id: "sarah-acupuncture",
    name: "Sarah Liu",
    specialty: "Pain Management & Stress Relief",
    category: "Alternative Therapies",
    bio: "Licensed acupuncturist combining traditional Chinese medicine with modern understanding. I help with chronic pain, migraines, stress, and sleep issues without the mystical woo-woo language.",
    credentials: "BAcC registered | 12 years practice",
    color: "bg-teal-100",
    accentColor: "bg-teal-600",
    prompt: `You are Sarah Liu, an acupuncturist who bridges traditional Chinese medicine and modern healthcare. You're excellent at explaining what you do without mystical language. You help students understand how acupuncture can help their specific issues (pain, migraines, stress, sleep) and what to realistically expect. You're honest about what acupuncture can and can't do.`,
  },
  "james-founder-coach": {
    id: "james-founder-coach",
    name: "James Okonkwo",
    specialty: "Founder Wellbeing & Strategy",
    category: "Life Coaching",
    bio: "Former founder who burned out, recovered, and now helps student entrepreneurs balance building companies without destroying their mental health. Been there, done that, learned the hard way.",
    credentials: "Built 2 companies | Certified coach",
    color: "bg-indigo-100",
    accentColor: "bg-indigo-600",
    prompt: `You are James Okonkwo, a founder coach who's been through the startup grind and burnout. You help student founders with strategy, prioritization, and protecting their mental health while building. You're direct but caring. You know when to push people and when to tell them to rest. You've made all the mistakes so they don't have to.`,
  },
};

// Store conversations and user profiles in memory (use a DB in production)
const conversations = new Map();
const userProfiles = new Map();

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

  // Get or create conversation history and profile
  let conversation = conversations.get(conversationId) || [];
  let profile = userProfiles.get(conversationId) || {
    exchangeCount: 0,
    recommendedProviders: null,
  };

  conversation.push({ role: "user", content: message });
  profile.exchangeCount += 1;

  // Set SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  // Send a comment to keep connection alive
  res.write(": connected\n\n");

  try {
    // Create Anthropic stream
    const stream = await anthropic.messages.stream({
      model: "claude-sonnet-4-5-20250929",
      system: PEA_SYSTEM_PROMPT,
      messages: conversation.filter((m) => m.content && m.content.trim()),
      max_tokens: 1024,
    });

    let fullResponse = "";

    // Process each chunk
    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta?.type === "text_delta"
      ) {
        const text = event.delta.text;
        fullResponse += text;

        // Send the text chunk
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
      }
    }

    // Save complete response to conversation history
    conversation.push({ role: "assistant", content: fullResponse });
    conversations.set(conversationId, conversation);

    // Check if we should recommend providers (after 6+ exchanges)
    let shouldShowProviders = false;
    let recommendedProviders = [];

    if (profile.exchangeCount >= 6 && !profile.recommendedProviders) {
      try {
        console.log(
          "🔍 Analyzing conversation for provider recommendations..."
        );

        // Build conversation summary
        const conversationSummary = conversation
          .map((msg) => `${msg.role}: ${msg.content}`)
          .join("\n");

        // Ask Claude to recommend providers
        const recommendationResponse = await anthropic.messages.create({
          model: "claude-sonnet-4-5-20250929",
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
- james-founder-coach: Startup stress, burnout prevention, work-life balance, prioritization

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
          userProfiles.set(conversationId, profile);
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

// Start server (only for local development)
if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => {
    console.log(`✅ Backend running on http://localhost:${PORT}`);
    console.log(
      `✅ API Key configured: ${process.env.ANTHROPIC_API_KEY ? "Yes" : "No"}`
    );
    console.log(
      `✅ Providers loaded: ${Object.keys(PROVIDER_REGISTRY).length}`
    );
  });
}

// Export for Vercel serverless
export default app;
