import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import dotenv from "dotenv";
import { z } from "zod";
import express from "express";
import cors from "cors";
import OpenAI from "openai";
import { pool } from "./db.js";

// Load environment variables
dotenv.config();
console.log("🟢 Enhanced Business Analytics Server is starting...");

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
  version: "2.0.0",
});

// * STEP 1: Get company details using OpenAI
async function* getCompanyDetailsWithOpenAI(companyName, employeeCount = null, gstinNumber = null) {
  if (!openAIClient) {
    yield { error: "OpenAI client not initialized. OPENAI_API_KEY is missing." };
    return;
  }

  try {
    const detailsPrompt = buildCompanyDetailsPrompt(companyName, employeeCount, gstinNumber);

    const streamingResponse = await openAIClient.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: detailsPrompt }],
      stream: true,
      temperature: 0.3,
    });

    let fullContent = "";

    for await (const responseChunk of streamingResponse) {
      const chunkContent = responseChunk.choices[0]?.delta?.content;
      if (chunkContent) {
        fullContent += chunkContent;
        yield { result: chunkContent, done: false, step: 1 };
      }
    }

    // 🚨 Check if GPT returned "not available"
    if (/not available|no information found|unable to find/i.test(fullContent)) {
      yield { result: "⚠️ No company data found for this search. Please verify the company name.", done: true, step: 1, notFound: true };
      return;
    }

    yield { done: true, step: 1 };
  } catch (error) {
    console.error("❌ Error in getCompanyDetailsWithOpenAI:", error);
    yield { error: `OpenAI API Error (Step 1): ${error.message}` };
  }
}


// * STEP 2: Generate comprehensive analysis based on company details
async function* generateAnalysisWithCompanyDetails(companyName, companyDetails, employeeCount = null, gstinNumber = null) {
  if (!openAIClient) {
    yield { error: "OpenAI client not initialized. OPENAI_API_KEY is missing." };
    return;
  }

  try {
    const analysisPrompt = buildComprehensiveAnalysisPrompt(companyName, companyDetails, employeeCount, gstinNumber);

    const streamingResponse = await openAIClient.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: analysisPrompt }],
      stream: true,
      temperature: 0.7,
    });

    for await (const responseChunk of streamingResponse) {
      const chunkContent = responseChunk.choices[0]?.delta?.content;
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

// * Build company details prompt (Step 1)
function buildCompanyDetailsPrompt(companyName, employeeCount = null, gstinNumber = null) {
  let prompt = `Act as Business analyst and Give me the details of this company: ${companyName} with the mentioned points. 
  1. Nature of business and details of business.
  2. Revenue
  3. PAT
  4. Number of Employee
  5. Revenue per employee
  6. Profit per employee
  7. Summary of negative reviews from various platforms
  8. Comparison with Industry benchmark
  9. Employee Engagement
  10. Areas to grow with wazo pulse. (https://wazopulse.com).
  11. If the company information is not found, then respond with a clear statement that the information is not available.
  `;

  if (employeeCount) {
    prompt += `\n\n**Additional Context:** Reported employee count: ${employeeCount}`;
  }

  if (gstinNumber) {
    prompt += `\n**Tax Info:** GSTIN: ${gstinNumber}`;
  }

  return prompt;
}

// * Build comprehensive analysis prompt (Step 2)
function buildComprehensiveAnalysisPrompt(companyName, companyDetails, employeeCount = null, gstinNumber = null) {
  return `As a senior business analyst, provide a **comprehensive, data-driven strategic analysis** of ${companyName} based on the following company information and extracted data.

**COMPANY INFORMATION:**
${companyDetails}
---

## ⚡ Important Instruction for Analysis:

1. Treat the image-extracted dataset as the **primary quantitative source**.  
2. Perform **step-by-step calculations**, clearly showing formula & results.  
   - Example:  
     - Needs of Wazo = 8,000 Cr × 10% = 800 Cr  
     - Employees = 80,000 × 6,600 = 528 Cr  
     - Annual Loss = 27 Cr  
     - Attrition Turnover = 22,000 × 150 = 33 L × 12 = 396 L = 39.6 Cr  
3. Show all **intermediate steps** before the final result.  
4. Where applicable, calculate:  
   - Revenue per employee  
   - Profit per employee  
   - Attrition cost impact  
   - ROI (Return on Investment)  
   - Cost-saving projections  
   - Productivity uplift if Wazo Pulse platform is implemented  

---

## 📌 COMPREHENSIVE BUSINESS ANALYSIS STRUCTURE

1. **Strategic Position Analysis**  
   - Market position, SWOT, industry trends  

2. **Financial Performance Assessment**  
   - Revenue, Profit After Tax (PAT), margins  
   - Show financial ratios **with actual calculations from image data**  
   - Benchmarking with industry  

3. **Operational Excellence Evaluation**  
   - Cost per unit, efficiency ratios  
   - Productivity metrics (calculated step by step)  

4. **Human Capital Analysis**  
   - Attrition turnover cost **calculation**  
   - Revenue per employee, profit per employee  
   - Retention & productivity improvements quantified  

5. **Market Opportunity Assessment**  
   - Calculate growth potential, CAGR, TAM, etc.  
   - ROI projections with Wazo Pulse adoption  

6. **Risk Assessment & Mitigation**  
   - Quantify financial & operational risks with numbers  

7. **Strategic Recommendations**  
   - Short-term, medium-term, long-term actions  
   - Show **numerical impact** (e.g., "reducing attrition saves ~₹39 Cr annually")  

8. **Performance Improvement Areas**  
   - Operational optimization with cost savings calculated  
   - Technology adoption ROI with numerical impact  

---

📌 **Analysis Framework:**  
Use **quantitative calculations** + strategic insights. Always show **formula + result** before giving interpretation.  
`;
}

// * Enhanced dual-step streaming function
async function* generateDualStepAnalysis(companyName, employeeCount = null, gstinNumber = null) {
  let companyDetails = "";

  console.log(`🔍 Step 1: Gathering company details for ${companyName}`);

  for await (const chunk of getCompanyDetailsWithOpenAI(companyName, employeeCount, gstinNumber)) {
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

  console.log(`📊 Step 2: Generating comprehensive analysis for ${companyName}`);

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


// * MCP Tool handler for dual-step analysis
const processDualStepAnalysisRequest = async ({ prompt: companyName, numberOfEmployees, companyGstin }) => {
  console.log(`📊 Processing dual-step analysis for: "${companyName}"`);

  let companyDetails = "";
  let finalAnalysis = "";
  let currentStep = 1;

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

  const combinedResult = `**STEP 1: COMPANY DETAILS**\n${companyDetails}\n\n**STEP 2: COMPREHENSIVE ANALYSIS**\n${finalAnalysis}`;

  console.log("✅ Dual-step analysis completed");
  return { content: [{ type: "text", text: combinedResult }] };
};

// * Register enhanced MCP tool
mcpServer.tool(
  "analyzeDualStepCompanyBusiness",
  {
    prompt: z.string().describe("Company name to analyze"),
    numberOfEmployees: z.string().optional().describe("Number of employees in the company"),
    companyGstin: z.string().optional().describe("Company GSTIN number"),
  },
  processDualStepAnalysisRequest
);

// * Enhanced HTTP endpoint for dual-step streaming
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

    console.log(`🔍 Starting dual-step analysis for company: ${companyName}`);

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
          stepName: chunk.step === 1 ? "Company Research" : "Strategic Analysis"
        })}\n\n`);
      }

      if (chunk.done && chunk.finalStep) {
        res.write(`data: ${JSON.stringify({ done: true, allStepsComplete: true })}\n\n`);
        break;
      }
    }

    const analysisLatency = Date.now() - analysisStartTime;

    // Save both steps to database
    await pool.execute(
      `INSERT INTO company_analytc 
        (company_name, number_of_employees, company_gstin, model, latency_ms, analysis, company_details)
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        companyName,
        employeeCount || null,
        gstinNumber || null,
        "gpt-4o-dual-step",
        analysisLatency,
        finalAnalysis || "❌ No comprehensive analysis generated because company information was not found.",
        companyDetails || "⚠️ No company details available."
      ]
    );

    console.log(`✅ Dual-step analysis completed for ${companyName} in ${analysisLatency}ms`);
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
      console.log("🟢 Enhanced Business Analytics Server running on http://localhost:8081");
      console.log("🔄 Available endpoints:");
      console.log("   POST http://localhost:8081/dual-step-analysis-stream (NEW - Enhanced)");
      console.log("   POST http://localhost:8081/business-analysis-stream (Legacy)");
      console.log("   GET  http://localhost:8081/endpoints (API documentation)");
      console.log("📊 MCP Server ready for dual-step business analysis requests");
      console.log("🚀 Enhanced Features:");
      console.log("   ✅ Dual-step processing (Company Details → Analysis)");
      console.log("   ✅ Step-by-step streaming");
      console.log("   ✅ Enhanced prompts and analysis depth");
      console.log("   ✅ Backward compatibility maintained");
    });
  } catch (error) {
    console.error("❌ Failed to initialize Enhanced Business Analytics Server:", error);
    process.exit(1);
  }
}

// Start the server
initializeBusinessAnalyticsServer().catch(console.error);
