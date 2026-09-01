import React, { useState, useEffect } from 'react';
import axios from 'axios';

// Automatically targets local server during development and Render URL in production
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function App() {
  const [resume, setResume] = useState(null);
  const [jobDesc, setJobDesc] = useState('');
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const { data } = await axios.get(`${API_BASE_URL}/api/history`);
      setHistory(data);
    } catch (err) {
      console.error('Error fetching history:', err);
    }
  };

  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (!resume || !jobDesc) {
      alert('Please upload a resume PDF and enter a job description.');
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('resume', resume);
    formData.append('jobDescription', jobDesc);

    try {
      const { data } = await axios.post(`${API_BASE_URL}/api/analyze`, formData);
      setResult(data);
      fetchHistory();
    } catch (err) {
      console.error(err);
      alert('Error analyzing resume. Please check your network and inputs.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-10 font-sans">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Left Column: Analyzer Engine Form */}
        <div className="md:col-span-2 bg-white p-6 md:p-8 rounded-xl shadow-sm border border-gray-100">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">AI Resume & Job Matcher</h1>
          
          <form onSubmit={handleAnalyze} className="space-y-5">
            <div>
              <label className="block font-medium text-gray-700 mb-1">Upload Resume (PDF):</label>
              <input 
                type="file" 
                accept=".pdf" 
                onChange={(e) => setResume(e.target.files[0])} 
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer" 
              />
            </div>

            <div>
              <label className="block font-medium text-gray-700 mb-1">Paste Job Description:</label>
              <textarea 
                rows="6" 
                value={jobDesc} 
                onChange={(e) => setJobDesc(e.target.value)} 
                placeholder="Paste the target job description here..."
                className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm" 
              />
            </div>

            <button 
              type="submit" 
              disabled={loading} 
              className="w-full bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 shadow-sm"
            >
              {loading ? 'Analyzing with Gemini...' : 'Analyze Match'}
            </button>
          </form>

          {result && (
            <div className="mt-8 border-t border-gray-100 pt-6 space-y-5 animate-fade-in">
              <div className="flex items-center justify-between bg-blue-50/60 p-4 rounded-lg border border-blue-100">
                <h2 className="text-base font-bold text-blue-900">Overall Match Score</h2>
                <span className="text-2xl font-extrabold text-blue-600">{result.matchScore}%</span>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900">Summary</h3>
                <p className="text-gray-600 mt-1 text-sm leading-relaxed">{result.summary}</p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900">Identified Gaps</h3>
                <ul className="list-disc pl-5 mt-1 text-gray-600 text-sm space-y-1">
                  {result.gaps.map((gap, i) => <li key={i}>{gap}</li>)}
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900">Recommendations</h3>
                <ul className="list-disc pl-5 mt-1 text-gray-600 text-sm space-y-1">
                  {result.recommendations.map((rec, i) => <li key={i}>{rec}</li>)}
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Database Scan History */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-fit">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Past Scans</h2>
          {history.length === 0 ? (
            <p className="text-sm text-gray-500">No past analyses recorded in PostgreSQL.</p>
          ) : (
            <div className="space-y-3">
              {history.map((item) => (
                <div key={item.id} className="border border-gray-100 bg-gray-50/50 p-3 rounded-lg hover:bg-gray-50 transition">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[11px] text-gray-400">
                      {new Date(item.created_at).toLocaleDateString()}
                    </span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                      item.match_score >= 75 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {item.match_score}% Match
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 line-clamp-2">{item.summary}</p>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}