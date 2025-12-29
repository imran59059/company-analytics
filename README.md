# Company Analytics & Culture Diagnosis Platform

A comprehensive platform for analyzing company performance, culture, and strategic outlook using AI-powered insights and interactive dashboards.

## 🚀 Projects Overview

This repository contains three main components:

### 1. **AI Analysis Frontend** (`/frontend`)
*   **Tech Stack:** React, Vite, Tailwind CSS.
*   **Features:**
    *   AI Chat interface to analyze any company by name.
    *   Real-time streaming of analysis reports.
    *   Company details visualization (metrics, reviews, summary).
    *   History of past analyses.

### 2. **Culture Diagnosis Dashboard** (`/culture-diagnosis-pager`)
*   **Tech Stack:** Next.js, Radix UI, Recharts, Tailwind CSS.
*   **Features:**
    *   Interactive "Culture vs. Performance" bubble charts.
    *   Year-over-year financial trend analysis.
    *   Attrition anatomy and ROI projections.
    *   Strategic solution mapping.

### 3. **MCP Backend Server** (`/mcp`)
*   **Tech Stack:** Node.js, Express, Model Context Protocol (MCP), MySQL.
*   **Integrations:** OpenAI (GPT-4o), Tavily (Web Search).
*   **Features:**
    *   **Tri-Step Analysis Pipeline:** Web Search -> AI Detail Extraction -> Strategic Analysis -> Company Voice (Reviews).
    *   Streaming endpoints for real-time frontend updates.
    *   MySQL database integration for storing analysis history.

---

## 🛠️ Setup & Installation

### Prerequisites
*   Node.js (v18+)
*   MySQL Database

### 1. Database Setup
Ensure you have a MySQL database named `imran_ai` (or update config). The application will automatically create the required `company_analytc` table on first run.

### 2. Backend Setup (`/mcp`)
1.  Navigate to the directory:
    ```bash
    cd mcp
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Configure `.env` file:
    ```env
    OPENAI_API_KEY=your_openai_key
    TAVILY_API_KEY=your_tavily_key
    MYSQL_HOST=localhost
    MYSQL_USER=root
    MYSQL_PASSWORD=your_password
    MYSQL_DB=imran_ai
    ```
4.  Start the servers:
    ```bash
    # Start AI Analysis Server (Port 8081)
    node server-openai.js

    # Start API Server (Port 3001)
    node api/company-analytics.js
    ```

### 3. Frontend Setup (`/frontend`)
1.  Navigate to the directory:
    ```bash
    cd frontend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Run development server:
    ```bash
    npm run dev
    ```
    Access at `http://localhost:5173`.

### 4. Dashboard Setup (`/culture-diagnosis-pager`)
1.  Navigate to the directory:
    ```bash
    cd culture-diagnosis-pager
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Run development server:
    ```bash
    npm run dev
    ```
    Access at `http://localhost:3000`.

---

## 🌟 Key Features
*   **Live Web Search:** Uses Tavily API to fetch real-time data about companies.
*   **Streaming AI:** Analysis is streamed chunk-by-chunk for a responsive UX.
*   **Dual View:** Switch between "Chat Analysis" and "Strategic Dashboard" views.
*   **Data Persistence:** All AI analyses are saved to MySQL for future reference.
