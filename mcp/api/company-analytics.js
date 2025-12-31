import express from 'express';
import mysql from 'mysql2/promise';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

// Create Express app
const app = express();
app.use(cors({
  origin: true, // Allow all origins reflecting the request origin
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Create MySQL connection pool
const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'localhost',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DB || 'imran_ai',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Test database connection
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ MySQL connected successfully');
    connection.release();
  } catch (error) {
    console.error('❌ MySQL connection failed:', error.message);
    process.exit(1);
  }
}

// 1) GET all records (with pagination)
app.get("/api/company-analytics", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // Get total count
    const [countResult] = await pool.execute(
      'SELECT COUNT(*) as total FROM company_analytc'
    );
    const total = countResult[0].total;

    // Get paginated data
    const [rows] = await pool.execute(
      `SELECT id, uuid, company_name, number_of_employees, company_gstin, 
              model, latency_ms, created_at 
       FROM company_analytc 
       ORDER BY created_at DESC 
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    res.json({
      success: true,
      data: rows,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error("Error fetching company analytics:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch company analytics"
    });
  }
});

// 2) GET single record by ID
app.get("/api/company-analytics/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await pool.execute(
      `SELECT id, uuid, company_name, number_of_employees, company_gstin, 
              model, latency_ms, analysis, company_details, reviews, sources, dashboard_data, created_at 
       FROM company_analytc 
       WHERE uuid = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Company analysis not found"
      });
    }

    res.json({
      success: true,
      data: rows[0]
    });

  } catch (error) {
    console.error("Error fetching company analysis:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch company analysis"
    });
  }
});

// 6) DELETE a record by ID
app.delete("/api/company-analytics/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await pool.execute(
      'DELETE FROM company_analytc WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: "Company analysis not found"
      });
    }

    res.json({
      success: true,
      message: "Company analysis deleted successfully"
    });

  } catch (error) {
    console.error("Error deleting company analysis:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete company analysis"
    });
  }
});

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    message: "Company Analytics API",
    version: "1.0.0",
    endpoints: [
      "GET /api/company-analytics",
      "GET /api/company-analytics/:id",
      "DELETE /api/company-analytics/:id"
    ]
  });
});

// Start server
const PORT = process.env.PORT || 3001;

async function startServer() {
  await testConnection();

  app.listen(PORT, () => {
    console.log(`🚀 Company Analytics API running on http://localhost:${PORT}`);
    console.log(`📊 Available endpoints:`);
    console.log(`   GET  /api/company-analytics`);
    console.log(`   GET  /api/company-analytics/:id`);
    console.log(`   DELETE /api/company-analytics/:id`);
  });
}

startServer().catch(console.error);
