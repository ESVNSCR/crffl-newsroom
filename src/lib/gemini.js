import { GoogleGenAI } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn('Warning: GEMINI_API_KEY is not defined in environment variables.');
}

export const ai = new GoogleGenAI({ apiKey: apiKey || '' });
export const DEFAULT_MODEL = 'gemini-3.6-flash';
