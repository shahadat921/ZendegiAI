// Vercel Serverless Function — proxies chat requests to Google Gemini API (FREE tier).
//
// SETUP (one-time, on Vercel):
// 1. Go to https://aistudio.google.com/app/apikey
// 2. Create a free API key (no credit card needed)
// 3. Vercel project → Settings → Environment Variables
//    Name: GEMINI_API_KEY  |  Value: your key
// 4. Redeploy

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: 'Server is missing GEMINI_API_KEY. Add it in Vercel Project Settings → Environment Variables, then redeploy.',
    });
  }

  try {
    const { system, messages, max_tokens } = req.body || {};
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages array is required' });
    }

    // Convert Anthropic-style messages to Gemini format
    const geminiMessages = messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const body = {
      system_instruction: system ? { parts: [{ text: system }] } : undefined,
      contents: geminiMessages,
      generationConfig: {
        maxOutputTokens: max_tokens || 1000,
        temperature: 0.7,
      },
    };

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    );

    const data = await geminiRes.json();

    if (!geminiRes.ok) {
      return res.status(geminiRes.status).json({
        error: data?.error?.message || 'Gemini API error',
      });
    }

    // Convert Gemini response to Anthropic-style format (so index.html needs no changes)
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return res.status(200).json({
      content: [{ type: 'text', text }],
    });

  } catch (err) {
    return res.status(500).json({ error: err.message || 'Unknown server error' });
  }
}
