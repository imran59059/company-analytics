import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { useNavigate } from 'react-router-dom';
import {
  BuildingOffice2Icon,
  ChartBarIcon,
  ClockIcon,
  CpuChipIcon,
  EyeIcon,
  PlayIcon,
  StopIcon,
  XMarkIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import SimpleDrawer from '../components/Drawer';

function ChatWithCompany() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    companyName: '',
    numberOfEmployees: '',
    companyGstin: '',
    model: 'gpt-4o'
  });

  const [selectedCompany, setSelectedCompany] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const openDrawer = (company) => {
    setSelectedCompany(company);
    setIsDrawerOpen(true);
  };

  const closeDrawer = () => {
    setIsDrawerOpen(false);
    setTimeout(() => setSelectedCompany(null), 300);
  };

  const [companyData, setCompanyData] = useState([]);
  const [companyLoading, setCompanyLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [afterThink, setAfterThink] = useState('');

  const abortControllerRef = useRef(null);
  const streamCompletedRef = useRef(false);

  // Fetch company list
  const handleCompanyData = async () => {
    setCompanyLoading(true);
    try {
      const response = await fetch('http://localhost:3001/api/company-analytics');
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

      const data = await response.json();
      console.log({ data });
      setCompanyData(data?.data || []);
    } catch (err) {
      console.error('Error fetching company data:', err);
      alert('Failed to fetch company data: ' + err.message);
    } finally {
      setCompanyLoading(false);
    }
  };

  // Navigate to company details page
  const handleViewCompany = (companyId, companyName) => {
    console.log({ companyId });
    navigate(`/company-details/${companyId}`, {
      state: {
        companyName: companyName,
        fromAnalytics: true
      }
    });
  };

  // Cleanup streams
  const cleanupStreams = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    streamCompletedRef.current = false;
  };

  // Clear response states
  const clearResponseStates = () => {
    setStreamingText('');
    setAfterThink('');
  };

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Finalize streaming content
  const finalizeStreamingContent = (text) => {
    setAfterThink(text);
    setStreaming(false);
    handleCompanyData();
  };

  // Streaming implementation
  const handleStreamingWithFetch = async () => {
    clearResponseStates();
    setStreaming(true);
    streamCompletedRef.current = false;

    try {
      abortControllerRef.current = new AbortController();

      // const response = await fetch('http://localhost:8081/dual-step-analysis-stream', {
      const response = await fetch('http://localhost:8081/tri-step-analysis-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: formData.companyName,
          numberOfEmployees: formData.numberOfEmployees,
          companyGstin: formData.companyGstin,
          model: formData.model
        }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = '';

      while (!streamCompletedRef.current) {
        const { done, value } = await reader.read();

        if (done) {
          if (accumulatedText) finalizeStreamingContent(accumulatedText);
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data.trim()) {
              try {
                const parsed = JSON.parse(data);

                if (parsed.error) {
                  setAfterThink('Error: ' + parsed.error);
                  streamCompletedRef.current = true;
                  setStreaming(false);
                  break;
                }

                if (parsed.done) {
                  streamCompletedRef.current = true;
                  finalizeStreamingContent(accumulatedText);
                  break;
                }

                if (parsed.text && !streamCompletedRef.current) {
                  accumulatedText += parsed.text;
                  setStreamingText(accumulatedText);
                }
              } catch (parseErr) {
                console.error('Failed to parse JSON:', parseErr);
              }
            }
          }
        }

        if (streamCompletedRef.current) break;
      }

      reader.releaseLock();
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Streaming fetch error:', err);
        setAfterThink('Error: ' + err.message);
        setStreaming(false);
      }
    } finally {
      abortControllerRef.current = null;
      streamCompletedRef.current = false;
    }
  };

  // Main send handler
  const handleSend = async () => {
    if (!formData.companyName.trim()) {
      alert('Please enter a company name');
      return;
    }
    cleanupStreams();
    await handleStreamingWithFetch();
  };

  // Stop streaming
  const handleStop = () => {
    streamCompletedRef.current = true;
    if (streamingText) finalizeStreamingContent(streamingText);
    cleanupStreams();
    setStreaming(false);
    setLoading(false);
  };

  // Clear form
  const handleClear = () => {
    cleanupStreams();
    setFormData({
      companyName: '',
      numberOfEmployees: '',
      companyGstin: '',
      model: formData.model
    });
    clearResponseStates();
    setStreaming(false);
    setLoading(false);
  };

  // Get display text
  const getDisplayText = () => {
    return afterThink || streamingText || '';
  };

  useEffect(() => {
    handleCompanyData();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8">

        {/* Hero Section - Analysis Form */}
        <div className="mb-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-2xl mb-4 shadow-lg">
              <SparklesIcon className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-slate-800 mb-2">AI Company Analysis</h1>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Get comprehensive business insights powered by Wazopulse
            </p>
          </div>

          {/* Analysis Form Card */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 p-8 max-w-2xl mx-auto">
            <div className="space-y-6">
              {/* Company Name Input */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Company Name *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <BuildingOffice2Icon className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleInputChange}
                    placeholder="Enter company name..."
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 text-slate-800 placeholder-slate-400"
                    required
                    disabled={loading || streaming}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleSend}
                  disabled={(loading || streaming) || !formData.companyName.trim()}
                  className={`flex-1 flex items-center justify-center px-6 py-3 rounded-xl text-white font-semibold transition-all duration-200 transform ${(loading || streaming) || !formData.companyName.trim()
                    ? 'bg-slate-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 hover:shadow-lg hover:-translate-y-0.5'
                    }`}
                >
                  {streaming ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                      Analyzing...
                    </>
                  ) : loading ? (
                    <>
                      <div className="animate-pulse mr-2">⏳</div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <PlayIcon className="h-4 w-4 mr-2" />
                      Analyze Company
                    </>
                  )}
                </button>

                {(loading || streaming) && (
                  <>
                    <button
                      onClick={handleStop}
                      className="px-4 py-3 rounded-xl bg-red-500 text-white font-semibold hover:bg-red-600 transition-all duration-200 flex items-center"
                    >
                      <StopIcon className="h-4 w-4 mr-2" />
                      Stop
                    </button>
                  </>
                )}
                <button
                  onClick={handleClear}
                  disabled={loading || streaming}
                  className="px-4 py-3 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 transition-all duration-200 disabled:opacity-50 flex items-center"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
          {getDisplayText() && (
            <SimpleDrawer
              streamingText={streamingText}
              title={formData.companyName ? formData.companyName : "AI Analysis Result"}
              content={getDisplayText()}
              streaming={streaming}
            />
          )}
        </div>

        {/* Company Analysis History */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 overflow-hidden">
          <div className="bg-gradient-to-r from-slate-50 to-blue-50 px-6 py-4 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <ChartBarIcon className="h-6 w-6 text-indigo-600 mr-3" />
                <h2 className="text-xl font-bold text-slate-800">Analysis History</h2>
              </div>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800">
                {companyData.length} analyses
              </span>
            </div>
          </div>

          {companyLoading ? (
            <div className="text-center p-12">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-100 border-t-indigo-600 mx-auto mb-4"></div>
              <p className="text-slate-600 font-medium">Loading analysis history...</p>
            </div>
          ) : companyData.length === 0 ? (
            <div className="text-center p-12">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <ChartBarIcon className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-slate-600 font-medium">No analysis history yet</p>
              <p className="text-slate-400 text-sm mt-1">Start by analyzing your first company above</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Company
                    </th>
                    <th className="hidden md:table-cell px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Model
                    </th>
                    <th className="hidden lg:table-cell px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Performance
                    </th>
                    <th className="hidden md:table-cell px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {companyData.map((row, index) => (
                    <tr
                      key={row.id}
                      className="hover:bg-slate-50 transition-colors duration-200 cursor-pointer group"
                      onClick={() => handleViewCompany(row.uuid, row.company_name)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm shadow-md">
                              {row?.company_name?.charAt(0)}
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors">
                              {row.company_name}
                            </div>
                            <div className="md:hidden text-xs text-slate-500 mt-1">
                              {row.model} • {new Date(row.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="hidden md:table-cell px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                          <CpuChipIcon className="w-3 h-3 mr-1" />
                          {row.model}
                        </span>
                      </td>
                      <td className="hidden lg:table-cell px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                          <ClockIcon className="w-3 h-3 mr-1" />
                          {(() => {
                            const ms = row.latency_ms;
                            if (ms < 1000) return `${ms}ms`;
                            const totalSeconds = Math.floor(ms / 1000);
                            if (totalSeconds < 60) return `${totalSeconds}s`;
                            const minutes = Math.floor(totalSeconds / 60);
                            const seconds = totalSeconds % 60;
                            return `${minutes}m ${seconds}s`;
                          })()}
                        </span>
                      </td>
                      <td className="hidden md:table-cell px-6 py-4 text-sm text-slate-500">
                        {new Date(row.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewCompany(row.uuid, row.company_name);
                          }}
                          className="inline-flex items-center px-3 py-1.5 bg-indigo-100 text-indigo-700 text-xs font-medium rounded-lg hover:bg-indigo-200 transition-all duration-200 transform hover:scale-105"
                        >
                          <EyeIcon className="w-4 h-4 mr-1" />
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>


    </div>
  );
}

export default ChatWithCompany;
