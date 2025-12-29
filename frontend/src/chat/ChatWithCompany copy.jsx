import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';

function ChatWithCompany() {
  const [formData, setFormData] = useState({
    companyName: '',
    numberOfEmployees: '',
    companyGstin: '',
    model: 'gpt-4o'
  });

  const [companyData, setCompanyData] = useState([]);
  const [companyDetails, setCompanyDetails] = useState(null);
  const [companyLoading, setCompanyLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [afterThink, setAfterThink] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);

  const abortControllerRef = useRef(null);
  const streamCompletedRef = useRef(false);

  // Fetch company list
  const handleCompanyData = async () => {
    setCompanyLoading(true);
    try {
      const response = await fetch('http://localhost:3001/api/company-analytics');
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      
      const data = await response.json();
      setCompanyData(data?.data || []);
    } catch (err) {
      console.error('Error fetching company data:', err);
      alert('Failed to fetch company data: ' + err.message);
    } finally {
      setCompanyLoading(false);
    }
  };

  // Fetch company details
  const handleCompanyDetails = async (id) => {
    try {
      const response = await fetch(`http://localhost:3001/api/company-analytics/${id}`);
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      
      const data = await response.json();
      setCompanyDetails(data?.data || null);
    } catch (err) {
      console.error('Error fetching company details:', err);
      setCompanyDetails(null);
    }
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

      const response = await fetch('http://localhost:8081/dual-step-analysis-stream', {
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

  const handleRightSideDrawer = (row) => {
    setSelectedCompany(row);
    setDrawerOpen(true);
    handleCompanyDetails(row.id);
  };

  useEffect(() => {
    handleCompanyData();
  }, []);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [drawerOpen]);

  return (
    <div className="flex flex-col relative">
      <div className="max-w-xl mx-auto mt-10">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">💬 Multi-Model Company Analysis</h2>

        {/* Company Name Input */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Company Name *
          </label>
          <input
            type="text"
            name="companyName"
            value={formData.companyName}
            onChange={handleInputChange}
            placeholder="Enter company name..."
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            required
            disabled={loading || streaming}
          />
        </div>

        {/* Additional Fields */}
        {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Number of Employees (Optional)
            </label>
            <input
              type="text"
              name="numberOfEmployees"
              value={formData.numberOfEmployees}
              onChange={handleInputChange}
              placeholder="e.g., 10000, 50-100..."
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              disabled={loading || streaming}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              GSTIN Number (Optional)
            </label>
            <input
              type="text"
              name="companyGstin"
              value={formData.companyGstin}
              onChange={handleInputChange}
              placeholder="e.g., 29AABCU9603R1ZX"
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              disabled={loading || streaming}
            />
          </div>
        </div> */}

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleSend}
            disabled={(loading || streaming) || !formData.companyName.trim()}
            className={`flex-1 px-5 py-2 rounded-lg text-white font-semibold transition ${
              (loading || streaming) || !formData.companyName.trim()
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'
            }`}
          >
            {loading ? 'Getting Information...' : streaming ? 'Streaming...' : 'Analyze Company'}
          </button>

          {(loading || streaming) && (
            <button
              onClick={handleStop}
              className="px-4 py-2 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 transition"
            >
              Stop
            </button>
          )}

          <button
            onClick={handleClear}
            disabled={loading || streaming}
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition disabled:opacity-50"
          >
            Clear
          </button>
        </div>

        {/* Response Area */}
        <div className="mt-6">
          <strong className="block mb-2 text-gray-700">🧠 Response:</strong>

          {streaming && (
            <div className="mb-4 flex items-center gap-2 text-blue-600 text-sm">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span>Streaming response in real-time...</span>
              <span className="text-xs text-gray-500">({streamingText.length} characters)</span>
            </div>
          )}

          {getDisplayText() && (
            <div className="prose prose-sm max-w-none bg-gray-50 p-4 border border-gray-200 rounded-md">
              <ReactMarkdown>{getDisplayText()}</ReactMarkdown>
              {streaming && (
                <span className="inline-block w-2 h-5 bg-blue-500 animate-pulse ml-1" />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Company Table */}
      <div className="overflow-x-auto mt-5 shadow-lg border-4 border-red-200">
        <h1 className='text-lg text-center'>Company Analysis History</h1>
        {companyLoading ? (
          <div className="text-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading company data...</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  SL. No.
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Company
                </th>
                <th className="hidden md:table-cell px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Model
                </th>
                <th className="hidden md:table-cell px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created At
                </th>
                <th className="hidden lg:table-cell px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Latency
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {companyData.map((row) => (
                <tr
                  key={row.id}
                  className="hover:bg-gray-50 transition-colors duration-200 group"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                    {row.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                          {row?.company_name?.charAt(0)}
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {row.company_name}
                        </div>
                        <div className="md:hidden text-xs text-gray-500">
                          {row.model} • Created: {new Date(row.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      {row.model}
                    </span>
                  </td>
                  <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(row.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </td>
                  <td className="hidden lg:table-cell px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      {row.latency_ms}ms
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleRightSideDrawer(row)}
                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200 group-hover:scale-105"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Right Side Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-[9999] flex" onClick={() => setDrawerOpen(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-md transition-all duration-300"></div>

          <div className="flex-1"></div>
          <div
            className="relative w-full max-w-2xl bg-white shadow-2xl transform transition-all duration-500 ease-out"
            onClick={(e) => e.stopPropagation()}
            style={{
              boxShadow: '-8px 0 40px rgba(0, 0, 0, 0.2), -2px 0 16px rgba(0, 0, 0, 0.1)',
              height: '100vh',
              overflow: 'hidden'
            }}
          >
            {/* Header */}
            <div className="relative bg-gradient-to-r from-slate-900 via-gray-800 to-slate-900 text-white">
              <div className="flex items-center justify-between p-6">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-xl font-bold text-white">
                      {selectedCompany?.company_name?.charAt(0) || 'C'}
                    </span>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight">Company Analytics</h2>
                    <p className="text-gray-300 text-sm opacity-90">
                      AI Analysis Report • {selectedCompany?.model || 'Unknown Model'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setDrawerOpen(false)}
                  className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all duration-200"
                >
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto" style={{ height: 'calc(100vh - 120px)' }}>
              {selectedCompany && companyDetails ? (
                <div className="space-y-6">
                  {/* Company Info Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-100">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Company Details</h3>
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Company Name</p>
                          <p className="text-lg font-semibold text-gray-900">{companyDetails.company_name}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-600">Analysis ID</p>
                          <p className="text-sm text-gray-700 font-mono">#{companyDetails.id}</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-xl border border-green-100">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance</h3>
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Response Time</p>
                          <p className="text-lg font-semibold text-green-700">{companyDetails.latency_ms}ms</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-600">AI Model Used</p>
                          <p className="text-sm text-gray-700 font-mono">{companyDetails.model}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-600">Created At</p>
                          <p className="text-sm text-gray-700">
                            {new Date(companyDetails.created_at).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Analysis Content */}
                  <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
                    <div className="bg-white border-b border-gray-200 px-6 py-4">
                      <h3 className="text-lg font-semibold text-gray-900">AI Analysis Report</h3>
                    </div>
                    <div className="p-6 max-h-96 overflow-y-auto">
                      <div className="prose prose-sm max-w-none">
                        <ReactMarkdown>
                          {companyDetails?.analysis || 'No analysis available'}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    {companyDetails === null ? (
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400"></div>
                    ) : (
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2 2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                      </svg>
                    )}
                  </div>
                  <p className="text-gray-500 text-lg">
                    {companyDetails === null ? 'Loading company details...' : 'No company selected'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ChatWithCompany;
