export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { targetUrl, userKey } = req.body;
  const apiKey = (userKey && userKey.trim() !== "") ? userKey.trim() : process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    return res.status(400).json({ error: 'No API key provided.' });
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
        response_format: { type: "json_object" },
        messages: [
          { 
            role: "system", 
            content: `You are an e-commerce security expert. Analyze the requested store URL and return a valid JSON object strictly matching this schema:
            {
              "trustScore": number (0-100),
              "trustRating": "Trustworthy Store" | "Moderate Risk" | "High Risk / Scammer",
              "executiveSummary": "Detailed paragraph summarizing the security posture, platform, SSL, and reputation.",
              "categories": [
                {
                  "categoryName": "Domain & Infrastructure",
                  "categoryScore": number (0-100),
                  "checkpoints": [
                    { "name": "SSL Encryption & HTTPS", "status": "PASS" | "WARN" | "FAIL", "detail": "Description..." },
                    { "name": "Domain Registration Age", "status": "PASS" | "WARN" | "FAIL", "detail": "Description..." },
                    { "name": "WHOIS Ownership Privacy", "status": "PASS" | "WARN" | "FAIL", "detail": "Description..." }
                  ]
                },
                {
                  "categoryName": "Business Identity & Location",
                  "categoryScore": number (0-100),
                  "checkpoints": [
                    { "name": "Physical Address Verification", "status": "PASS" | "WARN" | "FAIL", "detail": "Description..." },
                    { "name": "Support Phone & Email", "status": "PASS" | "WARN" | "FAIL", "detail": "Description..." },
                    { "name": "Social Media Presence", "status": "PASS" | "WARN" | "FAIL", "detail": "Description..." }
                  ]
                },
                {
                  "categoryName": "Customer Feedback & Complaints",
                  "categoryScore": number (0-100),
                  "checkpoints": [
                    { "name": "Scam Complaint Reports", "status": "PASS" | "WARN" | "FAIL", "detail": "Description..." },
                    { "name": "BBB & Trustpilot Reviews", "status": "PASS" | "WARN" | "FAIL", "detail": "Description..." }
                  ]
                }
              ]
            }` 
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
      const openRouterError = data.error?.message || data.message || JSON.stringify(data);
      return res.status(response.status).json({ error: `OpenRouter Error: ${openRouterError}` });
    }

    if (data.choices && data.choices[0]) {
      const parsedData = JSON.parse(data.choices[0].message.content);
      return res.status(200).json(parsedData);
    } else {
      return res.status(400).json({ error: 'Invalid response from AI provider.' });
    }

  } catch (err) {
    return res.status(500).json({ error: `Server error: ${err.message}` });
  }
}
