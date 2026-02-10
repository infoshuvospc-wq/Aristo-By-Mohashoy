
import { GoogleGenAI } from "@google/genai";

const API_KEY = process.env.API_KEY || "";

export const sendMessageToGemini = async (prompt: string) => {
  if (!API_KEY) {
    // Return a mocked response if no key is provided for immediate functionality
    return "I'm currently in demo mode. Connect your Gemini API Key to enable my full intelligent features!";
  }

  try {
    const ai = new GoogleGenAI({ apiKey: API_KEY });
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
    return "Something went wrong with our neural link. Please try again.";
  }
};
