require("dotenv").config();
const express = require("express");
const app = express();
const port = process.env.PORT || 3001;

// DISABLE COMPRESSION FOR STREAMING - ADD THIS:
app.use((req, res, next) => {
  res.set("X-Accel-Buffering", "no");
  next();
});

app.use(express.json());

// Health route
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: Date.now(), port });
});

// Placeholder endpoint showing Anthropic usage (no real call)
app.post("/api/stream-chat", (req, res) => {
  const { message } = req.body || {};
  // Normally you'd call Anthropic here using process.env.ANTHROPIC_API_KEY
  res.json({ reply: `Echo: ${message || ""}`, source: "placeholder" });
});

app.listen(port, () => {
  console.log(`Server (server.js) listening on http://localhost:${port}`);
});
