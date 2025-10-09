
const express = require('express');
const dotenv = require('dotenv');
const fetch = require('node-fetch');

dotenv.config();

const app = express();
const port = 3000;

app.use(express.json());
app.use(express.static('public')); // Serve static files

const API_KEY = process.env.GEMINI_API_KEY;

app.post('/api/chat', async (req, res) => {
    const { prompt } = req.body;

    if (!API_KEY) {
        return res.status(500).json({ error: 'API key not configured.' });
    }

    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${API_KEY}`;

    try {
        const payload = {
            contents: [{
                parts: [{ text: prompt }],
            }],
        };

        const apiRes = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (!apiRes.ok) {
            const errorBody = await apiRes.json();
            console.error('Gemini API Error:', errorBody);
            return res.status(apiRes.status).json({ error: errorBody.error.message });
        }

        const result = await apiRes.json();
        const text = result.candidates?.[0]?.content?.parts?.[0]?.text || "I'm sorry, I couldn't generate a response.";
        res.json({ response: text });

    } catch (error) {
        console.error('Failed to call Gemini API:', error);
        res.status(500).json({ error: 'An error occurred while contacting the AI model.' });
    }
});

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});
