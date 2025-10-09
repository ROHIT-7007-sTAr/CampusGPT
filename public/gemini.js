// gemini.js
// This file centralizes calls to our backend server which then calls the Google Gemini API.

/**
 * Calls our backend API to get a response from the Gemini model.
 * @param {string} prompt The text prompt to send to the model.
 * @returns {Promise<string>} The text response from the model.
 */
async function callGemini(prompt) {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      const errorBody = await response.json();
      console.error("API Error:", errorBody);
      return `Error: ${errorBody.error}`;
    }

    const result = await response.json();
    return result.response;
  } catch (error) {
    console.error("Failed to call backend API:", error);
    return "An error occurred while contacting the server. Please check your network connection.";
  }
}