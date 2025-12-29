import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import dotenv from "dotenv";
import { z } from "zod";
import express from "express";
import cors from "cors";
import { GoogleGenAI } from "@google/genai";
import { pool } from "./db.js";
import { v4 as uuidv4 } from 'uuid';

// Load environment variables
dotenv.config();
console.log("🟢 Enhanced Business Analytics Server with Gemini 2.5 Flash is starting...");

// Initialize Gemini client
const geminiClient = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  : null;

if (!geminiClient) {
  console.warn("⚠️ GEMINI_API_KEY environment variable is not set. Gemini analysis will not work.");
}

// Initialize Express application
const expressApp = express();
expressApp.use(cors());
expressApp.use(express.json());

// Initialize MCP server
const mcpServer = new McpServer({
  name: "enhanced-business-analytics-server-gemini",
  version: "2.0.0",
});

// * STEP 1: Get company details using Gemini 2.5 Flash
async function* getCompanyDetailsWithGemini(companyName, employeeCount = null, gstinNumber = null) {
  if (!geminiClient) {
    yield { error: "Gemini client not initialized. GEMINI_API_KEY is missing." };
    return;
  }

  try {
    const detailsPrompt = buildCompanyDetailsPrompt(companyName, employeeCount, gstinNumber);

    const streamingResponse = await geminiClient.models.generateContentStream({
      model: "gemini-2.5-flash",
      contents: detailsPrompt,
      config: {
        temperature: 0.3,
        maxOutputTokens: 8192,
        thinkingConfig: {
          thinkingBudget: 0, // Disable thinking for faster responses
        },
      },
    });

    let fullContent = "";

    for await (const responseChunk of streamingResponse) {
      const chunkContent = responseChunk.text;
      if (chunkContent) {
        fullContent += chunkContent;
        yield { result: chunkContent, done: false, step: 1 };
      }
    }

    // 🚨 Check if Gemini returned "not available"
    if (/not available|no information found|unable to find/i.test(fullContent)) {
      yield { result: "⚠️ No reliable company information found. Please verify the company name and try again.", done: true, step: 1, notFound: true };
      return;
    }

    yield { done: true, step: 1 };
  } catch (error) {
    console.error("❌ Error in getCompanyDetailsWithGemini:", error);
    yield { error: `Gemini API Error (Step 1): ${error.message}` };
  }
}

// * STEP 2: Generate comprehensive analysis based on company details
async function* generateAnalysisWithCompanyDetails(companyName, companyDetails, employeeCount = null, gstinNumber = null) {
  if (!geminiClient) {
    yield { error: "Gemini client not initialized. GEMINI_API_KEY is missing." };
    return;
  }

  try {
    const analysisPrompt = buildComprehensiveAnalysisPrompt(companyName, companyDetails, employeeCount, gstinNumber);

    const streamingResponse = await geminiClient.models.generateContentStream({
      model: "gemini-2.5-flash",
      contents: analysisPrompt,
      config: {
        temperature: 0.7,
        maxOutputTokens: 8192,
        thinkingConfig: {
          thinkingBudget: 0, // Disable thinking for faster responses
        },
      },
    });

    for await (const responseChunk of streamingResponse) {
      const chunkContent = responseChunk.text;
      if (chunkContent) {
        yield { result: chunkContent, done: false, step: 2 };
      }
    }

    yield { done: true, step: 2 };
  } catch (error) {
    console.error("❌ Error in generateAnalysisWithCompanyDetails:", error);
    yield { error: `Gemini API Error (Step 2): ${error.message}` };
  }
}

// * Build company details prompt (Step 1)
function buildCompanyDetailsPrompt(companyName, employeeCount = null, gstinNumber = null) {
  let prompt = `Act as a Business analyst and provide comprehensive details of this company: ${companyName} with the following specific points:

1. Nature of business and detailed business description
2. Annual revenue (latest available figures)
3. Profit After Tax (PAT)
4. Current number of employees
5. Revenue per employee calculation
6. Profit per employee calculation
7. Summary of negative reviews from various platforms (Glassdoor, Indeed, etc.)
8. Comparison with industry benchmarks
9. Employee engagement metrics and challenges
10. Growth opportunities and areas where Wazo Pulse (https://wazopulse.com) could add value

**Important:** If the company information is not reliably available or found, clearly state that the information is not available rather than providing speculative data.`;

  if (employeeCount) {
    prompt += `\n\n**Additional Context:** Reported employee count: ${employeeCount}`;
  }

  if (gstinNumber) {
    prompt += `\n**Tax Information:** GSTIN: ${gstinNumber}`;
  }

  return prompt;
}

// * Build comprehensive analysis prompt (Step 2)
function buildComprehensiveAnalysisPrompt(companyName, companyDetails, employeeCount = null, gstinNumber = null) {
  return `As a senior business analyst with expertise in strategic consulting, provide a comprehensive, data-driven strategic analysis of ${companyName} based on the following company information.

**COMPANY INFORMATION:**
${companyDetails}

---

## ⚡ Analysis Requirements:

1. Use the provided company data as the **primary quantitative source**
2. Perform **step-by-step calculations** with clear formulas and results
3. Show all **intermediate calculation steps** before final results
4. Calculate key metrics including:
   - Revenue per employee ratios
   - Profit per employee metrics
   - Attrition cost impact analysis
   - ROI projections
   - Cost-saving potential
   - Productivity improvement projections with Wazo Pulse implementation

---

## 📌 COMPREHENSIVE BUSINESS ANALYSIS STRUCTURE

### 1. **Strategic Position Analysis**
   - Current market position and competitive landscape
   - SWOT analysis with quantified impacts
   - Industry trend analysis and positioning

### 2. **Financial Performance Assessment**
   - Revenue analysis with growth trends
   - Profit After Tax (PAT) evaluation
   - Financial ratios with detailed calculations
   - Industry benchmarking with numerical comparisons

### 3. **Operational Excellence Evaluation**
   - Cost efficiency analysis
   - Productivity metrics with calculations
   - Operational bottlenecks and improvement areas

### 4. **Human Capital Analysis**
   - Employee turnover cost calculations
   - Revenue and profit per employee analysis
   - Retention strategy recommendations with ROI projections

### 5. **Market Opportunity Assessment**
   - Growth potential calculations
   - Total Addressable Market (TAM) analysis
   - ROI projections for Wazo Pulse platform adoption

### 6. **Risk Assessment & Mitigation**
   - Quantified risk analysis
   - Financial impact of identified risks
   - Mitigation strategies with cost-benefit analysis

### 7. **Strategic Recommendations**
   - Short-term action items (0-6 months)
   - Medium-term initiatives (6-18 months)
   - Long-term strategic goals (18+ months)
   - Numerical impact projections for each recommendation

### 8. **Technology Integration Opportunities**
   - Wazo Pulse implementation roadmap
   - Expected ROI and productivity improvements
   - Implementation timeline and resource requirements

---

**Analysis Framework:** Combine quantitative calculations with strategic insights. Always show formula + calculation + result before providing interpretation. Focus on actionable recommendations with measurable outcomes.`;
}

// * Enhanced dual-step streaming function with Gemini
async function* generateDualStepAnalysis(companyName, employeeCount = null, gstinNumber = null) {
  let companyDetails = "";

  console.log(`🔍 Step 1: Gathering company details for ${companyName} using Gemini 2.5 Flash`);

  for await (const chunk of getCompanyDetailsWithGemini(companyName, employeeCount, gstinNumber)) {
    if (chunk.error) {
      yield chunk;
      return;
    }

    if (chunk.result) {
      companyDetails += chunk.result;
      yield { result: chunk.result, step: 1, done: false };
    }

    // 🚨 Stop if company not found
    if (chunk.notFound) {
      yield { result: "❌ Analysis skipped. Company information could not be found.", step: 2, done: true, finalStep: true };
      return;
    }

    if (chunk.done) {
      yield { step: 1, done: true, stepComplete: "Company details gathered successfully" };
      break;
    }
  }

  yield { transition: "Processing company details for comprehensive analysis...", step: "transition" };

  console.log(`📊 Step 2: Generating comprehensive analysis for ${companyName} using Gemini 2.5 Flash`);

  for await (const chunk of generateAnalysisWithCompanyDetails(companyName, companyDetails, employeeCount, gstinNumber)) {
    if (chunk.error) {
      yield chunk;
      return;
    }

    if (chunk.result) {
      yield { result: chunk.result, step: 2, done: false };
    }

    if (chunk.done) {
      yield { step: 2, done: true, stepComplete: "Comprehensive analysis completed", finalStep: true };
      break;
    }
  }
}

// * MCP Tool handler for dual-step analysis with Gemini
const processDualStepAnalysisRequest = async ({ prompt: companyName, numberOfEmployees, companyGstin }) => {
  console.log(`📊 Processing dual-step analysis for: "${companyName}" using Gemini 2.5 Flash`);

  let companyDetails = "";
  let finalAnalysis = "";

  for await (const chunk of generateDualStepAnalysis(companyName, numberOfEmployees, companyGstin)) {
    if (chunk.error) return { content: [{ type: "text", text: chunk.error }] };

    if (chunk.result) {
      if (chunk.step === 1) {
        companyDetails += chunk.result;
      } else if (chunk.step === 2) {
        finalAnalysis += chunk.result;
      }
    }
  }

  const combinedResult = `**STEP 1: COMPANY RESEARCH (Gemini 2.5 Flash)**\n${companyDetails}\n\n**STEP 2: STRATEGIC ANALYSIS (Gemini 2.5 Flash)**\n${finalAnalysis}`;

  console.log("✅ Dual-step analysis completed with Gemini 2.5 Flash");
  return { content: [{ type: "text", text: combinedResult }] };
};

// * Register enhanced MCP tool
mcpServer.tool(
  "analyzeDualStepCompanyBusinessGemini",
  {
    prompt: z.string().describe("Company name to analyze"),
    numberOfEmployees: z.string().optional().describe("Number of employees in the company"),
    companyGstin: z.string().optional().describe("Company GSTIN number"),
  },
  processDualStepAnalysisRequest
);

// * Enhanced HTTP endpoint for dual-step streaming with Gemini
expressApp.post("/dual-step-analysis-stream", async (req, res) => {
  const { prompt: companyName, numberOfEmployees: employeeCount, companyGstin: gstinNumber } = req.body;

  if (!companyName) {
    return res.status(400).json({ error: "Missing 'prompt' (company name) in request body." });
  }

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
  });

  try {
    let companyDetails = "";
    let finalAnalysis = "";
    const analysisStartTime = Date.now();

    const analysisUuid = uuidv4();

    console.log(`🔍 Starting dual-step analysis for company: ${companyName} with Gemini 2.5 Flash`);

    for await (const chunk of generateDualStepAnalysis(companyName, employeeCount, gstinNumber)) {
      if (chunk.error) {
        res.write(`data: ${JSON.stringify({ error: chunk.error })}\n\n`);
        break;
      }

      if (chunk.transition) {
        res.write(`data: ${JSON.stringify({
          transition: chunk.transition,
          step: chunk.step,
          message: "Moving to comprehensive analysis phase..."
        })}\n\n`);
        continue;
      }

      if (chunk.stepComplete) {
        res.write(`data: ${JSON.stringify({
          stepComplete: chunk.stepComplete,
          step: chunk.step,
          finalStep: chunk.finalStep || false
        })}\n\n`);
        continue;
      }

      if (chunk.result) {
        if (chunk.step === 1) {
          companyDetails += chunk.result;
        } else if (chunk.step === 2) {
          finalAnalysis += chunk.result;
        }

        res.write(`data: ${JSON.stringify({
          text: chunk.result,
          step: chunk.step,
          stepName: chunk.step === 1 ? "Company Research (Gemini)" : "Strategic Analysis (Gemini)",
          uuid: analysisUuid
        })}\n\n`);
      }

      if (chunk.done && chunk.finalStep) {
        res.write(`data: ${JSON.stringify({ done: true, allStepsComplete: true, analysisUuid: analysisUuid })}\n\n`);
        break;
      }
    }

    const analysisLatency = Date.now() - analysisStartTime;

    // Save both steps to database
    await pool.execute(
      `INSERT INTO company_analytc 
        (uuid, company_name, number_of_employees, company_gstin, model, latency_ms, analysis, company_details, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        analysisUuid,
        companyName,
        employeeCount || null,
        gstinNumber || null,
        "gemini-2.5-flash",
        analysisLatency,
        finalAnalysis || "❌ No comprehensive analysis generated because company information was not found.",
        companyDetails || "⚠️ No company details available."
      ]
    );

    console.log(`✅ Dual-step analysis completed for ${companyName} in ${analysisLatency}ms using Gemini 2.5 Flash`);
    res.end();
  } catch (error) {
    console.error("❌ Error in /dual-step-analysis-stream:", error);
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
});

// * Initialize and start the enhanced server
async function initializeBusinessAnalyticsServer() {
  try {
    const mcpTransport = new StreamableHTTPServerTransport({
      port: 8081,
      host: "localhost",
    });

    await mcpServer.connect(mcpTransport);

    expressApp.listen(8081, () => {
      console.log("🚀 Enhanced Business Analytics Server with Gemini 2.5 Flash running on:");
      console.log("   POST http://localhost:8081/dual-step-analysis-stream");
      console.log("🔑 Make sure to set GEMINI_API_KEY environment variable");
    });
  } catch (error) {
    console.error("❌ Failed to initialize Enhanced Business Analytics Server:", error);
    process.exit(1);
  }
}

// Start the server
initializeBusinessAnalyticsServer().catch(console.error);
