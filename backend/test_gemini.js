const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

async function test() {
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) return;
  const genAI = new GoogleGenerativeAI(apiKey);
  
  const models = [
    'gemini-3.7-flash',
    'gemini-flash-latest',
    'gemini-pro-latest',
    'gemini-2.5-pro',
    'gemini-2.5-flash-lite',
    'gemini-3.1-flash-lite'
  ];
  for (const m of models) {
    try {
      console.log(`Testing model: ${m}...`);
      const model = genAI.getGenerativeModel({ model: m });
      const result = await model.generateContent('Hi, one word reply.');
      console.log(`SUCCESS for ${m}:`, result.response.text().trim());
    } catch (err) {
      console.error(`FAILED for ${m}:`, err.message);
    }
  }
}

test();
