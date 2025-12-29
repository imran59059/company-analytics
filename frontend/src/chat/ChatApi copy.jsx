import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';

function ChatBotApi() {
  const [input, setInput] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
  setLoading(true);
  try {
    const res = await fetch('http://localhost:8081/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({prompt: input})
    });

    const data = await res.json();
    const rawText = data.content?.[0]?.text || "";

    // 🔍 Parse the outer JSON string
    let resultText = "";
    try {
      const parsed = JSON.parse(rawText); // { result: "<think>...</think> [Final Answer] ..." }
      resultText = parsed.result;
    } catch {
      resultText = rawText;
    }

    // 🧠 Extract <think> section
    const thinkMatch = resultText.match(/<think>([\s\S]*?)<\/think>/);
    const thinkText = thinkMatch ? thinkMatch[1].trim() : '';

    // ✅ Extract everything after </think>
    const afterThink = resultText.split("</think>").pop().trim();

    // 📦 Compose clean markdown response
    const fullResponse = `### 🤔 Thinking\n\n${thinkText}\n\n---\n\n### ✅ Final Answer\n\n${afterThink}`;
    setResponse(fullResponse);

    console.log("🧠 Thinking:", thinkText);
    console.log("✅ Final Answer:", afterThink);
  } catch (err) {
    console.error('Error:', err);
    setResponse('Error fetching response.');
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

export default ChatBotApi;
