import OpenAI from "openai";
import { ChatMessage } from "../types";

// Helper to get the AI client
const getAiClient = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  const baseURL = process.env.OPENAI_BASE_URL;
  
  console.log("OpenAI API Key present:", !!apiKey); // Debug log
  
  if (!apiKey) {
    throw new Error("API Key not found. Please check .env.local");
  }
  
  return new OpenAI({
    apiKey: apiKey,
    baseURL: baseURL,
    dangerouslyAllowBrowser: true // Required for client-side usage
  });
};

export const sendMessageToGemini = async (
  history: ChatMessage[],
  newMessage: string
): Promise<string> => {
  try {
    const openai = getAiClient();
    
    // Convert history to OpenAI format
    const messages = history.map(msg => ({
      role: msg.role === 'model' ? 'assistant' : 'user',
      content: msg.text
    })) as OpenAI.Chat.ChatCompletionMessageParam[];

    // Add the new message
    messages.push({ role: 'user', content: newMessage });

    // Add system instruction
    messages.unshift({
      role: 'system',
      content: "You are a knowledgeable music assistant named 'Melody'. You help users discover new music, understand genres, and provide fun facts about songs. Keep your responses concise, friendly, and music-focused."
    });

    const completion = await openai.chat.completions.create({
      messages: messages,
      model: "deepseek-ai/deepseek-v3.1", // Or whatever model the custom endpoint supports
    });

    return completion.choices[0]?.message?.content || "I couldn't process that request.";
  } catch (error) {
    console.error("OpenAI API Error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return `Sorry, I encountered an error: ${errorMessage}`;
  }
};