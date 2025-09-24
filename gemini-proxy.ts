import { GoogleGenAI, Type } from "@google/genai";

// This function will run on Netlify's servers, not in the browser.
// The API key is stored securely as an environment variable on Netlify.
// Fix: Use process.env.API_KEY as per the coding guidelines.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

// Fix: Use ES module `export const` syntax instead of CommonJS `exports.handler` to resolve 'Cannot find name 'exports'' error.
export const handler = async function(event: any) {
  // Allow requests from any origin (CORS)
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Handle preflight requests for CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers,
      body: '',
    };
  }

  // Ensure it's a POST request
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed', headers };
  }

  try {
    const { history, contents, systemInstruction, schema } = JSON.parse(event.body);

    const modelParams: any = {
        model: "gemini-2.5-flash",
        config: {
            responseMimeType: "application/json",
            responseSchema: schema,
        }
    };
    
    if (systemInstruction) {
        modelParams.config.systemInstruction = systemInstruction;
    }

    if (history) { // For chat-like interactions
        modelParams.contents = history;
    } else if (contents) { // For single-turn interactions
        modelParams.contents = contents;
    } else {
        return { statusCode: 400, body: JSON.stringify({ message: "Request body must contain 'history' or 'contents'." }), headers };
    }

    const response = await ai.models.generateContent(modelParams);

    // The response from the Gemini API might be a string that needs parsing,
    // or it might already be an object. The .text property is the most reliable way.
    const responseText = response.text.trim();
    
    // Attempt to parse the text as JSON, as the schema requests it.
    const jsonData = JSON.parse(responseText);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(jsonData),
    };

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ message: "An internal error occurred while contacting the AI service.", details: error instanceof Error ? error.message : String(error) }),
    };
  }
};
