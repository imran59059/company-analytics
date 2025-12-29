import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import OpenAI from "openai";
import { pool } from "./db.js";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

// Load environment variables
dotenv.config();
console.log("🟢 Enhanced Business Analytics Server is starting (JS)...");

// Initialize OpenAI client
const openAIClient = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;
if (!openAIClient) {
  console.warn("⚠️ OPENAI_API_KEY environment variable is not set. OpenAI analysis will not work.");
}

// Initialize Express application
const expressApp = express();
expressApp.use(cors());
expressApp.use(express.json());

// Initialize MCP server
const mcpServer = new McpServer({
  name: "enhanced-business-analytics-server",
  version: "3.0.0",
});

// ----------------------------- HELPER FUNCTIONS -----------------------------

// Helper function to check if company was found
function isCompanyNotFound(content) {
  const notFoundPatterns = [
    /COMPANY_NOT_FOUND:/i,
    /not available|no information found|unable to find|could not locate/i,
    /does not appear to|doesn't appear to|no such company/i,
    /please verify|please check|invalid company/i,
    /no reliable information|cannot find basic information/i,
  ];

  return notFoundPatterns.some(pattern => pattern.test(content));
}

// -------------------------- ENHANCED PROMPT BUILDERS --------------------------

function buildCompanyDetailsPrompt(companyName) {
  let prompt = `You are a business research analyst. Find and provide factual information about: ${companyName}

**Required Information:**
1. Business nature & primary operations
2. Annual revenue (latest available)
3. Profit After Tax (PAT)
4. Employee count
5. Revenue per employee calculation
6. Profit per employee calculation
7. Common employee complaints (from Glassdoor, AmbitionBox, Indeed)
8. Industry benchmark comparison (brief)
9. Employee engagement level
10. Growth opportunities with Wazo Pulse (https://wazopulse.com)

**Search Strategy:**
- Check official website, LinkedIn, Crunchbase, financial reports
- For Indian companies: Check MCA, Tofler, Zaubacorp
- For global companies: Check SEC filings, Bloomberg, Reuters

**Output Format:**
- Use bullet points for clarity
- Include data sources where available
- If data unavailable, state "Data not publicly available" for that field
- Keep each point to 1-2 lines maximum

**CRITICAL:** If you cannot find basic information about this company (name, industry, website), respond with exactly: "COMPANY_NOT_FOUND: Unable to locate reliable information about ${companyName}. Please verify the company name."`;

  return prompt;
}

function buildCompanySummaryPrompt(companyName, companyDetails) {
  return `You are a professional business analyst. Write a short factual summary of the company **${companyName}** based on the details below.

**COMPANY DETAILS:**
${companyDetails}

**SUMMARY RULES:**
- Write one concise paragraph (80–120 words)
- Mention industry, operations, revenue, employee size, and market presence
- Keep it objective and data-based (no assumptions)
- Professional tone
- No headings or bullet points`;
}

function buildCompanyVoicePrompt(companyName) {
  return `Analyze employee reviews of ${companyName} from Glassdoor, AmbitionBox, Indeed, and other platforms.

**Task:** Extract 8-12 most common complaints and map each to relevant Wazo Pulse solutions.

**Available Solutions:**
1. Recognition, 2. Badges, 3. Award, 4. Anonymous feedback, 5. Growth conversation, 
6. OKR and Goals, 7. 360 Feedback, 8. Public feed page

**Output Format (STRICT):**
<complaint description> ✅ <solution number(s)>

**Examples:**
- Lack of employee recognition ✅ Recognition, Award, Badges
- Insufficient feedback mechanisms ✅ Anonymous feedback, 360 Feedback
- Limited career growth ✅ Growth conversation, OKR and Goals

**Rules:**
- One line per complaint
- Use ✅ as separator
- Map to solutions from list only
- No explanations or extra text
- 8-12 items maximum
- Order by frequency/severity

Company: ${companyName}`;
}

// ----------------------------- STEP 1 -----------------------------
// Get company details using OpenAI
async function* getCompanyDetailsWithOpenAI(companyName) {
  if (!openAIClient) {
    yield { error: "OpenAI client not initialized. OPENAI_API_KEY is missing." };
    return;
  }

  try {
    const detailsPrompt = buildCompanyDetailsPrompt(companyName);

    const streamingResponse = await openAIClient.chat.completions.create({
      model: "gpt-5",
      messages: [{ role: "user", content: detailsPrompt }],
      stream: true,
      temperature: 1,
      // max_tokens: 1500,
      max_completion_tokens: 1500,
    });

    let fullContent = "";
    let charCount = 0;

    for await (const responseChunk of streamingResponse) {
      const chunkContent = responseChunk.choices?.[0]?.delta?.content;
      if (chunkContent) {
        fullContent += chunkContent;
        charCount += chunkContent.length;

        // Stream the content
        yield { result: chunkContent, done: false, step: 1 };

        // Early detection of company not found (check after first 200 chars)
        if (charCount > 200 && isCompanyNotFound(fullContent)) {
          yield {
            result: "\n\n⚠️ Company information not found. Please verify the company name.",
            done: true,
            step: 1,
            notFound: true,
          };
          return;
        }
      }
    }

    // Final check
    if (isCompanyNotFound(fullContent)) {
      yield {
        result: "\n\n⚠️ No reliable company information available.",
        done: true,
        step: 1,
        notFound: true,
      };
      return;
    }

    yield { done: true, step: 1 };
  } catch (error) {
    console.error("❌ Error in getCompanyDetailsWithOpenAI:", error);
    yield { error: `OpenAI API Error (Step 1): ${error.message}` };
  }
}

// ----------------------------- STEP 2 -----------------------------
// Strategic analysis based on Step 1 details
async function* generateAnalysisWithCompanyDetails(companyName, companyDetails) {
  if (!openAIClient) {
    yield { error: "OpenAI client not initialized. OPENAI_API_KEY is missing." };
    return;
  }

  try {
    const companySummaryPrompt = buildCompanySummaryPrompt(companyName, companyDetails);

    const streamingResponse = await openAIClient.chat.completions.create({
      model: "gpt-5",
      messages: [{ role: "user", content: companySummaryPrompt }],
      stream: true,
      temperature: 1,
      // max_tokens: 300,
      max_completion_tokens: 300,
    });

    for await (const responseChunk of streamingResponse) {
      const chunkContent = responseChunk.choices?.[0]?.delta?.content;
      if (chunkContent) {
        yield { result: chunkContent, done: false, step: 2 };
      }
    }

    yield { done: true, step: 2 };
  } catch (error) {
    console.error("❌ Error in generateAnalysisWithCompanyDetails:", error);
    yield { error: `OpenAI API Error (Step 2): ${error.message}` };
  }
}

// ----------------------------- STEP 3 -----------------------------
// Company voice: objective negative reviews summary + mapping + green ticks
async function* generateCompanyVoiceReviews(companyName) {
  if (!openAIClient) {
    yield { error: "OpenAI client not initialized. OPENAI_API_KEY is missing." };
    return;
  }

  try {
    const companyVoicePrompt = buildCompanyVoicePrompt(companyName);

    const streamingResponse = await openAIClient.chat.completions.create({
      model: "gpt-5",
      messages: [{ role: "user", content: companyVoicePrompt }],
      stream: true,
      temperature: 1,
      // max_tokens: 800,
      max_completion_tokens: 800,
    });

    for await (const responseChunk of streamingResponse) {
      const chunkContent = responseChunk.choices?.[0]?.delta?.content;
      if (chunkContent) {
        yield { result: chunkContent, done: false, step: 3 };
      }
    }

    yield { done: true, step: 3 };
  } catch (error) {
    console.error("❌ Error in generateCompanyVoiceReviews:", error);
    yield { error: `OpenAI API Error (Step 3): ${error.message}` };
  }
}

// ------------------------- TRI-STEP PIPELINE -------------------------
async function* generateTriStepAnalysis(companyName) {
  let companyDetails = "";

  console.log(`🔍 Step 1: Gathering company details for ${companyName}`);

  for await (const chunk of getCompanyDetailsWithOpenAI(companyName)) {
    if (chunk.error) {
      yield chunk;
      return;
    }

    if (chunk.result) {
      companyDetails += chunk.result;
      yield { result: chunk.result, step: 1, done: false };
    }

    if (chunk.notFound) {
      yield {
        result: "❌ Analysis skipped. Company information could not be found.",
        step: 3,
        done: true,
        finalStep: true,
      };
      return;
    }

    if (chunk.done) {
      yield { step: 1, done: true, stepComplete: "Company details gathered successfully" };
      break;
    }
  }

  yield { transition: "Processing company details for comprehensive analysis...", step: "transition-1-2" };

  console.log(`📊 Step 2: Generating comprehensive analysis for ${companyName}`);

  for await (const chunk of generateAnalysisWithCompanyDetails(companyName, companyDetails)) {
    if (chunk.error) {
      yield chunk;
      return;
    }

    if (chunk.result) {
      yield { result: chunk.result, step: 2, done: false };
    }

    if (chunk.done) {
      yield { step: 2, done: true, stepComplete: "Comprehensive analysis completed" };
      break;
    }
  }

  yield { transition: "Generating company voice review summary...", step: "transition-2-3" };

  console.log(`🗣️ Step 3: Generating company voice reviews for ${companyName}`);

  for await (const chunk of generateCompanyVoiceReviews(companyName)) {
    if (chunk.error) {
      yield chunk;
      return;
    }

    if (chunk.result) {
      yield { result: chunk.result, step: 3, done: false };
    }

    if (chunk.done) {
      yield { step: 3, done: true, stepComplete: "Company voice reviews completed", finalStep: true };
      break;
    }
  }
}

// ----------------------------- MCP TOOL -----------------------------
const processTriStepAnalysisRequest = async ({ prompt: companyName }) => {
  console.log(`📊 Processing tri-step analysis for: "${companyName}"`);

  let companyDetails = "";
  let finalAnalysis = "";
  let companyVoice = "";

  for await (const chunk of generateTriStepAnalysis(companyName)) {
    if (chunk.error) return { content: [{ type: "text", text: chunk.error }] };

    if (chunk.result) {
      if (chunk.step === 1) {
        companyDetails += chunk.result;
      } else if (chunk.step === 2) {
        finalAnalysis += chunk.result;
      } else if (chunk.step === 3) {
        companyVoice += chunk.result;
      }
    }
  }

  const combinedResult = `**STEP 1: COMPANY DETAILS**\n${companyDetails}\n\n**STEP 2: COMPREHENSIVE ANALYSIS**\n${finalAnalysis}\n\n**STEP 3: COMPANY VOICE REVIEWS**\n${companyVoice}`;

  console.log("✅ Tri-step analysis completed");
  return { content: [{ type: "text", text: combinedResult }] };
};

// Register enhanced MCP tool
mcpServer.tool(
  "analyzeTriStepCompanyBusiness",
  {
    prompt: z.string().describe("Company name to analyze"),
  },
  processTriStepAnalysisRequest
);

// ----------------------------- HTTP SSE (TRI-STEP) -----------------------------
expressApp.post("/tri-step-analysis-stream", async (req, res) => {
  const { prompt: companyName } = req.body;

  if (!companyName) {
    return res.status(400).json({ error: "Missing 'prompt' (company name) in request body." });
  }

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
  });

  try {
    let companyDetails = "";
    let finalAnalysis = "";
    let companyVoice = "";
    const analysisStartTime = Date.now();

    const analysisUuid = uuidv4();
    console.log(`🔍 Starting tri-step analysis for company: ${companyName} with UUID: ${analysisUuid}`);

    for await (const chunk of generateTriStepAnalysis(companyName)) {
      if (chunk.error) {
        res.write(`data: ${JSON.stringify({ error: chunk.error })}\n\n`);
        break;
      }

      if (chunk.transition) {
        res.write(
          `data: ${JSON.stringify({
            transition: chunk.transition,
            step: chunk.step,
            message:
              chunk.step === "transition-1-2"
                ? "Moving to comprehensive analysis phase..."
                : "Moving to company voice review phase...",
          })}\n\n`
        );
        continue;
      }

      if (chunk.stepComplete) {
        res.write(
          `data: ${JSON.stringify({
            stepComplete: chunk.stepComplete,
            step: chunk.step,
            finalStep: chunk.finalStep || false,
          })}\n\n`
        );
        continue;
      }

      if (chunk.result) {
        if (chunk.step === 1) companyDetails += chunk.result;
        else if (chunk.step === 2) finalAnalysis += chunk.result;
        else if (chunk.step === 3) companyVoice += chunk.result;

        res.write(
          `data: ${JSON.stringify({
            text: chunk.result,
            step: chunk.step,
            stepName:
              chunk.step === 1
                ? "Company Research"
                : chunk.step === 2
                  ? "Strategic Analysis"
                  : "Company Voice Reviews",
            uuid: analysisUuid,
          })}\n\n`
        );
      }

      if (chunk.done && chunk.finalStep) {
        res.write(
          `data: ${JSON.stringify({
            done: true,
            allStepsComplete: true,
            analysisUuid: analysisUuid,
          })}\n\n`
        );
        break;
      }
    }

    const analysisLatency = Date.now() - analysisStartTime;

    // Persist data (removed number_of_employees and company_gstin columns)
    await pool.execute(
      `INSERT INTO company_analytc 
        (uuid, company_name, model, latency_ms, analysis, company_details, reviews, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        analysisUuid,
        companyName,
        "openai-gpt-5",
        analysisLatency,
        finalAnalysis || "❌ No comprehensive analysis generated because company information was not found.",
        companyDetails || "⚠️ No company details available.",
        companyVoice || "⚠️ No reviews summary available.",
      ]
    );

    console.log(`✅ Tri-step analysis completed for ${companyName} with UUID: ${analysisUuid} in ${analysisLatency}ms`);
    res.end();
  } catch (error) {
    console.error("❌ Error in /tri-step-analysis-stream:", error);
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
});

// ----------------------------- HTTP SSE (DUAL-STEP) -----------------------------
expressApp.post("/dual-step-analysis-stream", async (req, res) => {
  const { prompt: companyName } = req.body;

  if (!companyName) {
    return res.status(400).json({ error: "Missing 'prompt' (company name) in request body." });
  }

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
  });

  try {
    let companyDetails = "";
    let finalAnalysis = "";
    const analysisStartTime = Date.now();

    const analysisUuid = uuidv4();
    console.log(`🔍 Starting dual-step analysis for company: ${companyName} with UUID: ${analysisUuid}`);

    for await (const chunk of generateTriStepAnalysis(companyName)) {
      if (chunk.error) {
        res.write(`data: ${JSON.stringify({ error: chunk.error })}\n\n`);
        break;
      }

      if (chunk.transition) {
        res.write(
          `data: ${JSON.stringify({
            transition: chunk.transition,
            step: chunk.step,
          })}\n\n`
        );
      }

      if (chunk.result) {
        if (chunk.step === 1) {
          companyDetails += chunk.result;
        } else if (chunk.step === 2) {
          finalAnalysis += chunk.result;
        }
        if (chunk.step <= 2) {
          res.write(
            `data: ${JSON.stringify({
              text: chunk.result,
              step: chunk.step,
              stepName: chunk.step === 1 ? "Company Research" : "Strategic Analysis",
              uuid: analysisUuid,
            })}\n\n`
          );
        }
      }

      if (chunk.done && chunk.step === 2) {
        res.write(`data: ${JSON.stringify({ done: true, allStepsComplete: true, analysisUuid })}\n\n`);
        break;
      }
    }

    const analysisLatency = Date.now() - analysisStartTime;

    await pool.execute(
      `INSERT INTO company_analytc 
        (uuid, company_name, model, latency_ms, analysis, company_details, created_at)
        VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [
        analysisUuid,
        companyName,
        "openai-gpt-5",
        analysisLatency,
        finalAnalysis || "❌ No comprehensive analysis generated because company information was not found.",
        companyDetails || "⚠️ No company details available.",
      ]
    );

    console.log(`✅ Dual-step analysis completed for ${companyName} with UUID: ${analysisUuid} in ${analysisLatency}ms`);
    res.end();
  } catch (error) {
    console.error("❌ Error in /dual-step-analysis-stream:", error);
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
});

// ----------------------------- ANALYTICS ENDPOINT -----------------------------
expressApp.get("/api/company-analytics/:uuid", async (req, res) => {
  const { uuid } = req.params;

  try {
    const [rows] = await pool.execute(
      `SELECT uuid, company_name, model, latency_ms, 
              analysis, company_details, reviews, created_at 
       FROM company_analytc 
       WHERE uuid = ?`,
      [uuid]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Company analysis not found" });
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error("❌ Error fetching company analytics:", error);
    res.status(500).json({ error: "Failed to fetch company analytics" });
  }
});

// ----------------------------- SERVER BOOT -----------------------------
async function initializeBusinessAnalyticsServer() {
  try {
    const mcpTransport = new StreamableHTTPServerTransport({
      port: 8081,
      host: "localhost",
    });

    await mcpServer.connect(mcpTransport);

    expressApp.listen(8081, () => {
      console.log("✅ Enhanced Business Analytics Server is running!");
      console.log("📍 Available Endpoints:");
      console.log("   POST http://localhost:8081/tri-step-analysis-stream");
      console.log("   POST http://localhost:8081/dual-step-analysis-stream");
      console.log("   GET  http://localhost:8081/api/company-analytics/:uuid");
    });
  } catch (error) {
    console.error("❌ Failed to initialize Enhanced Business Analytics Server:", error);
    process.exit(1);
  }
}

// Start the server
initializeBusinessAnalyticsServer().catch(console.error);
