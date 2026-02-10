
import { GoogleGenAI } from "@google/genai";

export const sendMessageToGemini = async (prompt: string) => {
  // Accessing the API key directly from environment variables per guidelines
  if (!process.env.API_KEY) {
    console.error("Critical Error: API_KEY is undefined. Check your hosting environment variables.");
    return "AI system is offline. Please ensure your Gemini API Key is correctly configured in your hosting dashboard.";
  }

  try {
    // Initializing with the recommended named parameter and direct env access
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
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
    return "Neural link instability detected. Please verify your API Key and network connection.";
  }
};
