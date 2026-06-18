import { GoogleGenAI } from "@google/genai";

export default async function handler(req: any, res: any) {
  // Support standard HTTP methods
  if (req.method !== 'POST') {
    res.status(405).json({ error: "Method Not Allowed. Only POST requests are supported on this endpoint." });
    return;
  }

  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
      res.status(400).json({ error: "Invalid request. 'messages' array is required." });
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
      res.status(403).json({
        error: "Gemini API Key is not configured on Vercel. Please add a GEMINI_API_KEY environment variable in your Vercel project settings."
      });
      return;
    }

    // Lazy load/initialize GoogleGenAI
    const ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build-vercel',
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
    res.status(200).json({ reply: replyText });

  } catch (err: any) {
    console.error("Vercel backend error:", err);
    res.status(500).json({ error: err.message || "An unexpected error occurred inside the Vercel serverless function." });
  }
}
