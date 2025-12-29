import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import OpenAI from "openai";
import { pool } from "./db.js";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { tavily } from "@tavily/core";

dotenv.config();
console.log("🟢 Enhanced Business Analytics Server is starting (JS)...");

const openAIClient = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;
if (!openAIClient) {
  console.warn("⚠️ OPENAI_API_KEY environment variable is not set.");
}

const tavilyClient = process.env.TAVILY_API_KEY
  ? tavily({ apiKey: process.env.TAVILY_API_KEY })
  : null;
if (!tavilyClient) {
  console.warn("⚠️ TAVILY_API_KEY environment variable is not set.");
}

const expressApp = express();
expressApp.use(cors({
  origin: true, // Allow all origins
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
expressApp.use(express.json());

const mcpServer = new McpServer({
  name: "enhanced-business-analytics-server",
  version: "3.0.0",
});

// ----------------------------- WEB SEARCH FUNCTIONS -----------------------------

/**
 * Extract clean domain name from URL
 */
function extractDomain(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch (error) {
    return url;
  }
}

/**
 * Get friendly platform name from domain
 */
function getPlatformName(domain) {
  const platformMap = {
    'linkedin.com': 'LinkedIn',
    'crunchbase.com': 'Crunchbase',
    'wikipedia.org': 'Wikipedia',
    'glassdoor.com': 'Glassdoor',
    'glassdoor.co.in': 'Glassdoor India',
    'ambitionbox.com': 'AmbitionBox',
    'indeed.com': 'Indeed',
    'economictimes.indiatimes.com': 'Economic Times',
    'tofler.in': 'Tofler',
    'zaubacorp.com': 'Zaubacorp',
    'mca.gov.in': 'Ministry of Corporate Affairs (MCA)',
    'reuters.com': 'Reuters',
    'bloomberg.com': 'Bloomberg',
    'moneycontrol.com': 'MoneyControl',
  };

  const lowerDomain = domain.toLowerCase();
  for (const [key, value] of Object.entries(platformMap)) {
    if (lowerDomain.includes(key)) {
      return value;
    }
  }

  // Capitalize first letter of domain
  return domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1);
}

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

    const searches = await Promise.allSettled([
      tavilyClient.search(`${cleanCompanyName} company information headquarters website`, {
        max_results: 5,
        search_depth: "advanced",
        include_answer: true,
      }),

      tavilyClient.search(`${cleanCompanyName} revenue profit employees annual report financial`, {
        max_results: 5,
        search_depth: "advanced",
        include_answer: true,
      }),

      tavilyClient.search(`${cleanCompanyName} employee reviews complaints feedback rating`, {
        max_results: 5,
        search_depth: "basic",
        include_answer: true,
      }),

      tavilyClient.search(`${cleanCompanyName} India MCA company registration details`, {
        max_results: 3,
        search_depth: "basic",
        include_answer: true,
      }),
    ]);

    const [basicInfo, financialInfo, employeeReviews, indiaInfo] = searches.map(result =>
      result.status === 'fulfilled' ? result.value : null
    );

    const hasResults = [basicInfo, financialInfo, employeeReviews, indiaInfo].some(
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
      indiaInfo,
      timestamp: new Date().toISOString(),
      companyName: cleanCompanyName,
    };

    const totalSources = [basicInfo, financialInfo, employeeReviews, indiaInfo]
      .reduce((total, result) => total + (result?.results?.length || 0), 0);

    console.log(`✅ Found ${totalSources} sources for: ${companyName}`);
    return combinedResults;
  } catch (error) {
    console.error("❌ Error searching company information:", error);
    return null;
  }
}

/**
 * Format search results with beautiful source display
 */
function formatSearchResults(searchResults) {
  if (!searchResults) {
    return "No live data available from web search.";
  }

  let formatted = "=== LIVE WEB SEARCH RESULTS ===\n\n";
  formatted += `Company Searched: ${searchResults.companyName}\n`;
  formatted += `Search Timestamp: ${searchResults.timestamp}\n\n`;

  const formatSection = (title, icon, searchData) => {
    let section = `${icon} ${title}\n\n`;

    if (searchData?.answer) {
      section += `💡 AI Summary:\n${searchData.answer}\n\n`;
    }

    if (searchData?.results && searchData.results.length > 0) {
      section += `📚 ${searchData.results.length} Source(s) Found:\n\n`;
      searchData.results.forEach((result, idx) => {
        const domain = extractDomain(result.url);
        const platformName = getPlatformName(domain);
        const score = result.score ? ` (Relevance: ${(result.score * 100).toFixed(0)}%)` : '';

        section += `  ${idx + 1}. ${platformName}${score}\n`;
        section += `     📄 ${result.title}\n`;
        section += `     🔗 ${result.url}\n`;
        section += `     📝 ${(result.content || '').substring(0, 300)}...\n`;

        if (result.published_date) {
          section += `     📅 Published: ${result.published_date}\n`;
        }
        section += `\n`;
      });
    } else {
      section += "❌ No data found in this category.\n\n";
    }

    section += "─".repeat(80) + "\n\n";
    return section;
  };

  formatted += formatSection(
    "COMPANY OVERVIEW & BASIC INFORMATION",
    "🔍",
    searchResults.basicInfo
  );

  formatted += formatSection(
    "FINANCIAL INFORMATION",
    "💰",
    searchResults.financialInfo
  );

  formatted += formatSection(
    "EMPLOYEE REVIEWS & FEEDBACK",
    "⭐",
    searchResults.employeeReviews
  );

  formatted += formatSection(
    "INDIAN COMPANY REGISTRATION DATA",
    "🇮🇳",
    searchResults.indiaInfo
  );

  formatted += "\n=== END OF SEARCH RESULTS ===\n";
  return formatted;
}

/**
 * Extract sources metadata with names and links
 */
function extractSourcesMetadata(searchResults) {
  if (!searchResults) {
    return {
      sources: [],
      sourcesList: "No sources available",
      sourcesDisplay: "No sources available"
    };
  }

  const allSources = [];
  const sourceCategories = {
    'Company Overview & Basic Information': {
      icon: '🔍',
      results: searchResults.basicInfo?.results || []
    },
    'Financial Information': {
      icon: '💰',
      results: searchResults.financialInfo?.results || []
    },
    'Employee Reviews & Feedback': {
      icon: '⭐',
      results: searchResults.employeeReviews?.results || []
    },
    'Indian Company Registration': {
      icon: '🇮🇳',
      results: searchResults.indiaInfo?.results || []
    },
  };

  // Create beautiful display format
  let sourcesDisplay = "📊 DATA SOURCES\n\n";
  sourcesDisplay += "All information below was gathered from the following verified sources:\n\n";
  sourcesDisplay += "═".repeat(80) + "\n\n";

  // Create simple list format
  let sourcesList = "Data Sources:\n\n";

  Object.entries(sourceCategories).forEach(([categoryName, categoryData]) => {
    const results = categoryData.results;

    if (results.length > 0) {
      sourcesDisplay += `${categoryData.icon} ${categoryName} (${results.length} source${results.length > 1 ? 's' : ''}):\n\n`;
      sourcesList += `${categoryName}:\n`;

      results.forEach((result, idx) => {
        const domain = extractDomain(result.url);
        const platformName = getPlatformName(domain);
        const score = result.score ? ` - Relevance: ${(result.score * 100).toFixed(0)}%` : '';

        const source = {
          category: categoryName,
          platform: platformName,
          domain: domain,
          url: result.url,
          title: result.title,
          score: result.score || 0,
          published_date: result.published_date || null,
        };

        allSources.push(source);

        // Beautiful display format
        sourcesDisplay += `  ${idx + 1}. ${platformName}${score}\n`;
        sourcesDisplay += `     ${result.title}\n`;
        sourcesDisplay += `     🔗 ${result.url}\n\n`;

        // Simple list format
        sourcesList += `  ${idx + 1}. ${platformName} - ${result.title}\n`;
        sourcesList += `     ${result.url}\n`;
      });

      sourcesDisplay += "\n";
      sourcesList += "\n";
    }
  });

  sourcesDisplay += "═".repeat(80) + "\n";
  sourcesDisplay += `Total Sources: ${allSources.length}\n`;
  sourcesDisplay += `Search Timestamp: ${searchResults.timestamp}\n`;

  return {
    sources: allSources,
    sourcesList: sourcesList,
    sourcesDisplay: sourcesDisplay,
    sourcesJson: JSON.stringify(allSources, null, 2),
    totalSources: allSources.length,
  };
}

// ----------------------------- HELPER FUNCTIONS -----------------------------

function isCompanyNotFound(content, searchResults) {
  if (searchResults && searchResults !== "No live data available from web search.") {
    return false;
  }
  const notFoundPatterns = [/COMPANY_NOT_FOUND:/i];
  return notFoundPatterns.some(pattern => pattern.test(content));
}

// -------------------------- ENHANCED PROMPT BUILDERS --------------------------

function buildCompanyDetailsPrompt(companyName, liveWebData) {
  return `You are a business research analyst. Analyze the LIVE WEB SEARCH DATA below about: ${companyName}

**CRITICAL INSTRUCTIONS:**
- The data below comes from REAL-TIME web search with SOURCE ATTRIBUTION
- You MUST use this data to provide analysis
- When citing information, reference the source by platform name (e.g., "According to LinkedIn", "As reported on Glassdoor")
- If search results show the company exists, provide analysis based on available information
- Only respond with "COMPANY_NOT_FOUND" if search results show NO information

**LIVE DATA FROM WEB SEARCH:**
${liveWebData}

**Your Task:**
Provide factual information with SOURCE CITATIONS:

1. **Business Nature**: Industry, sector, operations [cite platform name]
2. **Company Status**: Active/Inactive, registration [cite platform name]
3. **Financial Metrics**: 
   - Annual revenue [cite platform name]
   - Profit After Tax (PAT) [cite platform name]
   - If unavailable: "Financial data not publicly disclosed"
4. **Employee Information**:
   - Employee count [cite platform name]
   - Revenue per employee (if calculable)
   - Profit per employee (if calculable)
5. **Employee Sentiment**: Complaints/feedback [cite platform name]
6. **Market Position**: Industry benchmark [cite platform name]
7. **Engagement Level**: Employee engagement indicators [cite platform name]
8. **Growth Opportunities**: How Wazo Pulse (https://wazopulse.com) can help

**Output Format:**
- Use bullet points with headers
- ALWAYS cite sources: "According to [Platform Name]" or "[Platform Name] reports that..."
- If data unavailable: "Data not publicly available"
- Keep concise (1-2 lines per point)

**IMPORTANT:** Every fact MUST have a source citation with platform name.`;
}

function buildCompanySummaryPrompt(companyName, companyDetails) {
  return `You are a professional business analyst. Write a short factual summary of **${companyName}**.

**COMPANY DETAILS:**
${companyDetails}

**SUMMARY RULES:**
- One concise paragraph (80–120 words)
- Focus on what IS known
- Mention industry, operations, available metrics
- Objective and data-based
- Professional tone
- No headings or bullet points`;
}

function buildCompanyVoicePrompt(companyName, employeeReviewsData) {
  return `Analyze employee information for ${companyName}.

**EMPLOYEE REVIEW & COMPANY DATA:**
${employeeReviewsData}

**Task:** Identify 8-12 workplace challenges and map to Wazo Pulse solutions.

**Wazo Pulse Solutions:**
1. Recognition, 2. Badges, 3. Award, 4. Anonymous feedback, 5. Growth conversation, 
6. OKR and Goals, 7. 360 Feedback, 8. Public feed page

**Output Format:**
<challenge> ✅ <solution(s)>

**Examples:**
- Lack of recognition programs ✅ Recognition, Award, Badges
- Limited feedback channels ✅ Anonymous feedback, 360 Feedback
- Unclear career paths ✅ Growth conversation, OKR and Goals

**Rules:**
- One line per item
- Use ✅ separator
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
        searchResults: "Limited search data available. Proceeding with analysis.",
        sourcesMetadata: null,
      };
      return;
    }

    const formattedResults = formatSearchResults(searchResults);
    const sourcesMetadata = extractSourcesMetadata(searchResults);

    const resultCount = [
      searchResults.basicInfo?.results?.length || 0,
      searchResults.financialInfo?.results?.length || 0,
      searchResults.employeeReviews?.results?.length || 0,
      searchResults.indiaInfo?.results?.length || 0,
    ].reduce((a, b) => a + b, 0);

    // Display sources with names and links
    let sourceSummary = `✅ Found ${resultCount} verified sources!\n\n`;
    sourceSummary += `📊 Sources by category:\n`;

    if (searchResults.basicInfo?.results?.length) {
      sourceSummary += `  🔍 Company Info: ${searchResults.basicInfo.results.length} sources\n`;
      searchResults.basicInfo.results.slice(0, 3).forEach((result, idx) => {
        const platformName = getPlatformName(extractDomain(result.url));
        sourceSummary += `     ${idx + 1}. ${platformName}\n`;
      });
    }

    if (searchResults.financialInfo?.results?.length) {
      sourceSummary += `\n  💰 Financial Data: ${searchResults.financialInfo.results.length} sources\n`;
      searchResults.financialInfo.results.slice(0, 3).forEach((result, idx) => {
        const platformName = getPlatformName(extractDomain(result.url));
        sourceSummary += `     ${idx + 1}. ${platformName}\n`;
      });
    }

    if (searchResults.employeeReviews?.results?.length) {
      sourceSummary += `\n  ⭐ Employee Reviews: ${searchResults.employeeReviews.results.length} sources\n`;
      searchResults.employeeReviews.results.slice(0, 3).forEach((result, idx) => {
        const platformName = getPlatformName(extractDomain(result.url));
        sourceSummary += `     ${idx + 1}. ${platformName}\n`;
      });
    }

    if (searchResults.indiaInfo?.results?.length) {
      sourceSummary += `\n  🇮🇳 India Registration: ${searchResults.indiaInfo.results.length} sources\n`;
      searchResults.indiaInfo.results.forEach((result, idx) => {
        const platformName = getPlatformName(extractDomain(result.url));
        sourceSummary += `     ${idx + 1}. ${platformName}\n`;
      });
    }

    sourceSummary += "\n";

    yield {
      result: sourceSummary,
      step: 0,
      done: true,
      searchResults: formattedResults,
      sourcesMetadata: sourcesMetadata,
    };
  } catch (error) {
    console.error("❌ Error in performWebSearch:", error);
    yield {
      result: `⚠️ Search error: ${error.message}. Continuing...\n\n`,
      step: 0,
      done: true,
      searchResults: "Search encountered an error. Proceeding with limited data.",
      sourcesMetadata: null,
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
      model: "gpt-4o",
      messages: [{ role: "user", content: detailsPrompt }],
      stream: true,
      temperature: 0.7,
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
      model: "gpt-4o",
      messages: [{ role: "user", content: companySummaryPrompt }],
      stream: true,
      temperature: 0.7,
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
      model: "gpt-4o",
      messages: [{ role: "user", content: companyVoicePrompt }],
      stream: true,
      temperature: 0.8,
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
  let sourcesMetadata = null;
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
      sourcesMetadata = chunk.sourcesMetadata;
      yield { step: 0, done: true, stepComplete: "Web search completed", sourcesMetadata };
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
      yield {
        step: 3,
        done: true,
        stepComplete: "Solution mapping completed",
        finalStep: true,
        sourcesMetadata,
      };
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
  let sourcesMetadata = null;

  for await (const chunk of generateTriStepAnalysis(companyName)) {
    if (chunk.error) return { content: [{ type: "text", text: chunk.error }] };

    if (chunk.sourcesMetadata) {
      sourcesMetadata = chunk.sourcesMetadata;
    }

    if (chunk.result) {
      if (chunk.step === 1) companyDetails += chunk.result;
      else if (chunk.step === 2) finalAnalysis += chunk.result;
      else if (chunk.step === 3) companyVoice += chunk.result;
    }
  }

  const sourcesSection = sourcesMetadata?.sourcesDisplay || "No sources available";
  const combinedResult = `**STEP 1: COMPANY DETAILS**\n${companyDetails}\n\n**STEP 2: COMPREHENSIVE ANALYSIS**\n${finalAnalysis}\n\n**STEP 3: COMPANY VOICE REVIEWS**\n${companyVoice}\n\n${sourcesSection}`;

  console.log("✅ Tri-step analysis completed");
  return { content: [{ type: "text", text: combinedResult }] };
};

mcpServer.tool(
  "analyzeTriStepCompanyBusiness",
  {
    prompt: z.string().describe("Company name to analyze"),
  },
  processTriStepAnalysisRequest
);

// ----------------------------- HTTP ENDPOINTS -----------------------------

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
    let sourcesMetadata = null;
    const analysisStartTime = Date.now();
    const analysisUuid = uuidv4();

    console.log(`🔍 Starting analysis for: ${companyName} [UUID: ${analysisUuid}]`);

    for await (const chunk of generateTriStepAnalysis(companyName)) {
      if (chunk.error) {
        res.write(`data: ${JSON.stringify({ error: chunk.error })}\n\n`);
        break;
      }

      if (chunk.sourcesMetadata) {
        sourcesMetadata = chunk.sourcesMetadata;
        res.write(`data: ${JSON.stringify({
          sourcesMetadata: chunk.sourcesMetadata,
          type: "sources"
        })}\n\n`);
      }

      if (chunk.transition) {
        res.write(`data: ${JSON.stringify({ transition: chunk.transition, step: chunk.step })}\n\n`);
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
        const stepName = chunk.step === 0 ? "Live Web Search" :
          chunk.step === 1 ? "Company Research" :
            chunk.step === 2 ? "Strategic Analysis" : "Solution Mapping";

        if (chunk.step === 1) companyDetails += chunk.result;
        else if (chunk.step === 2) finalAnalysis += chunk.result;
        else if (chunk.step === 3) companyVoice += chunk.result;

        res.write(`data: ${JSON.stringify({
          text: chunk.result,
          step: chunk.step,
          stepName,
          uuid: analysisUuid
        })}\n\n`);
      }

      if (chunk.done && chunk.finalStep) {
        res.write(`data: ${JSON.stringify({
          done: true,
          allStepsComplete: true,
          analysisUuid,
          sourcesMetadata
        })}\n\n`);
        break;
      }
    }

    const analysisLatency = Date.now() - analysisStartTime;

    await pool.execute(
      `INSERT INTO company_analytc 
        (uuid, company_name, model, latency_ms, analysis, company_details, reviews, sources, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        analysisUuid,
        companyName,
        "gpt-4o-with-tavily-search",
        analysisLatency,
        finalAnalysis || "Analysis not completed.",
        companyDetails || "Details not available.",
        companyVoice || "Reviews not available.",
        sourcesMetadata?.sourcesJson || null,
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

// ----------------------------- ANALYTICS ENDPOINT WITH SOURCES -----------------------------

expressApp.get("/api/company-analytics/:uuid", async (req, res) => {
  const { uuid } = req.params;

  try {
    const [rows] = await pool.execute(
      `SELECT uuid, company_name, model, latency_ms, 
              analysis, company_details, reviews, sources, created_at 
       FROM company_analytc 
       WHERE uuid = ?`,
      [uuid]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Company analysis not found" });
    }

    const result = rows[0];

    if (result.sources) {
      try {
        result.sources_parsed = JSON.parse(result.sources);
      } catch (e) {
        result.sources_parsed = null;
      }
    }

    res.json({ success: true, data: result });
  } catch (error) {
    console.error("❌ Error fetching company analytics:", error);
    res.status(500).json({ error: "Failed to fetch company analytics" });
  }
});

// ----------------------------- SOURCES ENDPOINT -----------------------------

expressApp.get("/api/company-sources/:uuid", async (req, res) => {
  const { uuid } = req.params;

  try {
    const [rows] = await pool.execute(
      `SELECT company_name, sources, created_at 
       FROM company_analytc 
       WHERE uuid = ?`,
      [uuid]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Analysis not found" });
    }

    const sources = rows[0].sources ? JSON.parse(rows[0].sources) : [];

    // Group sources by category
    const groupedSources = sources.reduce((acc, source) => {
      if (!acc[source.category]) {
        acc[source.category] = [];
      }
      acc[source.category].push({
        platform: source.platform,
        title: source.title,
        url: source.url,
        domain: source.domain,
        score: source.score,
        published_date: source.published_date,
      });
      return acc;
    }, {});

    res.json({
      success: true,
      company_name: rows[0].company_name,
      sources_by_category: groupedSources,
      all_sources: sources,
      total_sources: sources.length,
      created_at: rows[0].created_at,
    });
  } catch (error) {
    console.error("❌ Error fetching sources:", error);
    res.status(500).json({ error: "Failed to fetch sources" });
  }
});

// ----------------------------- SERVER BOOT -----------------------------

async function initializeBusinessAnalyticsServer() {
  try {
    try {
      await pool.execute(`
        ALTER TABLE company_analytc 
        ADD COLUMN IF NOT EXISTS sources JSON
      `);
      console.log("✅ Database schema updated with sources column");
    } catch (dbError) {
      console.log("ℹ️ Database schema already up to date");
    }

    const mcpTransport = new StreamableHTTPServerTransport({
      port: 8081,
      host: "localhost",
    });

    await mcpServer.connect(mcpTransport);

    expressApp.listen(8081, () => {
      console.log("✅ Enhanced Business Analytics Server with Source Tracking is running!");
      console.log("📍 Available Endpoints:");
      console.log("   POST http://localhost:8081/tri-step-analysis-stream");
      console.log("   GET  http://localhost:8081/api/company-analytics/:uuid");
      console.log("   GET  http://localhost:8081/api/company-sources/:uuid");
    });
  } catch (error) {
    console.error("❌ Failed to initialize server:", error);
    process.exit(1);
  }
}

initializeBusinessAnalyticsServer().catch(console.error);
