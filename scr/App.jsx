import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Globe,
  Search,
  CheckCircle2,
  XCircle,
  Sparkles,
  Printer,
  ChevronRight,
  RefreshCw,
  Building2,
  Lock,
  FileText,
  MessageSquare,
  DollarSign,
  ArrowRight,
  ExternalLink,
  Info,
  BadgeCheck,
  Key,
  X,
  Check,
  AlertCircle
} from 'lucide-react';

// Official Gemini Flash model for web search grounding & fast analysis
const GEMINI_MODEL = 'gemini-3-flash-preview';

export default function App() {
  const [url, setUrl] = useState('');
  const [apiKey, setApiKey] = useState(() => {
    return localStorage.getItem('storetrust_gemini_key') || '';
  });
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [tempApiKey, setTempApiKey] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  
  const [activeTab, setActiveTab] = useState('input'); // 'input', 'checklist', 'report'
  const [activeCategoryIndex, setActiveCategoryIndex] = useState(0);

  // Store Reliability State
  const [storeInfo, setStoreInfo] = useState(null);
  const [checklist, setChecklist] = useState({});
  const [summaryReport, setSummaryReport] = useState(null);

  // Attempt to fetch API Key from process environment if not in localStorage
  useEffect(() => {
    const savedKey = localStorage.getItem('storetrust_gemini_key');
    if (!savedKey) {
      try {
        if (typeof process !== 'undefined' && process.env && process.env.VITE_GEMINI_API_KEY) {
          setApiKey(process.env.VITE_GEMINI_API_KEY);
        }
      } catch (e) {
        // Environment key not found
      }
    }
  }, []);

  const handleSaveApiKey = (keyToSave) => {
    const cleanedKey = keyToSave.trim();
    setApiKey(cleanedKey);
    localStorage.setItem('storetrust_gemini_key', cleanedKey);
    setShowKeyModal(false);
    setErrorMessage('');
  };

  // Trust Checkpoint Definitions across 5 Core Reliability Categories
  const trustCategories = [
    {
      id: 'business_identity',
      category: 'Business Identity & Transparency',
      icon: Building2,
      description: 'Physical street address, registered corporate identity, direct phone, and official domain email.',
      checks: [
        {
          id: 'biz_physical_address',
          label: 'Physical Address Provided',
          prompt: 'Is a verifiable physical street address or headquarters location listed on the website?',
          aiDefault: 'maybe'
        },
        {
          id: 'biz_official_email',
          label: 'Professional Domain Email',
          prompt: 'Does the store use a domain-matched support email rather than generic @gmail.com or @outlook.com?',
          aiDefault: 'maybe'
        },
        {
          id: 'biz_phone_contact',
          label: 'Direct Phone Support',
          prompt: 'Is a functional telephone number or clear customer support hotline displayed?',
          aiDefault: 'maybe'
        }
      ]
    },
    {
      id: 'domain_security',
      category: 'Domain & Technical Security',
      icon: Lock,
      description: 'SSL encryption, domain registration age, checkout security, and technical footprint.',
      checks: [
        {
          id: 'sec_ssl_encryption',
          label: 'Valid HTTPS Connection',
          prompt: 'Is the website properly secured with an active HTTPS connection and SSL certificate?',
          aiDefault: 'maybe'
        },
        {
          id: 'sec_domain_age',
          label: 'Established Domain History',
          prompt: 'Has this domain been registered for more than 6-12 months according to WHOIS records?',
          aiDefault: 'maybe'
        },
        {
          id: 'sec_checkout_badges',
          label: 'Authentic Security Badges',
          prompt: 'Are authentic payment badges and SSL trust seals present at checkout?',
          aiDefault: 'maybe'
        }
      ]
    },
    {
      id: 'policies_protection',
      category: 'Policies & Consumer Terms',
      icon: FileText,
      description: 'Clear return policies, explicit fulfillment timelines, privacy disclosures, and legal terms.',
      checks: [
        {
          id: 'pol_refund_clarity',
          label: 'Clear Return & Refund Terms',
          prompt: 'Does the site provide explicit return instructions, return address, and refund windows?',
          aiDefault: 'maybe'
        },
        {
          id: 'pol_shipping_timeline',
          label: 'Defined Delivery Timelines',
          prompt: 'Are realistic shipping delivery estimates and handling times explicitly stated?',
          aiDefault: 'maybe'
        },
        {
          id: 'pol_privacy_terms',
          label: 'Terms of Service & Privacy Policy',
          prompt: 'Are complete Privacy Policy and Terms of Service pages accessible in the website footer?',
          aiDefault: 'maybe'
        }
      ]
    },
    {
      id: 'reputation_reviews',
      category: 'Customer Reviews & Web Reputation',
      icon: MessageSquare,
      description: 'Independent review footprint on Trustpilot, Reddit, BBB, and absence of scam warnings.',
      checks: [
        {
          id: 'rep_external_reviews',
          label: 'Independent Review Footprint',
          prompt: 'Are there authentic customer reviews on third-party sites like Trustpilot, Google, or Reddit?',
          aiDefault: 'maybe'
        },
        {
          id: 'rep_no_scam_reports',
          label: 'Absence of Fraud Complaints',
          prompt: 'Is the store free of non-delivery, fake item, or unauthorized credit card charge complaints?',
          aiDefault: 'maybe'
        },
        {
          id: 'rep_genuine_reviews',
          label: 'Authentic On-Site Reviews',
          prompt: 'Do on-site product reviews look genuine rather than auto-generated or fake copy/pastes?',
          aiDefault: 'maybe'
        }
      ]
    },
    {
      id: 'pricing_payment',
      category: 'Pricing & Payment Safety',
      icon: DollarSign,
      description: 'Plausible pricing realism, standard payment options (Cards, PayPal), and no forced crypto/wire demands.',
      checks: [
        {
          id: 'pay_trusted_gateways',
          label: 'Buyer-Protected Payments',
          prompt: 'Does the store accept major buyer-protected options like Credit Cards, PayPal, or Apple Pay?',
          aiDefault: 'maybe'
        },
        {
          id: 'pay_no_crypto_only',
          label: 'No Untraceable-Only Demands',
          prompt: 'Is the site free of demands for un-refundable wire transfers, Zelle, or Crypto-only payments?',
          aiDefault: 'maybe'
        },
        {
          id: 'pay_realistic_discounts',
          label: 'Plausible Product Pricing',
          prompt: 'Are product prices realistic rather than suspicious "90% off luxury items site-wide" discount traps?',
          aiDefault: 'maybe'
        }
      ]
    }
  ];

  // API Fetch helper with Gemini Web Search Grounding
  const callGeminiWithSearch = async (prompt, systemInstruction = '') => {
    const activeKey = apiKey || (typeof process !== 'undefined' ? process.env?.VITE_GEMINI_API_KEY : '') || '';

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${activeKey}`;

    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      tools: [{ google_search: {} }]
    };

    if (systemInstruction) {
      payload.systemInstruction = { parts: [{ text: systemInstruction }] };
    }

    let retries = 2;
    let delay = 1000;

    for (let i = 0; i <= retries; i++) {
      try {
        const res = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData?.error?.message || `HTTP Error ${res.status}`);
        }

        const data = await res.json();
        const candidate = data.candidates?.[0];
        
        if (candidate?.content?.parts) {
          const fullText = candidate.content.parts
            .filter(p => p.text)
            .map(p => p.text)
            .join('\n');

          if (fullText) return fullText;
        }
        
        throw new Error('No content returned from Gemini model.');
      } catch (err) {
        if (i === retries) throw err;
        await new Promise((r) => setTimeout(r, delay));
        delay *= 2;
      }
    }
  };

  // Perform Store Reliability Audit
  const handleAnalyzeStore = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!url.trim()) return;

    const currentKey = apiKey || (typeof process !== 'undefined' ? process.env?.VITE_GEMINI_API_KEY : '') || '';
    if (!currentKey) {
      setTempApiKey('');
      setShowKeyModal(true);
      return;
    }

    let targetUrl = url.trim();
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = 'https://' + targetUrl;
      setUrl(targetUrl);
    }

    setLoading(true);
    setLoadingStep('Searching live web records, Trustpilot ratings, scam forums, and WHOIS domain age...');

    try {
      const prompt = `Investigate the online store domain at: ${targetUrl}.

Task:
1. Search Google for real reputation data on "${targetUrl}", including Trustpilot ratings, Reddit discussions (r/Scams, r/ecommerce), BBB filings, and ScamAdviser reports.
2. Check if this store is a known legitimate brand (e.g., Nike, Apple, Amazon), a standard real business, a brand-new dropshipping trap, or a known fraudulent scam site.
3. Evaluate each of these 15 exact checkpoint IDs as "yes", "no", or "maybe":
   - biz_physical_address
   - biz_official_email
   - biz_phone_contact
   - sec_ssl_encryption
   - sec_domain_age
   - sec_checkout_badges
   - pol_refund_clarity
   - pol_shipping_timeline
   - pol_privacy_terms
   - rep_external_reviews
   - rep_no_scam_reports
   - rep_genuine_reviews
   - pay_trusted_gateways
   - pay_no_crypto_only
   - pay_realistic_discounts

SCORING & SAFETY RULES:
- If the domain is a known highly trusted brand (e.g. amazon.com, apple.com, target.com), overallTrustScore MUST be between 90 and 100, and riskLevel MUST be "Safe".
- If there are widespread scam complaints, non-delivery reports, or fake "90% off" liquidation prices, riskLevel MUST be "High Risk" and overallTrustScore MUST be between 0 and 40.
- Differentiate clearly! Do NOT default all stores to a mid-range score like 70.

Return ONLY a single valid JSON object formatted exactly like this:
\`\`\`json
{
  "storeName": "Name of Store",
  "domain": "example.com",
  "businessType": "Major Brand / Standard Retailer / Suspected Scam",
  "overallTrustScore": 85,
  "riskLevel": "Safe",
  "executiveSummary": "Summary of audit findings...",
  "redFlags": ["Flag 1", "Flag 2"],
  "greenLights": ["Light 1", "Light 2"],
  "shoppingAdvice": "Advice for shoppers...",
  "checkEvaluations": {
    "biz_physical_address": "yes",
    "biz_official_email": "yes",
    "biz_phone_contact": "yes",
    "sec_ssl_encryption": "yes",
    "sec_domain_age": "yes",
    "sec_checkout_badges": "yes",
    "pol_refund_clarity": "yes",
    "pol_shipping_timeline": "yes",
    "pol_privacy_terms": "yes",
    "rep_external_reviews": "yes",
    "rep_no_scam_reports": "yes",
    "rep_genuine_reviews": "yes",
    "pay_trusted_gateways": "yes",
    "pay_no_crypto_only": "yes",
    "pay_realistic_discounts": "yes"
  },
  "checkReasons": {
    "biz_physical_address": "Detailed reasoning...",
    "biz_official_email": "Detailed reasoning...",
    "biz_phone_contact": "Detailed reasoning...",
    "sec_ssl_encryption": "Detailed reasoning...",
    "sec_domain_age": "Detailed reasoning...",
    "sec_checkout_badges": "Detailed reasoning...",
    "pol_refund_clarity": "Detailed reasoning...",
    "pol_shipping_timeline": "Detailed reasoning...",
    "pol_privacy_terms": "Detailed reasoning...",
    "rep_external_reviews": "Detailed reasoning...",
    "rep_no_scam_reports": "Detailed reasoning...",
    "rep_genuine_reviews": "Detailed reasoning...",
    "pay_trusted_gateways": "Detailed reasoning...",
    "pay_no_crypto_only": "Detailed reasoning...",
    "pay_realistic_discounts": "Detailed reasoning..."
  }
}
\`\`\``;

      const systemPrompt = 'You are a strict, objective e-commerce fraud investigator and store legitimacy verifier.';
      const rawText = await callGeminiWithSearch(prompt, systemPrompt);

      // Extract JSON payload from response
      let res;
      try {
        const jsonMatch = rawText.match(/```json\s*([\s\S]*?)\s*```/) || rawText.match(/\{[\s\S]*\}/);
        const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : rawText;
        res = JSON.parse(jsonStr);
      } catch (parseErr) {
        console.error('JSON parsing failed:', rawText);
        throw new Error('Failed to parse audit results from AI search engine.');
      }

      const domainHost = new URL(targetUrl).hostname.replace('www.', '');
      setStoreInfo({
        name: res.storeName || domainHost,
        url: targetUrl,
        businessType: res.businessType || 'E-Commerce Store',
        riskLevel: res.riskLevel || (res.overallTrustScore < 50 ? 'High Risk' : res.overallTrustScore < 80 ? 'Proceed with Caution' : 'Safe')
      });

      // Map Checkpoints dynamically from response
      const initialChecklist = {};
      trustCategories.forEach((cat) => {
        cat.checks.forEach((chk) => {
          const evalVal = res.checkEvaluations?.[chk.id];
          initialChecklist[chk.id] = {
            value: ['yes', 'no', 'maybe'].includes(evalVal) ? evalVal : 'maybe',
            reason: res.checkReasons?.[chk.id] || 'No specific data found for this checkpoint.'
          };
        });
      });

      setChecklist(initialChecklist);

      // Recalculate dynamic score based on explicit checkpoint results
      let totalPoints = 0;
      let totalChecks = 0;
      Object.keys(initialChecklist).forEach((key) => {
        totalChecks++;
        if (initialChecklist[key].value === 'yes') totalPoints += 100;
        else if (initialChecklist[key].value === 'maybe') totalPoints += 45;
        else totalPoints += 0;
      });

      let calculatedScore = Math.round(totalPoints / totalChecks);
      if (res.overallTrustScore !== undefined && typeof res.overallTrustScore === 'number') {
        calculatedScore = Math.round((calculatedScore + res.overallTrustScore) / 2);
      }

      let computedRisk = 'Safe';
      if (calculatedScore < 50 || res.riskLevel === 'High Risk') {
        computedRisk = 'High Risk';
        calculatedScore = Math.min(calculatedScore, 49);
      } else if (calculatedScore < 80 || res.riskLevel === 'Proceed with Caution') {
        computedRisk = 'Proceed with Caution';
      }

      setSummaryReport({
        overallTrustScore: Math.min(100, Math.max(0, calculatedScore)),
        riskLevel: computedRisk,
        executiveSummary: res.executiveSummary || `Audit completed for ${targetUrl}.`,
        redFlags: res.redFlags || [],
        greenLights: res.greenLights || [],
        shoppingAdvice: res.shoppingAdvice || 'Always checkout using payment methods with buyer protection (Credit Card or PayPal).'
      });

      setActiveTab('checklist');
    } catch (err) {
      console.error('Audit Fetch Error:', err);
      
      if (err.message && (err.message.includes('API key') || err.message.includes('403') || err.message.includes('401'))) {
        setErrorMessage('Your Gemini API key appears invalid or expired. Please check your key settings.');
        setShowKeyModal(true);
      } else {
        setErrorMessage(err.message || 'Error conducting store audit. Please verify the URL and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCheckChange = (checkId, value) => {
    setChecklist((prev) => {
      const updated = {
        ...prev,
        [checkId]: { ...prev[checkId], value }
      };

      // Recalculate score on manual user edits
      let total = 0;
      let count = 0;
      Object.keys(updated).forEach((key) => {
        count++;
        if (updated[key].value === 'yes') total += 100;
        else if (updated[key].value === 'maybe') total += 45;
        else total += 0;
      });

      const newScore = Math.round(total / count);
      let newRisk = 'Safe';
      if (newScore < 50) newRisk = 'High Risk';
      else if (newScore < 80) newRisk = 'Proceed with Caution';

      setSummaryReport((prevRep) => ({
        ...prevRep,
        overallTrustScore: newScore,
        riskLevel: newRisk
      }));

      return updated;
    });
  };

  const getStatusBadge = (riskLevel) => {
    if (riskLevel === 'High Risk') {
      return {
        bg: 'bg-rose-50 border-rose-200 text-rose-800',
        icon: ShieldAlert,
        color: 'text-rose-600',
        label: 'High Risk / Potential Scam'
      };
    }
    if (riskLevel === 'Proceed with Caution') {
      return {
        bg: 'bg-amber-50 border-amber-200 text-amber-800',
        icon: AlertTriangle,
        color: 'text-amber-600',
        label: 'Proceed with Caution'
      };
    }
    return {
      bg: 'bg-emerald-50 border-emerald-200 text-emerald-800',
      icon: ShieldCheck,
      color: 'text-emerald-600',
      label: 'Verified Safe / Reliable'
    };
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans antialiased selection:bg-emerald-500 selection:text-white">
      {/* Top Header Navigation */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-tr from-emerald-600 to-teal-600 rounded-xl text-white shadow-md shadow-emerald-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-slate-900 text-lg tracking-tight">StoreTrust AI</span>
              <span className="hidden sm:inline-block ml-2 text-xs font-semibold px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
                Reliability Audit Engine
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {storeInfo && (
              <div className="hidden md:flex items-center space-x-1 bg-slate-100 p-1 rounded-xl text-xs font-medium mr-2">
                <button
                  onClick={() => setActiveTab('input')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    activeTab === 'input' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Search
                </button>
                <button
                  onClick={() => setActiveTab('checklist')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    activeTab === 'checklist' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Checkpoints
                </button>
                <button
                  onClick={() => setActiveTab('report')}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center space-x-1 ${
                    activeTab === 'report' ? 'bg-white text-emerald-700 font-semibold shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <BadgeCheck className="w-3.5 h-3.5" />
                  <span>Verdict</span>
                </button>
              </div>
            )}

            {/* API Key Settings Button */}
            <button
              onClick={() => {
                setTempApiKey(apiKey);
                setShowKeyModal(true);
              }}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl flex items-center space-x-1.5 transition-all border border-slate-200"
              title="Configure Gemini API Key"
            >
              <Key className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">API Key</span>
              {apiKey && <span className="w-2 h-2 rounded-full bg-emerald-500"></span>}
            </button>
          </div>
        </div>
      </header>

      {/* API KEY SETTINGS MODAL */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                  <Key className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 text-base">Gemini API Key Setup</h3>
              </div>
              <button
                onClick={() => setShowKeyModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Enter your Gemini API key to enable live web search grounding across Trustpilot, scam forums, and WHOIS domain records.
            </p>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Your Gemini API Key</label>
              <input
                type="password"
                value={tempApiKey}
                onChange={(e) => setTempApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-emerald-600 hover:underline flex items-center space-x-1 font-medium"
              >
                <span>Get Free API Key</span>
                <ExternalLink className="w-3 h-3" />
              </a>

              <div className="flex space-x-2">
                <button
                  onClick={() => setShowKeyModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleSaveApiKey(tempApiKey)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-md shadow-emerald-600/20"
                >
                  Save Key
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Application Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-xs text-rose-800">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage('')}
              className="text-rose-600 hover:text-rose-800 font-bold ml-2"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* TAB 1: SEARCH URL INPUT */}
        {activeTab === 'input' && (
          <div className="max-w-3xl mx-auto mt-4 sm:mt-8">
            <div className="text-center space-y-4 mb-8">
              <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-semibold">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>E-Commerce Scam & Reliability Verifier</span>
              </div>
              <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
                Seller or Scammer?
              </h1>
              <p className="text-slate-600 text-base sm:text-lg max-w-2xl mx-auto">
                Enter any online store URL to verify business registration, return policies, SSL signals, domain history, and real customer scam reports.
              </p>
            </div>

            {/* Input Search Form */}
            <form onSubmit={handleAnalyzeStore} className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 space-y-4">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                  <Globe className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example-store.com"
                  className="w-full pl-11 pr-36 py-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-base transition-all"
                  required
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="absolute right-2 top-2 bottom-2 px-5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-md shadow-emerald-600/20 flex items-center space-x-2 transition-all disabled:opacity-70"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span className="hidden sm:inline">Auditing...</span>
                    </>
                  ) : (
                    <>
                      <span>Check Store</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 pt-2 px-1 gap-2">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Live Web Search Grounding
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Checks Trustpilot & Scam Forums
                </span>
              </div>
            </form>

            {/* API Key Prompt Notice */}
            {!apiKey && (
              <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-amber-100 text-amber-700 rounded-xl">
                    <Key className="w-5 h-5" />
                  </div>
                  <div className="text-xs">
                    <p className="font-bold text-amber-900">Gemini API Key Needed</p>
                    <p className="text-amber-700">Set your API key to activate live internet search grounding.</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowKeyModal(true)}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-xl whitespace-nowrap"
                >
                  Set API Key
                </button>
              </div>
            )}

            {/* Loading Indicator Card */}
            {loading && (
              <div className="mt-8 p-6 bg-white rounded-2xl border border-emerald-100 shadow-lg text-center space-y-4">
                <div className="p-3 bg-emerald-50 rounded-full text-emerald-600 w-fit mx-auto">
                  <RefreshCw className="w-8 h-8 animate-spin" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Auditing Store Safety & Trust</h3>
                <p className="text-sm text-slate-600 max-w-md mx-auto">{loadingStep}</p>
              </div>
            )}

            {/* Feature Highlights Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-12">
              <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm">
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg w-fit mb-3">
                  <Building2 className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-slate-900 text-sm mb-1">Corporate Identity</h4>
                <p className="text-slate-500 text-xs">Verifies street addresses, domain-matched email handles, and hotline phone support.</p>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm">
                <div className="p-2.5 bg-purple-50 text-purple-600 rounded-lg w-fit mb-3">
                  <Lock className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-slate-900 text-sm mb-1">Domain Signals</h4>
                <p className="text-slate-500 text-xs">Detects brand-new throwaway store domains and unencrypted payment gateways.</p>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm">
                <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg w-fit mb-3">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-slate-900 text-sm mb-1">Scam Protection</h4>
                <p className="text-slate-500 text-xs">Scans Trustpilot, Reddit, and BBB archives for non-delivery or chargeback reports.</p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CHECKPOINTS AUDIT */}
        {activeTab === 'checklist' && storeInfo && (
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 font-bold text-xl">
                  {storeInfo.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-xl font-bold text-slate-900">{storeInfo.name}</h2>
                    <span className="text-xs font-semibold px-2.5 py-0.5 bg-slate-100 text-slate-700 rounded-full border border-slate-200">
                      {storeInfo.businessType}
                    </span>
                  </div>
                  <a
                    href={storeInfo.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-emerald-600 hover:underline flex items-center space-x-1 mt-0.5"
                  >
                    <span>{storeInfo.url}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              <button
                onClick={() => setActiveTab('report')}
                className="w-full md:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-md shadow-emerald-600/20 flex items-center justify-center space-x-2 transition-all"
              >
                <BadgeCheck className="w-4 h-4" />
                <span>View Verdict & Report</span>
              </button>
            </div>

            {/* Category Filter Tabs */}
            <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-none">
              {trustCategories.map((cat, idx) => {
                const IconComponent = cat.icon;
                const isActive = activeCategoryIndex === idx;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategoryIndex(idx)}
                    className={`px-4 py-3 rounded-xl border font-medium text-xs sm:text-sm whitespace-nowrap flex items-center space-x-2.5 transition-all ${
                      isActive
                        ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <IconComponent className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                    <span>{cat.category}</span>
                  </button>
                );
              })}
            </div>

            {/* Active Checkpoint Category Card */}
            {(() => {
              const currentCategory = trustCategories[activeCategoryIndex];
              const CategoryIcon = currentCategory.icon;

              return (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-6 bg-slate-50 border-b border-slate-200 flex items-start space-x-4">
                    <div className="p-3 bg-emerald-100 text-emerald-700 rounded-xl">
                      <CategoryIcon className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">{currentCategory.category}</h3>
                      <p className="text-slate-500 text-xs sm:text-sm mt-0.5">{currentCategory.description}</p>
                    </div>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {currentCategory.checks.map((chk) => {
                      const currentVal = checklist[chk.id]?.value || 'maybe';
                      const reason = checklist[chk.id]?.reason || 'Analyzing check...';

                      return (
                        <div key={chk.id} className="p-6 space-y-4 hover:bg-slate-50/50 transition-colors">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="space-y-1 max-w-xl">
                              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                                {chk.label}
                              </span>
                              <h4 className="text-base font-semibold text-slate-900">{chk.prompt}</h4>
                            </div>

                            {/* Verification Toggle Options */}
                            <div className="flex items-center space-x-2 bg-slate-100 p-1 rounded-xl w-fit">
                              <button
                                type="button"
                                onClick={() => handleCheckChange(chk.id, 'yes')}
                                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
                                  currentVal === 'yes'
                                    ? 'bg-emerald-600 text-white shadow-sm'
                                    : 'text-slate-600 hover:text-slate-900'
                                }`}
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Verified Safe</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleCheckChange(chk.id, 'maybe')}
                                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
                                  currentVal === 'maybe'
                                    ? 'bg-amber-500 text-white shadow-sm'
                                    : 'text-slate-600 hover:text-slate-900'
                                }`}
                              >
                                <AlertTriangle className="w-3.5 h-3.5" />
                                <span>Unsure</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleCheckChange(chk.id, 'no')}
                                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
                                  currentVal === 'no'
                                    ? 'bg-rose-600 text-white shadow-sm'
                                    : 'text-slate-600 hover:text-slate-900'
                                }`}
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Risk / Failed</span>
                              </button>
                            </div>
                          </div>

                          <div className="flex items-start space-x-2 text-xs bg-emerald-50/70 text-emerald-900 p-3 rounded-xl border border-emerald-100">
                            <Sparkles className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                            <div>
                              <span className="font-semibold">AI Audit Findings: </span>
                              <span>{reason}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                    <button
                      disabled={activeCategoryIndex === 0}
                      onClick={() => setActiveCategoryIndex((prev) => prev - 1)}
                      className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40"
                    >
                      Previous
                    </button>

                    {activeCategoryIndex < trustCategories.length - 1 ? (
                      <button
                        onClick={() => setActiveCategoryIndex((prev) => prev + 1)}
                        className="px-5 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 flex items-center space-x-1"
                      >
                        <span>Next Category</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button
                        onClick={() => setActiveTab('report')}
                        className="px-5 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 flex items-center space-x-1"
                      >
                        <span>View Verdict Report</span>
                        <BadgeCheck className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* TAB 3: FINAL VERDICT & PRINT REPORT */}
        {activeTab === 'report' && summaryReport && (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 print:hidden">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Store Reliability Report</h2>
                <p className="text-xs text-slate-500">Target URL: {storeInfo?.url}</p>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl flex items-center space-x-2 shadow-sm transition-all"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Report</span>
                </button>
                <button
                  onClick={() => setActiveTab('checklist')}
                  className="px-4 py-2.5 bg-emerald-50 border border-emerald-100 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-xl flex items-center space-x-1 transition-all"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Adjust Checkpoints</span>
                </button>
              </div>
            </div>

            {/* Verdict Banner */}
            {(() => {
              const status = getStatusBadge(summaryReport.riskLevel);
              const StatusIcon = status.icon;

              return (
                <div className={`p-6 sm:p-8 rounded-2xl border shadow-sm ${status.bg} flex flex-col md:flex-row items-center justify-between gap-6`}>
                  <div className="flex items-center space-x-5">
                    <div className={`p-4 rounded-2xl bg-white shadow-sm ${status.color}`}>
                      <StatusIcon className="w-10 h-10" />
                    </div>
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Safety Verdict</span>
                      <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900">{status.label}</h3>
                      <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-xl">{summaryReport.executiveSummary}</p>
                    </div>
                  </div>

                  <div className="flex flex-col items-center justify-center bg-white p-4 rounded-xl border border-slate-200 min-w-[140px]">
                    <span className="text-xs font-bold text-slate-400 uppercase">Trust Score</span>
                    <span className={`text-4xl font-black ${status.color}`}>{summaryReport.overallTrustScore}</span>
                    <span className="text-[10px] text-slate-400 font-semibold">/ 100 Points</span>
                  </div>
                </div>
              );
            })()}

            {/* Red Flags vs Green Lights Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-emerald-100 shadow-sm space-y-3">
                <div className="flex items-center space-x-2 text-emerald-700 font-bold text-sm">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Verified Positive Trust Signals</span>
                </div>
                {summaryReport.greenLights.length > 0 ? (
                  <ul className="space-y-2 text-xs text-slate-600">
                    {summaryReport.greenLights.map((gl, i) => (
                      <li key={i} className="flex items-start space-x-2 bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-100">
                        <span className="font-bold text-emerald-600">•</span>
                        <span>{gl}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-slate-400 italic">No significant positive trust signals confirmed.</p>
                )}
              </div>

              <div className="bg-white p-6 rounded-2xl border border-rose-100 shadow-sm space-y-3">
                <div className="flex items-center space-x-2 text-rose-700 font-bold text-sm">
                  <XCircle className="w-5 h-5" />
                  <span>Detected Fraud & Friction Indicators</span>
                </div>
                {summaryReport.redFlags.length > 0 ? (
                  <ul className="space-y-2 text-xs text-slate-600">
                    {summaryReport.redFlags.map((rf, i) => (
                      <li key={i} className="flex items-start space-x-2 bg-rose-50/50 p-2.5 rounded-lg border border-rose-100">
                        <span className="font-bold text-rose-600">•</span>
                        <span>{rf}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-slate-400 italic">No critical fraud red flags detected.</p>
                )}
              </div>
            </div>

            {/* Recommended Safeguards */}
            <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-lg space-y-3">
              <div className="flex items-center space-x-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                <Info className="w-4 h-4" />
                <span>Buyer Protection Advice</span>
              </div>
              <h4 className="font-bold text-base text-white">Recommended Consumer Safeguards</h4>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">{summaryReport.shoppingAdvice}</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}