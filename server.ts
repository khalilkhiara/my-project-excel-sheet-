import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
app.use(express.json({ limit: "10mb" }));

const PORT = 3000;

// Initialize Google GenAI securely (server-side only)
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// API Endpoint for AI piping assistant
app.post("/api/gemini/analyze", async (req, res) => {
  try {
    const { prompt, currentItems } = req.body;
    
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
      return res.status(400).json({ 
        error: "Gemini API Key is missing. Please add it via the Settings > Secrets panel in the AI Studio interface."
      });
    }

    const systemInstruction = `You are 'Orion AI', an expert industrial piping engineering consultant, estimator, and MTO coordinator.
Analyzing a database of pipes, fittings (elbows, reducers, tees), schedule classes, services, and NPD (Nominal Pipe Diameter Sizes).
Provide technical, highly detailed, precise, and practical answers.
Calculate correct weld count estimates (for example: number of joints required for each size), find material mismatches, suggest logistics plans, or perform technical lookups.
Format your responses beautifully in responsive Markdown. Keep responses clear and conversational, yet strictly professional.`;

    const contents = `Here is the current piping material takeoff database containing ${currentItems?.length || 0} items:
${JSON.stringify(currentItems || [], null, 2)}

User Request:
${prompt}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents,
      config: {
        systemInstruction,
        temperature: 0.2,
      },
    });

    res.json({ response: response.text });
  } catch (error: any) {
    console.error("Gemini API error:", error);
    res.status(500).json({ error: error.message || "An error occurred calling the Gemini API on the server." });
  }
});

// API health endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

const isProd = process.env.NODE_ENV === "production" || process.argv.includes("--prod");

async function startServer() {
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite middleware loaded");
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("Production static server loaded");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Piping Dashboard Server] running at http://localhost:${PORT} (${isProd ? "production" : "dev"})`);
  });
}

startServer();
