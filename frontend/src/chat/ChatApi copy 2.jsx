import axios from 'axios';
import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';

function ChatBotApi() {
  const [input, setInput] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [thinkText, setThinkText] = useState('');
  const [afterThink, setAfterThink] = useState('');
  const [showThinking, setShowThinking] = useState(false);

  // const handleSend = async () => {
  //   setLoading(true);
  //   try {
  //     const res = await fetch('https://mcp-server-production-ddae.up.railway.app/query', {
  //       method: 'POST',
  //       headers: { 'Content-Type': 'application/json' },
  //       body: JSON.stringify({ prompt: input }),
  //     });

  //     const data = await res.json();
  //     const rawText = data.content?.[0]?.text || "";

  //     let resultText = '';
  //     try {
  //       const parsed = JSON.parse(rawText);
  //       resultText = parsed.result;
  //     } catch {
  //       resultText = rawText;
  //     }

  //     const thinkMatch = resultText.match(/<think>([\s\S]*?)<\/think>/);
  //     const think = thinkMatch ? thinkMatch[1].trim() : '';
  //     const after = resultText.split('</think>').pop().trim();

  //     setThinkText(think);
  //     setAfterThink(after);
  //     setShowThinking(false); // open accordion by default
  //   } catch (err) {
  //     console.error('Error:', err);
  //     setThinkText('');
  //     setAfterThink('Error fetching response.');
  //   }
  //   setLoading(false);
  // };


  const handleSend = async () => {
    setLoading(true);
    try {
      // const res = await fetch('https://mcp-server-production-ddae.up.railway.app/query', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ prompt: input }),
      // });

      // const data = await res.json();
      const res = await axios.post(
        'https://mcp-server-production-ddae.up.railway.app/query',
        { prompt: input },
        { headers: { 'Content-Type': 'application/json' } }
      );

      console.log({res});
      const rawText = res.data.content?.[0]?.text || "";

      console.log({rawText});

      let resultText = '';
      try {
        const parsed = JSON.parse(rawText);
        resultText = parsed.result;
      } catch {
        resultText = rawText;
      }

      const thinkMatch = resultText.match(/<think>([\s\S]*?)<\/think>/);
      const think = thinkMatch ? thinkMatch[1].trim() : '';
      const after = resultText.split('</think>').pop().trim();

      setThinkText(think);
      setAfterThink(after);
      setShowThinking(false); // open accordion by default
    } catch (err) {
      console.error('❌ Fetch Error:', err.message, err.stack);
      alert('Fetch error: ' + err.message); // ✅ shows error message on mobile screen
      setThinkText('');
      setAfterThink('Error fetching response.');
    }
    setLoading(false);
  };


  return (
    <div className="max-w-xl mx-auto mt-10">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">💬 Chat with Qwen3 - Huggingface</h2>

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
        className={`mt-4 px-5 py-2 rounded-lg text-white font-semibold transition ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
          }`}
      >
        {loading ? 'Thinking...' : 'Send'}
      </button>

      <div className="mt-6">
        <strong className="block mb-2 text-gray-700">🧠 Response:</strong>

        {/* Accordion for <think> */}
        {thinkText && (
          <div className="mb-4 border border-gray-300 rounded-md">
            <button
              onClick={() => setShowThinking(prev => !prev)}
              className="w-full text-left px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-t-md font-medium text-sm text-gray-700"
            >
              {showThinking ? '▼ Thinking (click to hide)' : '▶ Thinking (click to view)'}
            </button>
            {showThinking && (
              <div className="p-4 bg-white text-sm text-gray-800 border-t border-gray-200">
                <ReactMarkdown>{thinkText}</ReactMarkdown>
              </div>
            )}
          </div>
        )}

        {/* Final Answer */}
        {afterThink && (
          <div className="prose prose-sm max-w-none bg-gray-50 p-4 border border-gray-200 rounded-md">
            {/* <h3>✅ Final Answer</h3> */}
            <ReactMarkdown>{afterThink}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}

export default ChatBotApi;
