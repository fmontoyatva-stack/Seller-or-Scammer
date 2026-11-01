import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';

export default function App() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [apiKey, setApiKey] = useState('');
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [tempApiKey, setTempApiKey] = useState('');
  const [showKeyText, setShowKeyText] = useState(false);

  useEffect(() => {
    // Check local storage or environment variables
    const savedKey = localStorage.getItem('gemini_api_key');
    // Vercel injected env or fallback
    const envKey = typeof __GEMINI_API_KEY__ !== 'undefined' ? __GEMINI_API_KEY__ : (import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY || '');
    
    if (savedKey) {
      setApiKey(savedKey);
    } else if (envKey) {
      setApiKey(envKey);
    } else {
      setShowApiKeyModal(true);
    }
  }, []);

  const handleSaveApiKey = () => {
    if (!tempApiKey.trim()) return;
    localStorage.setItem('gemini_api_key', tempApiKey.trim());
    setApiKey(tempApiKey.trim());
    setShowApiKeyModal(false);
    setTempApiKey('');
  };

  const runAudit = async (e) => {
    e.preventDefault();
    if (!url.trim()) return;
    
    const activeKey = apiKey || localStorage.getItem('gemini_api_key');
    if (!activeKey) {
      setShowApiKeyModal(true);
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const ai = new GoogleGenAI({ apiKey: activeKey });
      const prompt = `Perform a comprehensive store audit for e-commerce website: ${url}. Analyze its trustworthiness, legitimacy, contact details, return policies, trust signals, and check for any known scam reports or red flags. Return the analysis clearly formatted.`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
        }
      });

      setResult(response.text);
    } catch (err) {
      console.error(err);
      setError(err.message || 'An error occurred during the audit.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', color: '#0f172a', fontFamily: 'system-ui, sans-serif', padding: '2rem 1rem' }}>
      <header style={{ maxWidth: '800px', margin: '0 auto 2rem auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0f766e', margin: 0 }}>🛡️ Seller or Scammer?</h1>
        <button 
          onClick={() => setShowApiKeyModal(true)}
          style={{ background: '#0f766e', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '0.375rem', cursor: 'pointer', fontWeight: '600', fontSize: '0.875rem' }}
        >
          API Key Setup
        </button>
      </header>

      <main style={{ maxWidth: '800px', margin: '0 auto', background: 'white', padding: '2rem', borderRadius: '0.75rem', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
        <form onSubmit={runAudit} style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <input 
            type="text" 
            placeholder="Enter online store URL (e.g., mystore.com)" 
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            style={{ flex: 1, padding: '0.75rem 1rem', border: '1px solid #cbd5e1', borderRadius: '0.5rem', fontSize: '1rem' }}
          />
          <button 
            type="submit" 
            disabled={loading}
            style={{ background: '#0f766e', color: 'white', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '0.5rem', fontWeight: '600', cursor: 'pointer' }}
          >
            {loading ? 'Auditing...' : 'Check Store'}
          </button>
        </form>

        {error && (
          <div style={{ background: '#fee2e2', border: '1px solid #f87171', color: '#991b1b', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.5rem' }}>
            <strong>Error:</strong> {error}
          </div>
        )}

        {result && (
          <div style={{ background: '#f1f5f9', padding: '1.5rem', borderRadius: '0.5rem', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
            {result}
          </div>
        )}
      </main>

      {showApiKeyModal && (
        <div style={{ position: 'fixed', inset: '0', background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem' }}>
          <div style={{ background: 'white', padding: '2rem', borderRadius: '0.75rem', width: '100%', maxWidth: '450px', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.5rem' }}>Gemini API Key Setup</h2>
            <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1.25rem' }}>Enter your Gemini API key to enable live web search verification.</p>
            
            <div style={{ position: 'relative', marginBottom: '1.25rem' }}>
              <input 
                type={showKeyText ? "text" : "password"}
                placeholder="Paste API Key (AIzaSy...)" 
                value={tempApiKey}
                onChange={(e) => setTempApiKey(e.target.value)}
                style={{ width: '100%', padding: '0.75rem 2.5rem 0.75rem 1rem', border: '1px solid #cbd5e1', borderRadius: '0.5rem', boxSizing: 'border-box' }}
              />
              <button
                type="button"
                onClick={() => setShowKeyText(!showKeyText)}
                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                {showKeyText ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button 
                onClick={() => setShowApiKeyModal(false)}
                style={{ background: '#e2e8f0', border: 'none', padding: '0.5rem 1rem', borderRadius: '0.375rem', cursor: 'pointer', fontWeight: '600' }}
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveApiKey}
                style={{ background: '#0f766e', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '0.375rem', cursor: 'pointer', fontWeight: '600' }}
              >
                Save Key
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
