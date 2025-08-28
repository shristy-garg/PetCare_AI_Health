'use strict';

// Minimal Smart Search Assistant (Act -> Observe -> Think)
// Usage:
//   npm i @google/generative-ai dotenv
//   set GEMINI_API_KEY=your_key
//   set TAVILY_API_KEY=your_key
//   node index.js "healthcare for my shitzo breed dog?"
require('dotenv').config();

// Fix: import from correct package
const { GoogleGenerativeAI } = require('@google/generative-ai');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const TAVILY_API_KEY = process.env.TAVILY_API_KEY;



// Step 1: The User's Question
const originalQuestion = process.argv.slice(2).join(' ').trim();
if (!originalQuestion) {
  console.error('Please provide a question. Example: node index.js "healthcare for my shitzo breed dog?"');
  process.exit(1);
}

// Helper: call Tavily Search (Action)
async function searchTavily(query) {
  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: TAVILY_API_KEY,
      query,
      search_depth: 'basic',
      max_results: 5
    })
  });

  if (!res.ok) throw new Error(`Tavily search failed: ${res.status} ${res.statusText}`);

  const data = await res.json();

  return Array.isArray(data.results) ? data.results : [];
}

// Helper: call Gemini (Thought)
async function askGemini(prompt) {
  // Create a new instance of the Google Generative AI client
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  // Get the model
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  // Generate content
  const result = await model.generateContent(prompt);
  // Get the response text
  const text = result.response.text().trim();
  if (!text) throw new Error('Gemini returned no content.');
  return text;
}

// Main: Act -> Observe -> Think -> Answer
(async () => {
  try {
    // Step 2: The Action (search)
    const results = await searchTavily(originalQuestion);
    console.log(results)
    // Step 3: The Observation (format results)
    const searchResults = results.map((r, i) => {
      const summary = (r.content || '').slice(0, 500);
      return `${i + 1}. ${r.title || 'Untitled'}\n${r.url}\n${summary}`;
    }).join('\n\n');

    // Step 4: The Thought (compose prompt for LLM)
    const prompt = `
Based on the following search results, please answer the user's original question.

Search Results:
${searchResults}

User's Question:
${originalQuestion}

Answer:
`.trim();

    // Step 5: Print the final, informed answer
    console.log("prompt starts here: " , prompt)
    const answer = await askGemini(prompt);
    console.log(answer);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
