
import { GoogleGenAI } from "@google/genai";

export const sendMessageToGemini = async (prompt: string) => {
  // Use the environment variable directly
  const apiKey = process.env.API_KEY;

  if (!apiKey) {
    console.error("Critical Error: API_KEY is missing. Check Vercel Environment Variables.");
    return "AI system is offline. Please check deployment settings.";
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: "You are Aristo, a world-class educational AI companion. You help students with notes, research, and learning strategies in a supportive and brilliant manner."
      }
    });

    return response.text || "I'm sorry, I couldn't generate a response.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Neural link instability detected. Please try again later.";
  }
};
