// Vercel Serverless Function — proxies chat requests to the Anthropic API.
// Keeps the API key on the server, fixes CORS, and is what index.html now calls
// instead of hitting api.anthropic.com directly from the browser.
//
// SETUP (one-time, on Vercel):
// 1. Go to your project on vercel.com -> Settings -> Environment Variables.
// 2. Add a variable named ANTHROPIC_API_KEY with your key from
//    https://console.anthropic.com/settings/keys
// 3. Redeploy the project (or just push this file) so the variable is picked up.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: 'Server is missing ANTHROPIC_API_KEY. Add it in Vercel Project Settings → Environment Variables, then redeploy.',
    });
  }

  try {
    const { system, messages, max_tokens } = req.body || {};
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages array is required' });
    }

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: max_tokens || 1000,
        system: system || undefined,
        messages,
      }),
    });

    const data = await anthropicRes.json();

    if (!anthropicRes.ok) {
      return res.status(anthropicRes.status).json({ error: data?.error?.message || 'Anthropic API error' });
    }

    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Unknown server error' });
  }
}
