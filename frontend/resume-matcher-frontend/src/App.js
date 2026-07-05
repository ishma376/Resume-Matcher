import React, { useState } from 'react';
import axios from 'axios';
import { Upload, Sparkles, Loader2, LogIn, Mail, ArrowLeft, FileText, Check, AlertTriangle } from 'lucide-react';
import { useGoogleLogin } from '@react-oauth/google';
import { GoogleLogin } from '@react-oauth/google';

function App() {
  const [currentScreen, setCurrentScreen] = useState('desk'); 
  const [authMode, setAuthMode] = useState('signup'); // 'signin' or 'signup'
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Core App States
  const [file, setFile] = useState(null);
  const [jobDescription, setJobDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  // Auth Inputs & Core Error States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState(''); 
  const [authSuccessMsg, setAuthSuccessMsg] = useState('');
  const [streamLogs, setStreamLogs] = useState([]);
const [liveScore, setLiveScore] = useState(0);

  // Fixed specific rotation and alignment properties to match the first picture
  const staticResumes = [
    { id: 1, title: "FullStack_Resume.pdf", transform: "rotate(-10deg) translate(-75px, -45px)", animDelay: "0s" },
    { id: 2, title: "MERN_Developer.pdf", transform: "rotate(6deg) translate(85px, -35px)", animDelay: "0.3s" },
    { id: 3, title: "Frontend_Engineer.pdf", transform: "rotate(-4deg) translate(-85px, 45px)", animDelay: "0.15s" },
    { id: 4, title: "Backend_Specialist.pdf", transform: "rotate(8deg) translate(75px, 55px)", animDelay: "0.45s" },
  ];

  const handleFileClick = () => {
    if (!isLoggedIn) {
      setAuthError('');
      setAuthSuccessMsg('');
      setAuthMode('signup');
      setCurrentScreen('auth');
    } else {
      setCurrentScreen('dashboard');
    }
  };

  const handleSecureAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccessMsg('');

    const payload = { email, password };
    const endpoint = authMode === 'signup' ? 'signup' : 'signin';

    try {
      const response = await axios.post(`http://127.0.0.1:8000/api/auth/${endpoint}`, payload);
      
      if (authMode === 'signup') {
        setAuthSuccessMsg(response.data.message);
        setAuthMode('signin');
        setPassword('');
      } else {
        localStorage.setItem('userToken', response.data.token);
        setIsLoggedIn(true);
        setCurrentScreen('dashboard');
      }
    } catch (error) {
      if (error.response && error.response.data) {
        setAuthError(error.response.data.detail);
      } else {
        setAuthError("Server communication broken. Verify database or network logs.");
      }
    }
  };

  const handleLogOut = () => {
    localStorage.removeItem('userToken');
    setIsLoggedIn(false);
    setFile(null);
    setJobDescription('');
    setResult(null);
    setCurrentScreen('desk');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file || !jobDescription) return alert("Please provide both a resume and job description!");

    setLoading(true); // 🟢 FIXED: Changed 'loading(true)' to 'setLoading(true)'
    const formData = new FormData();
    formData.append('resume', file);
    formData.append('job_description', jobDescription);

    try {
      const response = await axios.post('http://127.0.0.1:8000/api/analyze', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setResult(response.data);
    } catch (error) {
      console.error("Analysis error:", error);
      alert("Something went wrong. Check backend or API keys.");
    } finally {
      setLoading(false);
    }
  };

  const analyzeResumeStream = async () => {
    setLoading(true);
setResult(null);
setStreamLogs([]);
    setStreamLogs([]);
    setLiveScore(0);

    const formData = new FormData();
    formData.append("resume", file);
    formData.append("job_description", jobDescription);

    const response = await fetch("http://127.0.0.1:8000/api/analyze", {
      method: "POST",
      body: formData,
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");

    let fullText = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      fullText += chunk;

      setStreamLogs(prev => [...prev, chunk]);

      const match = chunk.match(/"match_score"\s*:\s*(\d+)/);
      if (match) {
        animateScore(parseInt(match[1]));
      }
    }

    try {
      const cleaned = fullText
        .replace(/```json/g, "")
        .replace(/```/g, "");

      setResult(JSON.parse(cleaned));
      setLoading(false);
    } catch (e) {
      console.log(e);
      setLoading(false);
    }
  };

  const animateScore = (target) => {
    let current = 0;

    const interval = setInterval(() => {
      current += 1;
      setLiveScore(current);

      if (current >= target) {
        clearInterval(interval);
      }
    }, 20);
  };

  // Google Login Hook Custom Trigger Configuration
  const loginWithGoogle = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      console.log("Google Token Received:", tokenResponse);
      try {
        const response = await axios.post('http://127.0.0.1:8000/api/auth/google', {}, {
          headers: {
            Authorization: `Bearer ${tokenResponse.access_token}`
          }
        });
        
        console.log("Backend validation successful:", response.data);
        localStorage.setItem('userToken', response.data.token || tokenResponse.access_token);
        setIsLoggedIn(true);
        setCurrentScreen('dashboard');
      } catch (error) {
        console.error("Backend error validating google token:", error);
        setAuthError("Google authentication failed structural validation on backend.");
      }
    },
    onError: (error) => {
      console.error('Google Sign-In Failed:', error);
      setAuthError("Google integration script execution aborted.");
    }
  });

  return (
    <div className="min-h-screen bg-[#F4F3EF] text-slate-800 font-sans antialiased overflow-x-hidden relative">
      {/* Dynamic Keyframe Injection block safely scoped inside JSX */}
      <style>{`
        @keyframes topDeskFloat {
          0%, 100% { 
            transform: translateY(0px); 
          }
          50% { 
            transform: translateY(-4px); 
          }
        }
      `}</style>


      {/* SCREEN 1: STANDARDIZED TOP-VIEW WORKSPACE */}
      {currentScreen === 'desk' && (
        <div className="min-h-screen flex flex-col justify-between items-center p-6 bg-[#F5F4F0] relative">
          
          {/* Clean Header Grid */}
          <div className="text-center mt-12 z-10 max-w-xl space-y-3">
            <h1 className="text-3xl font-black tracking-tight text-[#1C2C2E] flex items-center justify-center gap-2">
              <Sparkles className="text-[#D96B27]" size={28} /> Workspace Terminal
            </h1>
            <p className="text-xs text-[#5C6466] font-medium max-w-md mx-auto leading-relaxed">
              Select an active portfolio blueprint sitting on the terminal workspace mat below to initiate the deep matrix validation sequence.
            </p>
          </div>

          {/* The Flattened Desk Frame Pad Area */}
          <div className="w-full max-w-5xl h-[520px] flex items-center justify-center relative z-10">
            
            {/* Highly Realistic Oval Wooden Table Mat Layering with Organic Wood Grains */}
            <div 
              className="w-[660px] h-[375px] relative flex items-center justify-center border border-[#A67F5D]/30"
              style={{
                borderRadius: '50%',
                background: `
                  repeating-linear-gradient(90deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 4px),
                  repeating-linear-gradient(0deg, rgba(0,0,0,0.02) 0px, rgba(0,0,0,0.02) 2px, transparent 2px, transparent 12px),
                  radial-gradient(ellipse at center, #DCA673 0%, #C9915B 50%, #B37A46 85%, #965E2D 100%)
                `,
                boxShadow: `
                  0 45px 85px -20px rgba(66, 38, 14, 0.45), 
                  inset 0 3px 12px rgba(255, 255, 255, 0.35), 
                  inset 0 -6px 18px rgba(0, 0, 0, 0.2)
                `
              }}
            >
              {staticResumes.map((res) => (
                <div
                  key={res.id} 
                  onClick={handleFileClick}
                  className="absolute cursor-pointer select-none transition-all duration-500 ease-out group"
                  style={{ 
                    transform: res.transform,
                  }}
                >
                  {/* Styled Fine Textured Paper Card with Warm Shadow Metrics */}
                  <div 
                    className="bg-[#FCFBF7] border border-[#EBE8DF] rounded-xl p-4 w-[165px] h-[220px] flex flex-col justify-between transition-all duration-500 ease-out group-hover:-translate-y-6 group-hover:scale-105 group-hover:border-[#D96B27]"
                    style={{ 
                      boxShadow: '0 8px 20px -6px rgba(54, 32, 12, 0.22), 0 3px 6px -2px rgba(54, 32, 12, 0.15)',
                      animation: `topDeskFloat 5s ease-in-out infinite`, 
                      animationDelay: res.animDelay 
                    }}
                  >
                    <div className="space-y-4">
                      {/* File Header Block */}
                      <div className="flex items-center gap-1.5 border-b border-[#F0EDE4] pb-2.5">
                        <FileText size={14} className="text-[#D96B27] shrink-0" />
                        <span className="text-[10px] font-bold tracking-tight text-[#424A4C] truncate">{res.title}</span>
                      </div>
                      
                      {/* Document Mock Lines */}
                      <div className="space-y-2 opacity-50">
                        <div className="w-full h-[2px] bg-[#E2DEC3] rounded-full" />
                        <div className="w-11/12 h-[2px] bg-[#E2DEC3] rounded-full" />
                        <div className="w-4/5 h-[2px] bg-[#E2DEC3] rounded-full" />
                      </div>
                    </div>

                    {/* Standardized Orange Call-To-Action Layout Container */}
                    <div className="text-[9px] font-extrabold text-center uppercase tracking-wider text-[#FDFDFB] bg-[#D96B27] group-hover:bg-[#C85A1D] py-2.5 rounded-lg transition-colors duration-300 shadow-sm border border-[#C85A1D]/20">
                      Analyze File
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer Status Panel with soft warm highlights */}
          <div className="text-[10px] text-[#D96B27] font-bold tracking-widest mb-6 uppercase border border-[#EBE6DA] bg-[#FCFBF9] px-5 py-2 rounded-full shadow-sm">
            System Framework Connected
          </div>
        </div>
      )}

      {/* SCREEN 2: AUTHENTICATION FRAME WITH LIVE SECURITY FEEDBACK */}
      {currentScreen === 'auth' && (
        <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-tr from-amber-50 via-stone-50 to-orange-50">
          <div className="bg-white border border-stone-200 w-full max-w-md p-8 rounded-3xl shadow-xl space-y-5 relative">
            
            <button 
              onClick={() => setCurrentScreen('desk')}
              className="absolute top-6 left-6 text-stone-400 hover:text-stone-700 transition flex items-center gap-1 text-xs font-bold"
            >
              <ArrowLeft size={16} /> Cancel
            </button>

            <div className="text-center space-y-1.5 pt-4">
              <h2 className="text-2xl font-black tracking-tight text-slate-900">
                {authMode === 'signup' ? 'Create Account' : 'Welcome Back'}
              </h2>
              <p className="text-xs text-stone-500 font-medium">
                Please authenticate your profile session to access the matching logs.
              </p>
            </div>

            {authError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl flex items-center gap-2.5 text-xs font-semibold">
                <AlertTriangle size={18} className="text-rose-500 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            {authSuccessMsg && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-3 rounded-xl flex items-center gap-2.5 text-xs font-semibold">
                <Check size={18} className="text-emerald-500 shrink-0" />
                <span>{authSuccessMsg}</span>
              </div>
            )}

            <div className="space-y-3">
              <button 
                type="button"
                onClick={() => loginWithGoogle()}
                className="w-full flex items-center justify-center gap-3 bg-white hover:bg-stone-50 text-slate-700 font-bold py-3 border border-stone-200 rounded-xl transition shadow-sm text-sm"
              >
                <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
                  <path fill="#EA4335" d="M5.266 9.765A7.077 7.077 0 0112 4.909c1.69 0 3.218.6 4.418 1.582L19.9 3C17.782 1.145 15.055 0 12 0 7.34 0 3.345 2.673 1.41 6.586l3.856 3.179z"/>
                  <path fill="#4285F4" d="M23.6 12.273c0-.818-.073-1.609-.209-2.373H12v4.51h6.505a5.556 5.556 0 01-2.41 3.645l3.764 2.918c2.2-2.027 3.741-5.018 3.741-8.7z"/>
                  <path fill="#FBBC05" d="M5.266 14.235A7.09 7.09 0 014.909 12c0-.79.136-1.545.357-2.235L1.41 6.586A11.932 11.932 0 000 12c0 1.92.455 3.736 1.264 5.355l4.002-3.12z"/>
                  <path fill="#34A853" d="M12 24c3.24 0 5.955-1.073 7.941-2.927l-3.764-2.918c-1.045.7-2.382 1.118-4.177 1.118-3.41 0-6.295-2.3-7.327-5.405l-4.002 3.12C3.345 21.327 7.34 24 12 24z"/>
                </svg>
                Continue with Google
              </button>

              <div className="flex items-center my-4">
                <div className="flex-grow border-t border-stone-200"></div>
                <span className="mx-3 text-[10px] uppercase font-bold tracking-widest text-stone-400">Or credentials</span>
                <div className="flex-grow border-t border-stone-200"></div>
              </div>

              <form onSubmit={handleSecureAuthSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-stone-400">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3.5 text-stone-400" size={16} />
                    <input 
                      type="email" required placeholder="name@domain.com"
                      value={email} onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-[#D96B27]"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-stone-400">Secure Password</label>
                  <input 
                    type="password" required placeholder="••••••••"
                    value={password} onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:border-[#D96B27]"
                  />
                </div>

                <button type="submit" className="w-full bg-gradient-to-r from-[#D96B27] to-[#C85A1D] text-white font-bold py-3 rounded-xl transition shadow-md shadow-orange-100 text-sm hover:brightness-105">
                  {authMode === 'signup' ? 'Confirm Secure Registration' : 'Secure Verification Login'}
                </button>
              </form>

              <div className="text-center pt-2">
                <button onClick={() => { setAuthMode(authMode === 'signup' ? 'signin' : 'signup'); setAuthError(''); }} className="text-xs font-semibold text-[#D96B27] hover:text-[#C85A1D] underline">
                  {authMode === 'signup' ? 'Already configured an account? Sign In' : "New workspace profile? Sign Up"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SCREEN 3: DASHBOARD */}
      {currentScreen === 'dashboard' && (
        <div className="min-h-screen flex flex-col bg-stone-50 text-slate-800 animate-fadeIn">
          <header className="border-b border-stone-200 p-5 bg-white/80 backdrop-blur sticky top-0 z-40 flex justify-between items-center shadow-sm">
            <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-[#D96B27] to-[#C85A1D] bg-clip-text text-transparent flex items-center gap-2">
              <Sparkles className="text-[#D96B27]" /> Resume Matcher AI
            </h1>
            <button onClick={handleLogOut} className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl transition border border-stone-200 bg-white hover:bg-rose-50 hover:text-rose-600 shadow-sm">
              <LogIn size={16} /> Sign Out
            </button>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[calc(100vh-77px)]">
            <div className="p-8 border-r border-stone-200 bg-white flex flex-col justify-start">
              <h2 className="text-xl font-bold text-slate-900 mb-6">Analyze Your Alignment</h2>
              <form onSubmit={(e) => {
    e.preventDefault();
    analyzeResumeStream();
  }} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold tracking-wider text-stone-500 uppercase">Upload Resume (PDF)</label>
                  <div className="border-2 border-dashed border-stone-200 hover:border-[#D96B27]/50 rounded-2xl p-8 transition text-center cursor-pointer relative bg-orange-50/10 group">
                    <input type="file" accept=".pdf" onChange={(e) => setFile(e.target.files[0])} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                    <Upload className="mx-auto h-8 w-8 text-[#D96B27]/70 mb-2 group-hover:scale-110 transition-transform" />
                    <p className="text-sm font-semibold text-slate-700">{file ? file.name : "Drag & drop or click to upload PDF"}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold tracking-wider text-stone-500 uppercase">Target Job Description</label>
                  <textarea rows="8" className="w-full bg-orange-50/10 border border-stone-200 rounded-2xl p-4 focus:outline-none focus:border-[#D96B27] text-slate-800 text-sm shadow-inner transition-colors" placeholder="Paste role parameters here..." value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} />
                </div>

                <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-[#D96B27] to-[#C85A1D] text-white font-bold py-3.5 rounded-2xl transition shadow-md shadow-orange-100 flex items-center justify-center gap-2 disabled:opacity-50">
                  {loading ? <> <Loader2 className="animate-spin" /> Compiling Analysis...</> : "Run Analysis"}
                </button>
                
  
              </form>
              {loading && streamLogs.length > 0 && (
                <div className="mt-4 p-4 bg-white border rounded-xl">
                  <h3 className="font-bold text-sm mb-2">Live AI Stream</h3>

                  <div className="text-xs space-y-1 max-h-40 overflow-auto">
                    {streamLogs.map((log, index) => (
                      <p key={index}>{log}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-8 bg-orange-50/5 flex flex-col justify-start">
              {!result && !loading && (
                <div className="m-auto text-center max-w-sm text-stone-400 space-y-2">
                  <Sparkles className="mx-auto h-10 w-10 mb-2 text-[#D96B27]/30 animate-pulse" />
                  <p className="text-sm font-medium">Your score configurations will calculate here.</p>
                </div>
              )}

              {loading && (
                <div className="m-auto text-center space-y-3">
                  <Loader2 className="animate-spin h-8 w-8 mx-auto text-[#D96B27]" />
                  <p className="text-xs font-bold uppercase tracking-widest text-stone-400">wait a moment, analyzing...</p>
                </div>
              )}

              {result && !loading && (
                <div className="space-y-6 animate-fadeIn w-full">
                  
                  {/* 1. Main Score Panel */}
                  <div className="bg-white p-6 rounded-2xl border border-stone-200 flex items-center justify-between shadow-sm">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">Overall Match Score</h3>
                      <p className="text-xs text-stone-500"> matching status.</p>
                    </div>
                    <div className="text-4xl font-black text-[#D96B27] bg-orange-50/30 border border-orange-100/60 px-5 py-3 rounded-xl shadow-inner">
                      {result.match_score}%
                    </div>
                  </div>

                  {/* 2. Analysis Metrics Grid Layout */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* Areas Needed / Gaps */}
                    <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm space-y-3">
                      <h4 className="text-sm font-bold uppercase tracking-wider text-amber-600 flex items-center gap-1.5">
                        <AlertTriangle size={16} /> Core Needed / Missing Gaps
                      </h4>
                      <p className="text-[11px] text-stone-500">Exact role-critical gaps identified from the job description and resume.</p>
                      <ul className="space-y-2">
                        {result.areas_needed?.map((item, idx) => (
                          <li key={idx} className="text-xs font-medium text-slate-700 bg-stone-50 p-2.5 rounded-xl border border-stone-100 list-none">
                            • {item}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Correctness Checks */}
                    <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm space-y-3">
                      <h4 className="text-sm font-bold uppercase tracking-wider text-blue-600 flex items-center gap-1.5">
                        <Check size={16} /> Where to Modify / Correctness Checks
                      </h4>
                      <p className="text-[11px] text-stone-500">Exact resume elements that already align plus where edits are required.</p>
                      <ul className="space-y-2">
                        {result.correctness_checks?.map((item, idx) => (
                          <li key={idx} className="text-xs font-medium text-slate-700 bg-stone-50 p-2.5 rounded-xl border border-stone-100 list-none">
                            ✔ {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* 3. Strategy Recommendations Row */}
                  <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm space-y-3">
                    <h4 className="text-sm font-bold uppercase tracking-wider text-[#D96B27] flex items-center gap-1.5">
                      <Sparkles size={16} /> Actionable Modification Advice
                    </h4>
                    <p className="text-[11px] text-stone-500">Precise rewrite guidance for the candidate to improve resume alignment.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {result.recommendations?.map((item, idx) => (
                        <p key={idx} className="text-xs font-medium text-slate-600 bg-orange-50/10 border border-orange-100/40 p-3 rounded-xl">
                          {item}
                        </p>
                      ))}
                    </div>
                  </div>

                  {/* 4. Target 100% Score Blueprint Blueprint Section */}
                  <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-slate-100 p-6 rounded-2xl border border-slate-950 shadow-md space-y-4">
                    <div className="border-b border-slate-700/60 pb-3">
                      <h4 className="text-md font-bold tracking-tight text-white flex items-center gap-2">
                          <FileText size={18} className="text-orange-400" /> Resume Rewrite Blueprint
                        </h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">Use these exact structural recommendations and missing keywords to update the resume for this role.</p>
                      <div>
                        <span className="text-[10px] uppercase tracking-widest font-bold text-orange-400 block mb-1">Recommended Structural Framework</span>
                        <p className="text-xs bg-slate-950/40 p-2.5 rounded-xl text-slate-300 border border-slate-800 font-mono">{result.target_resume_format?.structure}</p>
                      </div>

                      <div>
                        <span className="text-[10px] uppercase tracking-widest font-bold text-orange-400 block mb-1">Target Summary Profile Injection</span>
                        <p className="text-xs bg-slate-950/40 p-3 rounded-xl text-slate-300 leading-relaxed italic border border-slate-800">
                          "{result.target_resume_format?.suggested_summary}"
                        </p>
                      </div>

                      <div>
                        <span className="text-[10px] uppercase tracking-widest font-bold text-orange-400 block mb-1">Missing Keyword Extractions to Append</span>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {result.target_resume_format?.skills_to_add?.map((skill, idx) => (
                            <span key={idx} className="text-[10px] font-bold bg-orange-500/10 text-orange-400 border border-orange-500/20 px-2.5 py-1 rounded-md">
                              + {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;