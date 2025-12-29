import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';

function ChatBot() {
  const [input, setInput] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return; // prevent empty send
    setResponse('');
    setLoading(true);

    try {
      const res = await fetch('http://localhost:3000/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: input }],
          context: { instructions: 'You are a helpful assistant.' }
        }),
      });

      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        setResponse(prev => prev + chunk);
      }

    } catch (err) {
      console.error('Stream error:', err);
      setResponse('❌ Error fetching response.');
    }

    setLoading(false);
  };

  return (
    <div className="max-w-xl mx-auto mt-10">
          <h2 className="text-2xl font-bold mb-4 text-gray-800">💬 Chat with LLaMA 3</h2>
    
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
            className={`mt-4 px-5 py-2 rounded-lg text-white font-semibold transition ${
              loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {loading ? 'Thinking...' : 'Send'}
          </button>
    
          <div className="mt-6">
            <strong className="block mb-2">🧠 Response:</strong>
            <div className="mt-2 prose prose-sm max-w-none">
              <ReactMarkdown>{response}</ReactMarkdown>
            </div>
          </div>
        </div>
  );
}

export default ChatBot;
