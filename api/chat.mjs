import PEA_SYSTEM_PROMPT from "../backend/peaSystemPrompt.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const { conversationId, message } = await req.json();
    if (!conversationId || !message) {
      return res
        .status(400)
        .json({ error: "Missing conversationId or message" });
    }

    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      return res.status(500).json({ error: "Missing Gemini API key" });
    }

    const body = {
      model: "gemini-2.5-flash",
      system: PEA_SYSTEM_PROMPT,
      messages: [{ role: "user", content: message }],
      max_tokens: 1024,
    };

    const r = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": geminiKey,
      },
      body: JSON.stringify(body),
    });

    if (!r.ok) {
      const text = await r.text();
      console.error("Gemini error:", r.status, text);
      return res.status(502).json({ error: "Model API error" });
    }

    const json = await r.json();
    // Try to extract assistant text from common shapes
    let assistantText = "";
    if (Array.isArray(json?.content)) {
      assistantText = json.content.map((c) => c.text || "").join("");
    } else if (json?.content?.text) {
      assistantText = json.content.text;
    } else if (typeof json?.completion === "string") {
      assistantText = json.completion;
    }

    return res.json({ message: assistantText || "" });
  } catch (err) {
    console.error("/api/chat error:", err);
    res.status(500).json({ error: err.message || String(err) });
  }
}
