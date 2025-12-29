import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

// Database connection pool (recommended for performance)
export const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'imran_ai',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

export async function executeSqlQuery(sqlQuery) {
    let connection;
    try {
        connection = await pool.getConnection();
        const [rows] = await connection.execute(sqlQuery);
        return rows;
    } catch (error) {
        console.error("Database query failed:", error);
        throw new Error(`Database query failed: ${error.message}`);
    } finally {
        if (connection) {
            connection.release(); // Release the connection back to the pool
        }
    }
}