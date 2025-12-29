import axios from 'axios';
import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';

function ChatGemini() {
  const [input, setInput] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    console.log('clicked...');
    setLoading(true);
    try {
      const res = await axios.post(
        'http://localhost:8080/',
        { prompt: input },
        { headers: { 'Content-Type': 'application/json' } }
      );

      console.log('🟢');
      console.log({ res });
      const rawText = res.data || '';

      console.log({ rawText });

      let resultText = '';
      try {
        const parsed = JSON.parse(rawText);
        resultText = parsed.result || rawText;
      } catch {
        resultText = rawText;
      }

      setResponse(resultText);
    } catch (err) {
      console.error('❌ Fetch Error:', err.message, err.stack);
      alert('Fetch error: ' + err.message);
      setResponse('Error fetching response.');
    }
    setLoading(false);
  };

  return (
    <div className="max-w-xl mx-auto mt-10">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">💬 Chat with Database - gemini-2.5-flash</h2>

      <textarea
        rows={3}
        value={input}
        onChange={e => setInput(e.target.value)}
        placeholder="Type your question..."
        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
      />

      <button
        onClick={handleSend}
        disabled={loading}
        className={`mt-4 px-5 py-2 rounded-lg font-semibold transition ${loading ? 'flex gap-5 border bg-green-100 cursor-not-allowed text-gray-400' : 'bg-green-500 hover:bg-blue-700 text-white'}`}
      >
        {loading ? 'Thinking...' : 'Send'}
        {loading && 
        <span class="relative flex size-3">
          <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
          <span class="relative inline-flex size-3 rounded-full bg-green-500"></span>
        </span>}
      </button>

      <div className="mt-6">
        <strong className="block mb-2 text-gray-700">🧠 Response:</strong>
        {response && (
          <div className="prose prose-sm max-w-none bg-gray-50 p-4 border border-gray-200 rounded-md">
            <ReactMarkdown>{response}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}

export default ChatGemini;