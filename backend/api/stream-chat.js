import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";
import PEA_SYSTEM_PROMPT from "../peaSystemPrompt.js";
import app from "../index.js";

dotenv.config();

const app = express();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const conversations = new Map();
const userProfiles = new Map();

app.use(cors());
app.use(express.json());

app.post("/api/stream-chat", async (req, res) => {
  const { conversationId, message } = req.body;

  if (!message || !conversationId) {
    return res.status(400).json({ error: "Missing conversationId or message" });
  }

  let conversation = conversations.get(conversationId) || [];
  let profile = userProfiles.get(conversationId) || {
    exchangeCount: 0,
    recommendedProviders: null,
  };

  conversation.push({ role: "user", content: message });
  profile.exchangeCount += 1;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  res.write(": connected\n\n");

  try {
    const stream = await gemini.messages.stream({
      model: "gemini-2.5-flash",
      system: PEA_SYSTEM_PROMPT,
      messages: conversation.filter((m) => m.content && m.content.trim()),
      max_tokens: 1024,
    });

    let fullResponse = "";

    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta?.type === "text_delta"
      ) {
        const text = event.delta.text;
        fullResponse += text;
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
      }
    }

    conversation.push({ role: "assistant", content: fullResponse });
    conversations.set(conversationId, conversation);

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (error) {
    console.error("Stream error:", error);
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
});

export default app;
