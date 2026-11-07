export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { targetUrl, userKey } = req.body;
  
  // Prefer custom key entered by user; fallback to server environment variable
  const apiKey = (userKey && userKey.trim() !== "") ? userKey.trim() : process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    return res.status(400).json({ error: 'No API key provided. Please enter a valid OpenRouter key.' });
  }

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://sellerorscammer.com", 
        "X-Title": "Seller or Scammer"
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        messages: [
          { 
            role: "system", 
            content: "You are an e-commerce security expert. Provide a concise, highly structured trust audit for the requested store URL. You MUST start your response with a clear Verdict Badge (e.g., 🟢 **VERDICT: SAFE TO BUY**, 🟡 **VERDICT: PROCEED WITH CAUTION**, or 🔴 **VERDICT: HIGH RISK / LIKELY SCAM**) and a Trust Score out of 100. Follow with Markdown headings (###), bullet points (-), and highlight key risk factors or green flags in bold (**). Break your response into sections: Trust Assessment, Key Indicators, Recommendations, and Final Summary." 
          },
          { 
            role: "user", 
            content: `Audit this online store for legitimacy: ${targetUrl}` 
          }
        ]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      // Pass through exact OpenRouter error message
      const openRouterError = data.error?.message || data.message || JSON.stringify(data);
      return res.status(response.status).json({ error: `OpenRouter API Error (${response.status}): ${openRouterError}` });
    }

    if (data.choices && data.choices[0]) {
      return res.status(200).json({ summary: data.choices[0].message.content });
    } else {
      return res.status(400).json({ error: 'Unexpected response structure from OpenRouter.' });
    }

  } catch (err) {
    return res.status(500).json({ error: `Server error: ${err.message}` });
  }
}
