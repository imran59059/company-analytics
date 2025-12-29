import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, 'mcp/.env') });

async function checkDatabase() {
    console.log('Checking database connection...');

    try {
        const pool = mysql.createPool({
            host: process.env.MYSQL_HOST || 'localhost',
            user: process.env.MYSQL_USER || 'root',
            password: process.env.MYSQL_PASSWORD || '',
            database: process.env.MYSQL_DB || 'imran_ai',
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0,
        });

        const connection = await pool.getConnection();
        console.log('✅ Connected to MySQL!');

        // Check if table exists
        const [tables] = await connection.query("SHOW TABLES LIKE 'company_analytc'");

        if (tables.length === 0) {
            console.log("⚠️ Table 'company_analytc' does NOT exist. Creating it...");

            const createTableQuery = `
        CREATE TABLE company_analytc (
          id INT AUTO_INCREMENT PRIMARY KEY,
          uuid VARCHAR(255) NOT NULL,
          company_name VARCHAR(255) NOT NULL,
          number_of_employees VARCHAR(255),
          company_gstin VARCHAR(255),
          model VARCHAR(255),
          latency_ms INT,
          analysis TEXT,
          company_details TEXT,
          reviews TEXT,
          sources JSON,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `;

            await connection.query(createTableQuery);
            console.log("✅ Table 'company_analytc' created successfully.");
        } else {
            console.log("✅ Table 'company_analytc' already exists.");

            // Check for 'sources' column
            const [columns] = await connection.query("SHOW COLUMNS FROM company_analytc LIKE 'sources'");
            if (columns.length === 0) {
                console.log("⚠️ Column 'sources' missing. Adding it...");
                await connection.query("ALTER TABLE company_analytc ADD COLUMN sources JSON");
                console.log("✅ Column 'sources' added.");
            }
        }

        connection.release();
        process.exit(0);
    } catch (error) {
        console.error('❌ Database check failed:', error);
        process.exit(1);
    }
}

checkDatabase();
