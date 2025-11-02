import { GoogleGenerativeAI } from "@google/generative-ai";

// Make sure this is a valid API key!
const client = new GoogleGenerativeAI("AIzaSyDqrAzIuLEfmBINshrqp9egworogYncvm4");
const model = client.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

async function test() {
  try {
    const response = await model.generateContent({
      contents: [
        { role: "user", parts: [{ text: "Hello!how are you" }] }
      ],
      generationConfig: { maxOutputTokens: 20 }
    });
    
    // Correct way to access the response
    console.log(response.response.text());
  } catch (err) {
    console.error(err);
  }
}

test();