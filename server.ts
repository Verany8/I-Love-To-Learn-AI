import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route for chatbot dialogue
  app.post("/api/chat", async (req, res) => {
    try {
      const { messages } = req.body;
      if (!messages || !Array.isArray(messages)) {
        res.status(400).json({ error: "Invalid request. 'messages' array is required." });
        return;
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
        res.status(403).json({
          error: "Gemini API Key is not configured. Please specify a valid GEMINI_API_KEY in the Secrets / Environment panel."
        });
        return;
      }

      // Lazy load/initialize GoogleGenAI
      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      // Map message structure to @google/genai Gemini specifications
      const contents = messages.map((msg: any) => ({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.content }]
      }));

      const modelName = "gemini-3.5-flash"; // Recommended model for standard text conversations
      const systemInstruction = 
        "You are 'AI-Insight', a friendly, approachable, and highly intelligent AI specialist assistant. " +
        "Your sole topic of discussion is Artificial Intelligence (AI), its history, its theories, models, applications, ethical boundaries, and futures. " +
        "You explain concepts like Machine Learning, Deep Learning, Large Language Models, Neural Networks, Computer Vision, and NLP clearly with useful real-world analogies. " +
        "Keep your tone respectful, engaging, and professional. Use markdown formatting such as bold text, neat bullet points, or code accents to outline structure clearly. " +
        "IMPORTANT: If a user asks questions that are entirely unrelated to technology, computer science, or AI (such as cooking recipes, unrelated history, sports gossip, general entertainment, etc.), " +
        "you should politely pivot the discussion, explaining what you can do (e.g., 'I specialize in Artificial Intelligence. While I can't help with general baking queries, I can explain how machine learning models optimize kitchen supply chains! Let's talk about AI!').";

      const response = await ai.models.generateContent({
        model: modelName,
        contents: contents,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.7,
        }
      });

      const replyText = response.text || "I apologize, but I could not formulate an AI insight right now. Please try rephrasing your thought.";
      res.json({ reply: replyText });

    } catch (err: any) {
      console.error("Gemini proxy server error:", err);
      res.status(500).json({ error: err.message || "An unexpected error occurred inside the AI service." });
    }
  });

  // Vite Integration
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in development mode with Vite middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in production mode...");
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running beautifully at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Fatal server startup failure:", err);
});
