import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, Plugin} from 'vite';
import {GoogleGenAI} from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

function apiFallbackPlugin(): Plugin {
  return {
    name: 'api-fallback-plugin',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url || '';
        // Match /api/chat with or without trailing slash or query params
        const isApiChat = url.split('?')[0].replace(/\/$/, '') === '/api/chat';

        if (isApiChat && req.method === 'POST') {
          let body = '';
          
          req.on('data', chunk => {
            body += chunk;
          });

          req.on('end', async () => {
            try {
              const { messages } = JSON.parse(body || '{}');
              
              if (!messages || !Array.isArray(messages)) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: "Invalid request format. 'messages' array is required." }));
                return;
              }

              const apiKey = process.env.GEMINI_API_KEY;
              if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
                res.statusCode = 403;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({
                  error: "Gemini API Key is missing. Please configure GEMINI_API_KEY as an environment secret in AI Studio or your Vercel dashboard."
                }));
                return;
              }

              // Initialize GenAI safely
              const ai = new GoogleGenAI({
                apiKey: apiKey,
                httpOptions: {
                  headers: {
                    'User-Agent': 'aistudio-build-dev-server'
                  }
                }
              });

              const contents = messages.map((msg: any) => ({
                role: msg.role === "user" ? "user" : "model",
                parts: [{ text: msg.content }]
              }));

              const modelName = "gemini-3.5-flash"; 
              const systemInstruction = 
                "You are 'AI-Insight', a friendly, approachable, and highly intelligent AI specialist assistant. " +
                "Your sole topic of discussion is Artificial Intelligence (AI), its history, its theories, models, applications, ethical boundaries, and futures. " +
                "You explain concepts like Machine Learning, Deep Learning, Large Language Models, Neural Networks, Computer Vision, and NLP clearly with useful real-world analogies. " +
                "Keep your tone respectful, engaging, and professional. Use markdown formatting such as bold text, neat bullet points, or code accents to outline structure clearly. " +
                "IMPORTANT: If a user asks questions that are entirely unrelated to technology, computer science, or AI, " +
                "you should politely pivot the discussion, explaining what you can do.";

              // Request to Google Gemini API
              const response = await ai.models.generateContent({
                model: modelName,
                contents: contents,
                config: {
                  systemInstruction: systemInstruction,
                  temperature: 0.7,
                }
              });

              const replyText = response.text || "I apologize, but I could not formulate an AI insight right now. Please try rephrasing your thought.";
              
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ reply: replyText }));

            } catch (err: any) {
              console.error("Gemini dev server middleware API call failed:", err);
              
              // Handle standard Google API 403/Permission denied responses
              let errorMessage = err.message || "An unexpected error occurred in the dev server middleware.";
              let statusCode = 500;

              if (err.status === 403 || errorMessage.includes("PERMISSION_DENIED") || errorMessage.includes("denied access")) {
                statusCode = 403;
                errorMessage = "PERMISSION_DENIED: Your API Key or Google Cloud project has been denied access. Please check your AI Studio credentials, billings, or project state.";
              }

              res.statusCode = statusCode;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: errorMessage }));
            }
          });

          // Resume stream to guarantee events fire
          req.resume();
        } else {
          next();
        }
      });
    }
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), apiFallbackPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
