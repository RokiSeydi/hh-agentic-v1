// ADD THIS TO YOUR BACKEND (server.js or index.js)
// ADD THIS NEW ENDPOINT AFTER YOUR /api/stream-chat ENDPOINT:
// Provider-specific chat endpoint

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";
import app from "../index.js";

dotenv.config();

const app = express();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const conversations = new Map();
const userProfiles = new Map();

app.use(cors());
app.use(express.json());
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
  let providerConversation = conversations.get(providerConvKey) || [];

  // CRITICAL: If this is the first message to this provider, get context from main Pea conversation
  if (providerConversation.length === 0) {
    const mainConversation = conversations.get(conversationId) || [];

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
      model: "gemini-2.5-flash",
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
    conversations.set(providerConvKey, providerConversation);

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
