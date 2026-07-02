/**
 * Gemini AI client — calls Google Gemini when GEMINI_API_KEY is set,
 * falls back to deterministic heuristics so the app is always functional.
 */
import { GoogleGenerativeAI } from "@google/generative-ai";
import { logger } from "./logger";

const API_KEY = process.env.GEMINI_API_KEY ?? "";
const HAS_KEY = API_KEY.length > 8;

let _genAI: GoogleGenerativeAI | null = null;
function genAI(): GoogleGenerativeAI {
  if (!_genAI) _genAI = new GoogleGenerativeAI(API_KEY);
  return _genAI;
}

const MODEL = "gemini-2.5-flash";

export async function callGemini(
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 512,
): Promise<string> {
  if (!HAS_KEY) {
    throw new Error("NO_KEY");
  }
  try {
    const model = genAI().getGenerativeModel({
      model: MODEL,
      systemInstruction: systemPrompt,
      generationConfig: { maxOutputTokens: maxTokens, temperature: 0.3 },
    });
    const result = await model.generateContent(userPrompt);
    return result.response.text().trim();
  } catch (err: any) {
    logger.error({ err }, "[Gemini] call failed");
    throw err;
  }
}

export const geminiAvailable = HAS_KEY;
