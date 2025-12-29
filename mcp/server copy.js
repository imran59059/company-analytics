
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { InferenceClient } from "@huggingface/inference";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import fetch from "node-fetch";
import { z } from "zod";
import express from "express";
import cors from 'cors';

dotenv.config();
console.log("🟢 Server is starting...");

// Initialize Hugging Face Inference Client
const hfClient = new InferenceClient(process.env.HF_TOKEN);

// Initialize Google Gemini Client
if (!process.env.GEMINI_API_KEY) {
  console.warn('GEMINI_API_KEY environment variable is not set. Gemini models will not work.');
}
const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;
const geminiModel = genAI ? genAI.getGenerativeModel({ model: "gemini-2.5-flash" }) : null;

// Create Express app
const app = express();
app.use(cors());
app.use(express.json());

// Create the MCP server
const server = new McpServer({
  name: "imran-data",
  version: "1.0.0",
});

// 🟢 Step 2: Query Qwen3 model via Hugging Face
async function queryQwen(prompt = "Hello, who are you Gregorio?") {
  try {
    const chatCompletion = await hfClient.chatCompletion({
      provider: "featherless-ai",
      model: "Qwen/Qwen3-14B",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    return {
      result: chatCompletion.choices[0].message.content,
    };
  } catch (err) {
    console.log("Error in queryQwen:", err);
    return { error: err.message };
  }
}

// NEW: Function to query the Gemini-1.5-Flash model
async function queryGemini(prompt) {
  if (!geminiModel) {
    return { error: "Gemini client not initialized. GEMINI_API_KEY is missing." };
  }
  try {
    const result = await geminiModel.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    return {
      result: text,
    };
  } catch (err) {
    console.error("Error in queryGemini:", err);
    return { error: `Gemini API Error: ${err.message}` };
  }
}

// 🧠 Tool handler using Qwen3
const runQueryQwenModel = async ({ prompt }) => {
  const response = await queryQwen(prompt); // you can use prompt instead if needed
  console.log("response:", response);

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(response),
      },
    ],
  };
};

// MCP Tool handler using Gemini model with multiple parameters
const runQueryGeminiModel = async ({ prompt, numberOfEmployees, companyGstin }) => {

  // Build the templated prompt with multiple variables
  let templatedPrompt = `Act as Business analyst and Give me the details of this company: ${prompt} with the mentioned points. 
  1. Nature of business and details of business.
  2. Revenue
  3. PAT
  4. Number of Employee
  5. Revenue per employee
  6. Profit per employee
  7. Summarry of negative reviews from various platforms
  8. comparison with Industry benchmark
  9. Employee Engagement
  10. Areas to grow with wazo pulse. (https://wazopulse.com).
  11. If the company information is not found, then respond with a clear statement that the information is not available.
  `;

  if (numberOfEmployees) {
    templatedPrompt += ` with number ${numberOfEmployees} employees`;
  }

  if (companyGstin) {
    templatedPrompt += ` and GSTIN number: ${companyGstin}`;
  }

  console.log(`Received prompt for Gemini: "${templatedPrompt}"`);
  const response = await queryGemini(templatedPrompt);
  console.log("Gemini response:", response);

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(response),
      },
    ],
  };
};


server.tool(
  "queryQwenModel",
  {
    prompt: z.string().describe("Your question to the LLaMA model"),
  },
  runQueryQwenModel
);

// NEW: Register Gemini MCP Tool
server.tool(
  "queryGeminiModel",
  {
    prompt: z.string().describe("Company name to query"),
    numberOfEmployees: z.string().optional().describe("Number of employees in the company"),
    companyGstin: z.string().optional().describe("Company GSTIN number")
  },
  runQueryGeminiModel
);

// Express route for Postman
app.post("/query", async (req, res) => {
  const { prompt } = req.body;
  try {
    const result = await runQueryQwenModel({ prompt });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// NEW: Express route for Postman to query Gemini
app.post("/gemini-query", async (req, res) => {
  const { prompt, numberOfEmployees, companyGstin } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: "Missing 'prompt' in request body." });
  }
  try {
    const result = await runQueryGeminiModel({ prompt, numberOfEmployees, companyGstin });
    res.json(result);
  } catch (err) {
    console.error("Error in /gemini-query Express endpoint:", err);
    res.status(500).json({ error: err.message });
  }
});

// Set transport
async function init() {
  const transport = new StreamableHTTPServerTransport({
    port: 8081,
    host: "localhost",
  });
  await server.connect(transport);
  app.listen(8081, () => {
    console.log("🟢 HTTP Server running on http://localhost:8081/query");
  });
}

init().catch(console.error);