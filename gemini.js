// gemini.js
// This file centralizes calls to the Google Gemini API.

// IMPORTANT: Replace with your actual Gemini API key.
const API_KEY = "AIzaSyC7w9FVD7JqYsF9g1Oc-RwHTxNf1WoaA1I";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${API_KEY}`;

/**
 * Calls the Gemini API with a specific prompt.
 * @param {string} prompt The text prompt to send to the model.
 * @returns {Promise<string>} The text response from the model.
 */
async function callGemini(prompt) {
  try {
    const payload = {
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
    };

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorBody = await response.json();
      console.error("Gemini API Error:", errorBody);
      return `Error: ${errorBody.error.message}`;
    }

    const result = await response.json();
    if (result.candidates && result.candidates.length > 0 && result.candidates[0].content.parts[0].text) {
      return result.candidates[0].content.parts[0].text;
    } else {
      // Handle cases where response might be blocked or empty
      return "I'm sorry, I couldn't generate a response for that. It might be due to safety settings.";
    }

  } catch (error) {
    console.error("Failed to call Gemini API:", error);
    return "An error occurred while contacting the AI model. Please check your API key and network connection.";
  }
}
