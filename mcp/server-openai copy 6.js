import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import OpenAI from "openai";
import { pool } from "./db.js";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { tavily } from "@tavily/core"; // ✅ CORRECT IMPORT

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

// ✅ CORRECT: Initialize Tavily client properly
const tavilyClient = process.env.TAVILY_API_KEY
  ? tavily({ apiKey: process.env.TAVILY_API_KEY })
  : null;

if (!tavilyClient) {
  console.warn("⚠️ TAVILY_API_KEY environment variable is not set. Web search will not work.");
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

// ----------------------------- WEB SEARCH FUNCTIONS -----------------------------

/**
 * Search for live company information using Tavily
 */
async function searchCompanyInformation(companyName) {
  if (!tavilyClient) {
    console.warn("⚠️ Tavily client not available, skipping web search");
    return null;
  }

  try {
    console.log(`🔍 Searching web for: ${companyName}`);

    const cleanCompanyName = companyName.trim();

    // Perform multiple targeted searches in parallel
    const searches = await Promise.allSettled([
      // Basic company information
      tavilyClient.search(`${cleanCompanyName} company information`, {
        max_results: 5,
        search_depth: "advanced",
        include_answer: true,
      }),
      
      // Financial information
      tavilyClient.search(`${cleanCompanyName} revenue profit employees`, {
        max_results: 5,
        search_depth: "advanced",
        include_answer: true,
      }),
      
      // Employee reviews
      tavilyClient.search(`${cleanCompanyName} employee reviews complaints`, {
        max_results: 5,
        search_depth: "basic",
        include_answer: true,
      }),
    ]);

    // Extract successful results
    const [basicInfo, financialInfo, employeeReviews] = searches.map(result => 
      result.status === 'fulfilled' ? result.value : null
    );

    // Check if we got ANY results
    const hasResults = [basicInfo, financialInfo, employeeReviews].some(
      result => result && result.results && result.results.length > 0
    );

    if (!hasResults) {
      console.warn(`⚠️ No search results found for: ${companyName}`);
      return null;
    }

    const combinedResults = {
      basicInfo,
      financialInfo,
      employeeReviews,
      timestamp: new Date().toISOString(),
      companyName: cleanCompanyName,
    };

    console.log(`✅ Found search results for: ${companyName}`);
    console.log({combinedResults});
    return combinedResults;
  } catch (error) {
    console.error("❌ Error searching company information:", error);
    console.error("Error details:", error.message, error.stack);
    return null;
  }
}

/**
 * Format search results into structured text for GPT
 */
function formatSearchResults(searchResults) {
  if (!searchResults) {
    return "No live data available from web search.";
  }

  let formatted = "=== LIVE WEB SEARCH RESULTS ===\n\n";
  formatted += `Company Searched: ${searchResults.companyName}\n`;
  formatted += `Search Timestamp: ${searchResults.timestamp}\n\n`;

  const formatSection = (title, searchData) => {
    let section = `## ${title}\n\n`;
    
    if (searchData?.answer) {
      section += `AI Summary: ${searchData.answer}\n\n`;
    }

    if (searchData?.results && searchData.results.length > 0) {
      section += "Sources:\n";
      searchData.results.forEach((result, idx) => {
        section += `\n[Source ${idx + 1}]\n`;
        section += `Title: ${result.title}\n`;
        section += `URL: ${result.url}\n`;
        section += `Content: ${(result.content || '').substring(0, 400)}\n`;
      });
      section += "\n";
    } else {
      section += "No data found in this category.\n\n";
    }
    
    return section;
  };

  formatted += formatSection("COMPANY OVERVIEW & BASIC INFORMATION", searchResults.basicInfo);
  formatted += formatSection("FINANCIAL INFORMATION", searchResults.financialInfo);
  formatted += formatSection("EMPLOYEE REVIEWS & FEEDBACK", searchResults.employeeReviews);

  formatted += "\n=== END OF SEARCH RESULTS ===\n";

  return formatted;
}

// ----------------------------- HELPER FUNCTIONS -----------------------------

function isCompanyNotFound(content, searchResults) {
  // If we have valid search results, don't mark as not found
  if (searchResults && searchResults !== "No live data available from web search.") {
    return false;
  }

  const notFoundPatterns = [/COMPANY_NOT_FOUND:/i];
  return notFoundPatterns.some(pattern => pattern.test(content));
}

// -------------------------- ENHANCED PROMPT BUILDERS --------------------------
function buildCompanyDetailsPrompt(companyName, liveWebData) {
  let prompt = `You are a business research analyst. Analyze the LIVE WEB SEARCH DATA below about: ${companyName}

**CRITICAL INSTRUCTIONS:**
- The data below comes from REAL-TIME web search
- You MUST use this data to provide analysis
- If search results show the company exists (even with limited data), provide analysis based on available information
- Only respond with "COMPANY_NOT_FOUND" if the search results explicitly show NO information at all

**LIVE DATA FROM WEB SEARCH:**
${liveWebData}

**Your Task:**
Based on the above live web search results, provide factual information about:

1. **Business Nature**: Industry, sector, and primary operations
2. **Company Status**: Active/Inactive, registration details (if available)
3. **Financial Metrics**: 
   - Annual revenue (if available)
   - Profit After Tax (PAT) (if available)
   - If not available, state: "Financial data not publicly disclosed"
4. **Employee Information**:
   - Employee count (if available)
   - Revenue per employee (calculate if data available)
   - Profit per employee (calculate if data available)
5. **Employee Sentiment**: Common complaints/feedback from reviews (if available)
6. **Market Position**: Brief industry benchmark comparison (if data allows)
7. **Engagement Level**: Employee engagement indicators (if available)
8. **Growth Opportunities**: How Wazo Pulse (https://wazopulse.com) solutions could benefit this company

**Output Format:**
- Use clear bullet points with headers
- Cite sources using [Source X] notation
- If specific data is unavailable, state: "Data not publicly available"
- Keep each point concise (1-2 lines)

**IMPORTANT:** Work with whatever data is available in the search results.`;

  return prompt;
}

function buildCompanySummaryPrompt(companyName, companyDetails) {
  return `You are a professional business analyst. Write a short factual summary of **${companyName}** based on:

**COMPANY DETAILS:**
${companyDetails}

**SUMMARY RULES:**
- Write one concise paragraph (80–120 words)
- Focus on what IS known about the company
- Mention industry, operations, and any available metrics
- Keep it objective and data-based
- Professional tone
- No headings or bullet points`;
}

function buildCompanyVoicePrompt(companyName, employeeReviewsData) {
  return `Analyze employee reviews and company information for ${companyName}.

**EMPLOYEE REVIEW & COMPANY DATA:**
${employeeReviewsData}

**Task:** Based on available data, identify 8-12 workplace challenges for ${companyName} and map each to Wazo Pulse solutions.

**Available Wazo Pulse Solutions:**
1. Recognition, 2. Badges, 3. Award, 4. Anonymous feedback, 5. Growth conversation, 
6. OKR and Goals, 7. 360 Feedback, 8. Public feed page

**Output Format (STRICT):**
<challenge description> ✅ <solution(s)>

**Examples:**
- Lack of employee recognition programs ✅ Recognition, Award, Badges
- Limited feedback channels ✅ Anonymous feedback, 360 Feedback
- Unclear career progression paths ✅ Growth conversation, OKR and Goals

**Rules:**
- One line per item
- Use ✅ as separator
- Map to solutions from list above
- 8-12 items total
- Professional tone

Company: ${companyName}`;
}

// ----------------------------- STEP 0: WEB SEARCH -----------------------------
async function* performWebSearch(companyName) {
  try {
    yield { result: "🔍 Searching the web for live company data...\n\n", step: 0, done: false };

    const searchResults = await searchCompanyInformation(companyName);

    if (!searchResults) {
      yield { 
        result: "⚠️ Limited search results. Proceeding with available data...\n\n", 
        step: 0, 
        done: true,
        searchResults: "Limited search data available. Proceeding with analysis."
      };
      return;
    }

    const formattedResults = formatSearchResults(searchResults);

    const resultCount = [
      searchResults.basicInfo?.results?.length || 0,
      searchResults.financialInfo?.results?.length || 0,
      searchResults.employeeReviews?.results?.length || 0,
    ].reduce((a, b) => a + b, 0);

    yield { 
      result: `✅ Found ${resultCount} sources of information!\n\n`, 
      step: 0, 
      done: true,
      searchResults: formattedResults
    };
  } catch (error) {
    console.error("❌ Error in performWebSearch:", error);
    yield { 
      result: `⚠️ Search error: ${error.message}. Continuing...\n\n`, 
      step: 0, 
      done: true,
      searchResults: "Search encountered an error. Proceeding with limited data."
    };
  }
}

// ----------------------------- STEP 1 -----------------------------
async function* getCompanyDetailsWithOpenAI(companyName, liveWebData) {
  if (!openAIClient) {
    yield { error: "OpenAI client not initialized. OPENAI_API_KEY is missing." };
    return;
  }

  try {
    const detailsPrompt = buildCompanyDetailsPrompt(
      companyName, 
      liveWebData || "Limited data available. Provide analysis based on company name."
    );

    const streamingResponse = await openAIClient.chat.completions.create({
      model: "gpt-5-auto",
      messages: [{ role: "user", content: detailsPrompt }],
      stream: true,
      temperature: 1,
      max_completion_tokens: 1500,
    });

    let fullContent = "";

    for await (const responseChunk of streamingResponse) {
      const chunkContent = responseChunk.choices?.[0]?.delta?.content;
      if (chunkContent) {
        fullContent += chunkContent;
        yield { result: chunkContent, done: false, step: 1 };
      }
    }

    if (isCompanyNotFound(fullContent, liveWebData)) {
      yield {
        result: "\n\n⚠️ Company information could not be verified.",
        done: true,
        step: 1,
        notFound: true,
      };
      return;
    }

    yield { done: true, step: 1, fullContent };
  } catch (error) {
    console.error("❌ Error in getCompanyDetailsWithOpenAI:", error);
    yield { error: `OpenAI API Error (Step 1): ${error.message}` };
  }
}

// ----------------------------- STEP 2 -----------------------------
async function* generateAnalysisWithCompanyDetails(companyName, companyDetails) {
  if (!openAIClient) {
    yield { error: "OpenAI client not initialized. OPENAI_API_KEY is missing." };
    return;
  }

  try {
    const companySummaryPrompt = buildCompanySummaryPrompt(companyName, companyDetails);

    const streamingResponse = await openAIClient.chat.completions.create({
      model: "gpt-5-auto",
      messages: [{ role: "user", content: companySummaryPrompt }],
      stream: true,
      temperature: 1,
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
async function* generateCompanyVoiceReviews(companyName, liveWebData) {
  if (!openAIClient) {
    yield { error: "OpenAI client not initialized. OPENAI_API_KEY is missing." };
    return;
  }

  try {
    const companyVoicePrompt = buildCompanyVoicePrompt(
      companyName, 
      liveWebData || "Limited review data available."
    );

    const streamingResponse = await openAIClient.chat.completions.create({
      model: "gpt-5-auto",
      messages: [{ role: "user", content: companyVoicePrompt }],
      stream: true,
      temperature: 1,
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
  let liveWebData = null;
  let companyDetails = "";
  let finalAnalysis = "";
  let companyVoice = "";

  // STEP 0: Web Search
  console.log(`🔍 Step 0: Gathering live web data for ${companyName}`);

  for await (const chunk of performWebSearch(companyName)) {
    if (chunk.result) {
      yield { result: chunk.result, step: 0, done: false };
    }

    if (chunk.done) {
      liveWebData = chunk.searchResults;
      yield { step: 0, done: true, stepComplete: "Web search completed" };
      break;
    }
  }

  yield { transition: "Analyzing gathered data with AI...", step: "transition-0-1" };

  // STEP 1: Company details
  console.log(`🔍 Step 1: Analyzing company details for ${companyName}`);

  for await (const chunk of getCompanyDetailsWithOpenAI(companyName, liveWebData)) {
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
        result: "\n\n❌ Unable to proceed. Please verify the company name.",
        step: 3,
        done: true,
        finalStep: true,
      };
      return;
    }

    if (chunk.done) {
      yield { step: 1, done: true, stepComplete: "Company details completed" };
      break;
    }
  }

  yield { transition: "Creating strategic analysis...", step: "transition-1-2" };

  // STEP 2: Analysis
  console.log(`📊 Step 2: Generating analysis for ${companyName}`);

  for await (const chunk of generateAnalysisWithCompanyDetails(companyName, companyDetails)) {
    if (chunk.error) {
      yield chunk;
      return;
    }

    if (chunk.result) {
      finalAnalysis += chunk.result;
      yield { result: chunk.result, step: 2, done: false };
    }

    if (chunk.done) {
      yield { step: 2, done: true, stepComplete: "Analysis completed" };
      break;
    }
  }

  yield { transition: "Mapping to Wazo Pulse solutions...", step: "transition-2-3" };

  // STEP 3: Company voice
  console.log(`🗣️ Step 3: Generating solutions for ${companyName}`);

  for await (const chunk of generateCompanyVoiceReviews(companyName, liveWebData)) {
    if (chunk.error) {
      yield chunk;
      return;
    }

    if (chunk.result) {
      companyVoice += chunk.result;
      yield { result: chunk.result, step: 3, done: false };
    }

    if (chunk.done) {
      yield { step: 3, done: true, stepComplete: "Solution mapping completed", finalStep: true };
      break;
    }
  }
}

// [Rest of your code: MCP tools, HTTP endpoints, server initialization...]

// For brevity, I'll include just the key endpoint:

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

    console.log(`🔍 Starting analysis for: ${companyName} [UUID: ${analysisUuid}]`);

    for await (const chunk of generateTriStepAnalysis(companyName)) {
      if (chunk.error) {
        res.write(`data: ${JSON.stringify({ error: chunk.error })}\n\n`);
        break;
      }

      if (chunk.transition) {
        res.write(`data: ${JSON.stringify({ transition: chunk.transition, step: chunk.step })}\n\n`);
        continue;
      }

      if (chunk.stepComplete) {
        res.write(`data: ${JSON.stringify({ stepComplete: chunk.stepComplete, step: chunk.step, finalStep: chunk.finalStep || false })}\n\n`);
        continue;
      }

      if (chunk.result) {
        const stepName = chunk.step === 0 ? "Live Web Search" : 
                        chunk.step === 1 ? "Company Research" :
                        chunk.step === 2 ? "Strategic Analysis" : "Solution Mapping";

        if (chunk.step === 1) companyDetails += chunk.result;
        else if (chunk.step === 2) finalAnalysis += chunk.result;
        else if (chunk.step === 3) companyVoice += chunk.result;

        res.write(`data: ${JSON.stringify({ text: chunk.result, step: chunk.step, stepName, uuid: analysisUuid })}\n\n`);
      }

      if (chunk.done && chunk.finalStep) {
        res.write(`data: ${JSON.stringify({ done: true, allStepsComplete: true, analysisUuid })}\n\n`);
        break;
      }
    }

    const analysisLatency = Date.now() - analysisStartTime;

    await pool.execute(
      `INSERT INTO company_analytc 
        (uuid, company_name, model, latency_ms, analysis, company_details, reviews, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        analysisUuid,
        companyName,
        "gpt-5-with-tavily-search",
        analysisLatency,
        finalAnalysis || "Analysis not completed.",
        companyDetails || "Details not available.",
        companyVoice || "Reviews not available.",
      ]
    );

    console.log(`✅ Analysis completed for ${companyName} [${analysisLatency}ms]`);
    res.end();
  } catch (error) {
    console.error("❌ Error in /tri-step-analysis-stream:", error);
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
});

// Include your other endpoints and server initialization...

async function initializeBusinessAnalyticsServer() {
  try {
    const mcpTransport = new StreamableHTTPServerTransport({
      port: 8081,
      host: "localhost",
    });

    await mcpServer.connect(mcpTransport);

    expressApp.listen(8081, () => {
      console.log("✅ Enhanced Business Analytics Server with Web Search is running!");
      console.log("📍 POST http://localhost:8081/tri-step-analysis-stream");
      console.log("📍 POST http://localhost:8081/dual-step-analysis-stream");
      console.log("📍 GET  http://localhost:8081/api/company-analytics/:uuid");
    });
  } catch (error) {
    console.error("❌ Failed to initialize server:", error);
    process.exit(1);
  }
}

initializeBusinessAnalyticsServer().catch(console.error);
