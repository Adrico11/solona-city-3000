module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const { city } = req.query;
  if (!city) return res.status(400).json({ error: 'city required' });

  const SYSTEM = `You are a witty French travel guide. When asked about a city, respond ONLY with a valid JSON object (no markdown, no extra text) with exactly these two keys:
- attraction: one sentence describing the single most iconic tourist attraction
- funFact: one surprising, delightful fun fact about the city that most people don't know

Keep each value under 80 words. Be vivid and engaging.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key':        process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-beta':   'prompt-caching-2024-07-31',
        'content-type':     'application/json',
      },
      body: JSON.stringify({
        model:      'claude-sonnet-4-20250514',
        max_tokens: 500,
        system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
        messages: [{ role: 'user', content: `City: ${city}` }],
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      return res.status(502).json({ error: 'upstream_error', detail });
    }

    const data = await response.json();
    const raw  = data.content[0].text.trim();

    // Strip accidental markdown fences
    const clean = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(clean);
    } catch {
      return res.status(500).json({ error: 'parse_failed', raw });
    }

    return res.status(200).json(parsed);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
