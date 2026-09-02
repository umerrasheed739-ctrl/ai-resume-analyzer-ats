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
  const [isPro, setIsPro] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showStripeModal, setShowStripeModal] = useState(false);

  // States for AI Mock Interview Freemium Limit & Payment
  const [mockInterviewCount, setMockInterviewCount] = useState(0);
  const [isMockPro, setIsMockPro] = useState(false);
  const [showMockStripeModal, setShowMockStripeModal] = useState(false);

  // States for Live Jobs Sidebar via JSearch API
  const [liveJobs, setLiveJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [jobSearchQuery, setJobSearchQuery] = useState('Software Engineer');

  const fetchLiveJobs = async (query = 'Software Engineer') => {
    setLoadingJobs(true);
    try {
      const encodedQuery = encodeURIComponent(`${query} in Pakistan`);
      const url = `https://jsearch.p.rapidapi.com/search-v2?query=${encodedQuery}&num_pages=1&country=pk&date_posted=all`;
      
      const apiKey = import.meta.env.VITE_RAPIDAPI_KEY || '0f9b614d9amshb1ff2ff5ff93cf9p14b1afjsnf8d8a25d7e31';

      const options = {
        method: 'GET',
        headers: {
          'x-rapidapi-key': apiKey,
          'x-rapidapi-host': 'jsearch.p.rapidapi.com',
          'Content-Type': 'application/json'
        }
      };
      const response = await fetch(url, options);
      const data = await response.json();
      
      console.log("API Full Response:", data);

      let jobsList = [];
      if (Array.isArray(data?.data)) {
        jobsList = data.data;
      } else if (data?.data && typeof data.data === 'object') {
        jobsList = Object.values(data.data).find(val => Array.isArray(val)) || data?.data?.jobs || [];
      }
      
      if (jobsList.length > 0) {
        const formattedJobs = jobsList.slice(0, 15).map(job => ({
          job_title: job.job_title || 'Software Engineer',
          employer_name: job.employer_name || 'Tech Company',
          job_description: job.job_description ? job.job_description.replace(/<[^>]*>?/gm, '') : 'Exciting tech opportunity in Pakistan.',
          job_country: job.job_country || 'Pakistan'
        }));
        setLiveJobs(formattedJobs);
      } else {
        console.warn("API returned empty or unrecognized job format:", data);
        setLiveJobs([]);
      }
      
    } catch (error) {
      console.error("Failed to fetch live jobs from JSearch:", error);
    } finally {
      setLoadingJobs(false);
    }
  };

  useEffect(() => {
    const savedCount = localStorage.getItem('cv_regen_count') || 0;
    const savedProStatus = localStorage.getItem('is_pro_user') === 'true';
    const savedMockCount = localStorage.getItem('mock_interview_count') || 0;
    const savedMockProStatus = localStorage.getItem('is_mock_pro_user') === 'true';
    
    setRegenCount(parseInt(savedCount));
    setIsPro(savedProStatus);
    setMockInterviewCount(parseInt(savedMockCount));
    setIsMockPro(savedMockProStatus);

    fetchLiveJobs('Software Engineer');
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
    if (!isPro && regenCount >= 1) {
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
        
        if (!isPro) {
          const newCount = regenCount + 1;
          setRegenCount(newCount);
          localStorage.setItem('cv_regen_count', newCount.toString());
        }
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
    setIsPro(true);
    localStorage.setItem('is_pro_user', 'true');
    setShowStripeModal(false);
  };

  const handleStartMockInterview = () => {
    if (!isMockPro && mockInterviewCount >= 1) {
      setShowMockStripeModal(true);
      return;
    }

    if (!isMockPro) {
      const newCount = mockInterviewCount + 1;
      setMockInterviewCount(newCount);
      localStorage.setItem('mock_interview_count', newCount.toString());
    }

    const encodedRole = encodeURIComponent(jobDescription.slice(0, 100));
    const mockInterviewUrl = `https://ai-mock-interview-frontend-six.vercel.app/?role=${encodedRole}`;
    
    window.open(mockInterviewUrl, '_blank');
  };

  const handleMockPaymentSuccess = () => {
    alert("Payment Successful! Mock Interview Pro Unlocked.");
    setIsMockPro(true);
    localStorage.setItem('is_mock_pro_user', 'true');
    setShowMockStripeModal(false);
    window.open('https://ai-mock-interview-frontend-six.vercel.app/', '_blank');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-6 font-sans">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* SIDEBAR: Live Job Postings in Pakistan */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs h-fit space-y-4 lg:col-span-1">
          <div className="border-b pb-3 space-y-2">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
              <span>🇵🇰</span> Live Jobs in Pakistan
            </h3>
            <div className="flex gap-1.5">
              <input 
                type="text" 
                value={jobSearchQuery}
                onChange={(e) => setJobSearchQuery(e.target.value)}
                placeholder="e.g. Flutter, React, Python"
                className="w-full text-xs p-2 border border-slate-200 rounded-lg outline-hidden focus:border-blue-500"
              />
              <button 
                onClick={() => fetchLiveJobs(jobSearchQuery)}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-2 rounded-lg font-bold shrink-0 cursor-pointer"
              >
                Search
              </button>
            </div>
            <p className="text-[11px] text-slate-400">Click any job to auto-load its JD.</p>
          </div>

          {loadingJobs ? (
            <p className="text-xs text-slate-400 text-center py-6">Fetching live jobs from Pakistan...</p>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {liveJobs.map((job, idx) => (
                <div 
                  key={idx} 
                  onClick={() => setJobDescription(job.job_description)}
                  className="p-3 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-blue-50/50 hover:border-blue-200 transition cursor-pointer space-y-1.5"
                >
                  <div className="flex justify-between items-start">
                    <h4 className="font-bold text-xs text-slate-800 line-clamp-1">{job.job_title}</h4>
                    <span className="text-[10px] bg-emerald-100 text-emerald-700 font-bold px-1.5 py-0.5 rounded-md shrink-0">
                      {job.job_country || 'Pakistan'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium">{job.employer_name}</p>
                  <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">{job.job_description}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* MAIN CONTENT AREA */}
        <div className="lg:col-span-3 space-y-8">
          
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">JobLens 360</h1>
            <p className="text-slate-500 text-sm max-w-md mx-auto">Live Job Finder, ATS Scanner & AI Interview Hub</p>
          </div>

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
                placeholder="Click any job from sidebar or paste details..."
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
                <div className="bg-white border border-slate-200/80 border-t-4 border-t-amber-500 p-5 rounded-2xl shadow-xs space-y-3 md:col-span-4">
                  <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Key Improvements</h4>
                  <ul className="text-xs text-slate-600 space-y-2 leading-relaxed grid grid-cols-1 md:grid-cols-2 gap-3">
                    {result.improvementAdvice?.map((advice, idx) => (
                      <li key={idx} className="flex items-start gap-2 bg-amber-50/50 p-2.5 rounded-lg border border-amber-100">
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

              {/* Freemium / Pro CV Regeneration Section */}
              <div className="bg-white p-6 rounded-2xl border border-purple-200 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-purple-100 pb-3">
                  <div>
                    <h3 className="text-base font-bold text-purple-950 flex items-center gap-2">
                      <span>✨</span> AI CV Auto-Rewriter
                    </h3>
                    <p className="text-xs text-slate-500">Generate high-impact, ATS-optimized bullet points based on missing keywords.</p>
                  </div>
                  
                  <span className={`text-xs font-bold px-3 py-1 rounded-full self-start sm:self-auto ${
                    isPro ? 'bg-emerald-100 text-emerald-800' : 'bg-purple-100 text-purple-700'
                  }`}>
                    {isPro ? '✨ Pro Plan Active (Unlimited)' : `${Math.max(0, 1 - regenCount)} Free Trial Available`}
                  </span>
                </div>

                {isPro || regenCount < 1 ? (
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
                      <p className="font-bold text-purple-905 text-xs">🔒 Free Trial Limit Reached</p>
                      <p className="text-xs text-slate-500 mt-0.5">Upgrade to Pro to get unlimited AI CV rewrites.</p>
                    </div>
                    <button 
                      onClick={() => setShowStripeModal(true)} 
                      className="bg-purple-600 text-white font-bold text-xs px-4 py-2 rounded-lg hover:bg-purple-700 transition shrink-0 cursor-pointer"
                    >
                      Unlock Pro ($2.00)
                    </button>
                  </div>
                )}

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

              {/* AI Mock Interview Section with Freemium Limit & Stripe Modal */}
              <div className="mt-6 pt-4 border-t border-purple-100 space-y-3 bg-blue-50/40 p-4 rounded-xl border border-blue-100">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div>
                    <h4 className="font-bold text-blue-950 text-xs flex items-center gap-1.5">
                      <span>🎯</span> Ready to test your skills for this role?
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {isMockPro ? '✨ Pro Plan Active (Unlimited Interviews)' : `${Math.max(0, 1 - mockInterviewCount)} Free Mock Interview Trial Available`}
                    </p>
                  </div>
                  <button
                    onClick={handleStartMockInterview}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition shadow-xs shrink-0 cursor-pointer flex items-center gap-2"
                  >
                    <span>🎤</span> {isMockPro || mockInterviewCount < 1 ? 'Start AI Mock Interview' : 'Unlock Pro ($2.00)'}
                  </button>
                </div>

                {showMockStripeModal && (
                  <div className="mt-4 p-4 border border-blue-200 rounded-xl bg-slate-50 space-y-3">
                    <div className="flex justify-between items-center border-b pb-2">
                      <h4 className="font-bold text-xs text-slate-800">Unlock Unlimited AI Mock Interviews ($2.00)</h4>
                      <button 
                        onClick={() => setShowMockStripeModal(false)}
                        className="text-xs text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
                      >
                        ✕ Close
                      </button>
                    </div>
                    <Elements stripe={stripePromise}>
                      <CheckoutForm onSuccess={handleMockPaymentSuccess} />
                    </Elements>
                  </div>
                )}
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
}