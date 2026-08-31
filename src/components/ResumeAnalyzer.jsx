import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import CheckoutForm from './CheckoutForm';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

export default function ResumeAnalyzer() {
  const [file, setFile] = useState(null);
  const [jobDescription, setJobDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const [regeneratedCv, setRegeneratedCv] = useState('');
  const [loadingRegen, setLoadingRegen] = useState(false);
  const [regenCount, setRegenCount] = useState(0);
  const [copied, setCopied] = useState(false);
  const [showStripeModal, setShowStripeModal] = useState(false);

  useEffect(() => {
    const savedCount = localStorage.getItem('cv_regen_count') || 0;
    setRegenCount(parseInt(savedCount));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file || !jobDescription) {
      alert("Please upload a PDF resume and paste the job description!");
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('resume', file);
    formData.append('jobDescription', jobDescription);

    try {
      const response = await fetch('https://ai-resume-analyzer-ats-henna.vercel.app/api/analyze', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (data.success) {
        setResult(data.data);
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      alert('Server Connection Error!');
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateCv = async () => {
    if (regenCount >= 1) {
      alert("Free Limit Reached! Upgrade to Pro for unlimited CV regenerations.");
      setShowStripeModal(true);
      return;
    }

    if (!result || !result.missingSkills) {
      alert("Please run analysis first!");
      return;
    }

    setLoadingRegen(true);

    try {
      const response = await fetch('https://ai-resume-analyzer-ats-henna.vercel.app/api/regenerate-cv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          missingSkills: result.missingSkills || [],
          improvementAdvice: result.improvementAdvice || [],
        }),
      });

      const data = await response.json();
      if (data.success) {
        setRegeneratedCv(data.optimizedBulletPoints);
        const newCount = regenCount + 1;
        setRegenCount(newCount);
        localStorage.setItem('cv_regen_count', newCount.toString());
      } else {
        alert('Failed: ' + (data.error || 'Could not generate bullets'));
      }
    } catch (err) {
      console.error(err);
      alert('Failed to regenerate CV bullets.');
    } finally {
      setLoadingRegen(false);
    }
  };

  const handleCopy = () => {
    const cleanText = regeneratedCv.replace(/\*\*/g, '');
    navigator.clipboard.writeText(cleanText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePaymentSuccess = () => {
    alert("Payment Successful! Pro Plan Unlocked.");
    localStorage.setItem('cv_regen_count', '0');
    setRegenCount(0);
    setShowStripeModal(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-6 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">AI Resume Analyzer</h1>
          <p className="text-slate-500 text-sm max-w-md mx-auto">Instant ATS matching score, skills gap analysis & AI-powered bullet point generation.</p>
        </div>

        {/* Form Inputs */}
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1.5">Step 1</span>
            <h3 className="font-semibold text-slate-800 mb-2">Upload Resume (PDF)</h3>
            <div className="border-2 border-dashed border-slate-200 hover:border-blue-400 transition-colors rounded-xl p-6 text-center bg-slate-50/50 flex-1 flex flex-col justify-center items-center">
              <input 
                type="file" 
                accept=".pdf" 
                id="pdfUpload"
                onChange={(e) => setFile(e.target.files[0])} 
                className="hidden" 
              />
              <label htmlFor="pdfUpload" className="bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg font-medium text-sm cursor-pointer hover:bg-slate-50 shadow-xs transition">
                Select PDF File
              </label>
              <p className="text-xs text-slate-400 mt-2 font-medium">{file ? file.name : "No file chosen"}</p>
            </div>
          </div>

          <div className="flex flex-col">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1.5">Step 2</span>
            <h3 className="font-semibold text-slate-800 mb-2">Paste Job Description</h3>
            <textarea 
              rows="6"
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste job details..."
              className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-hidden flex-1 resize-none text-xs text-slate-700 leading-relaxed placeholder:text-slate-400"
            ></textarea>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="md:col-span-2 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition shadow-xs disabled:bg-slate-300 text-sm cursor-pointer"
          >
            {loading ? 'Analyzing Resume with AI...' : 'Start AI Analysis'}
          </button>
        </form>

        {/* Dashboard Results Section */}
        {result && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h2 className="text-xl font-bold text-slate-900">Analysis Breakdown</h2>
              <span className="text-xs bg-slate-200 text-slate-700 font-medium px-2.5 py-1 rounded-full">Report Ready</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5 items-start">
              
              {/* Box 1: Match Score */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs text-center flex flex-col items-center justify-center min-h-[220px]">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Match Score</span>
                <div className="relative w-28 h-28 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-slate-100"
                      strokeWidth="3.5"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className="text-blue-600 transition-all duration-1000 stroke-current"
                      strokeDasharray={`${result.matchPercentage}, 100`}
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <span className="absolute text-2xl font-extrabold text-slate-900">{result.matchPercentage}%</span>
                </div>
              </div>

              {/* Box 2: Matched Skills */}
              <div className="bg-white border border-slate-200/80 border-t-4 border-t-emerald-500 p-5 rounded-2xl shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Matched Skills</h4>
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">{result.matchedSkills?.length || 0}</span>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {result.matchedSkills?.map((skill, idx) => (
                    <span key={idx} className="bg-emerald-50 text-emerald-700 border border-emerald-200/60 text-xs px-2.5 py-1 rounded-md font-medium">
                      ✓ {skill}
                    </span>
                  ))}
                </div>
              </div>

              {/* Box 3: Missing Keywords */}
              <div className="bg-white border border-slate-200/80 border-t-4 border-t-rose-500 p-5 rounded-2xl shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Missing Keywords</h4>
                  <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded-full">{result.missingSkills?.length || 0}</span>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {result.missingSkills?.map((skill, idx) => (
                    <span key={idx} className="bg-rose-50 text-rose-700 border border-rose-200/60 text-xs px-2.5 py-1 rounded-md font-medium">
                      ✕ {skill}
                    </span>
                  ))}
                </div>
              </div>

              {/* Box 4: Key Improvements */}
              <div className="bg-white border border-slate-200/80 border-t-4 border-t-amber-500 p-5 rounded-2xl shadow-xs space-y-3">
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Key Improvements</h4>
                <ul className="text-xs text-slate-600 space-y-2 leading-relaxed">
                  {result.improvementAdvice?.map((advice, idx) => (
                    <li key={idx} className="flex items-start gap-2 bg-amber-50/50 p-2 rounded-lg border border-amber-100">
                      <span className="text-amber-500 shrink-0 mt-0.5">💡</span>
                      <span>{advice}</span>
                    </li>
                  ))}
                </ul>
              </div>

            </div>

            {/* Dynamic Box 5: Job Requirements Check */}
            {result.requirementsCheck && (
              <div className="bg-white border border-slate-200/80 border-t-4 border-t-indigo-500 p-5 rounded-2xl shadow-xs space-y-3">
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                  Job Requirements Evaluation
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="flex flex-col justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 gap-1">
                    <span className="text-slate-500 text-[11px] font-medium">Required Experience</span>
                    <span className="font-bold text-slate-900 text-xs">
                      {result.requirementsCheck.requiredExperience || "Not Specified"}
                    </span>
                  </div>

                  <div className="flex flex-col justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 gap-1">
                    <span className="text-slate-500 text-[11px] font-medium">Your Experience</span>
                    <span className={`font-bold text-xs ${result.requirementsCheck.experienceMatch ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {result.requirementsCheck.experienceMatch ? '✓ ' : '✕ '}
                      {result.requirementsCheck.candidateExperience || "0 Years"}
                    </span>
                  </div>

                  <div className="flex flex-col justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 gap-1">
                    <span className="text-slate-500 text-[11px] font-medium">Degree Requirement</span>
                    <span className="font-bold text-slate-900 text-xs leading-snug break-words">
                      {result.requirementsCheck.requiredDegree || "Not Specified"}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Freemium CV Regeneration Section */}
            <div className="bg-white p-6 rounded-2xl border border-purple-200 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-purple-100 pb-3">
                <div>
                  <h3 className="text-base font-bold text-purple-950 flex items-center gap-2">
                    <span>✨</span> AI CV Auto-Rewriter
                  </h3>
                  <p className="text-xs text-slate-500">Generate high-impact, ATS-optimized bullet points based on missing keywords.</p>
                </div>
                {regenCount < 1 && (
                  <span className="bg-purple-100 text-purple-700 text-xs font-bold px-3 py-1 rounded-full self-start sm:self-auto">
                    {1 - regenCount} Free Trial Available
                  </span>
                )}
              </div>

              {regenCount < 1 ? (
                <button
                  onClick={handleRegenerateCv}
                  disabled={loadingRegen}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2.5 px-5 rounded-xl transition shadow-xs text-xs cursor-pointer disabled:bg-slate-300"
                >
                  {loadingRegen ? 'Generating Tailored Bullet Points...' : 'Regenerate Tailored Bullet Points'}
                </button>
              ) : (
                <div className="bg-purple-50/50 border border-purple-100 p-4 rounded-xl flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                  <div>
                    <p className="font-bold text-purple-900 text-xs">🔒 Free Trial Limit Reached</p>
                    <p className="text-xs text-slate-500 mt-0.5">Upgrade to Pro to reset limit and get unlimited AI CV rewrites.</p>
                  </div>
                  <button 
                    onClick={() => setShowStripeModal(true)} 
                    className="bg-purple-600 text-white font-bold text-xs px-4 py-2 rounded-lg hover:bg-purple-700 transition shrink-0 cursor-pointer"
                  >
                    Unlock Pro (PKR 500)
                  </button>
                </div>
              )}

              {/* Stripe Payment Modal */}
              {showStripeModal && (
                <div className="mt-4 p-4 border border-purple-200 rounded-xl bg-slate-50 space-y-3">
                  <div className="flex justify-between items-center border-b pb-2">
                    <h4 className="font-bold text-xs text-slate-800">Complete Pro Upgrade Payment</h4>
                    <button 
                      onClick={() => setShowStripeModal(false)}
                      className="text-xs text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
                    >
                      ✕ Close
                    </button>
                  </div>
                  <Elements stripe={stripePromise}>
                    <CheckoutForm onSuccess={handlePaymentSuccess} />
                  </Elements>
                </div>
              )}

              {/* Display Box for Clean Bullet Points Rendering */}
              {regeneratedCv && (
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-slate-800 text-xs">Tailored CV Bullet Points:</h4>
                    <button 
                      onClick={handleCopy}
                      className="text-xs text-purple-600 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      {copied ? '✓ Copied Clean Text!' : '📋 Copy to Clipboard'}
                    </button>
                  </div>
                  <div className="w-full p-4 border border-purple-200 rounded-xl bg-slate-900 text-slate-100 text-xs leading-relaxed max-h-64 overflow-y-auto font-sans whitespace-pre-wrap">
                    {regeneratedCv.replace(/\*\*/g, '')}
                  </div>
                </div>
              )}
            </div>

          </div>
        )}

      </div>
    </div>
  );
}