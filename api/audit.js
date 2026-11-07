export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { targetUrl, userKey } = req.body;
  
  // Use user's custom key if provided, otherwise fall back to your Vercel Environment Variable master key
  const apiKey = userKey || process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured on server.' });
  }

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        messages: [
          { 
            role: "system", 
            content: "You are an e-commerce security expert. Provide a concise, highly structured trust audit for the requested store URL. Use clear Markdown headings (###), bullet points (-), and highlight key risk factors or green flags in bold (**). Break your response into logical sections such as Trust Assessment, Key Indicators, and Recommendation." 
          },
          { 
            role: "user", 
            content: `Audit this online store for legitimacy: ${targetUrl}` 
          }
        ]
      })
    });

    const data = await response.json();
    
    if (data.choices && data.choices[0]) {
      return res.status(200).json({ summary: data.choices[0].message.content });
    } else {
      return res.status(400).json({ error: 'Failed to generate audit from AI provider.' });
    }

  } catch (err) {
    return res.status(500).json({ error: 'Server error processing audit request.' });
  }
}
