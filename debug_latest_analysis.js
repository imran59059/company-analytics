import mysql from 'mysql2/promise';

async function listDbs() {
    const pool = mysql.createPool({
        host: 'localhost',
        user: 'root',
        password: '',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
    });

    try {
        const [rows] = await pool.execute('SHOW DATABASES');
        console.log("Databases:", rows.map(r => r.Database));

        await checkTable(pool, 'imran_ai');
    } catch (err) {
        console.error("Error:", err);
    } finally {
        await pool.end();
    }
}

async function checkTable(pool, dbName) {
    try {
        await pool.query(`USE ${dbName}`);
        const [rows] = await pool.execute(
            `SELECT start.uuid, start.company_name, start.created_at, start.dashboard_data, 
                    LENGTH(start.dashboard_data) as data_len
             FROM company_analytc AS start
             ORDER BY start.created_at DESC 
             LIMIT 1`
        );
        if (rows.length > 0) {
            console.log("Latest Analysis:", rows[0].company_name, "at", rows[0].created_at);
            console.log("Dashboard Data Len:", rows[0].data_len);
            console.log("Content start:", rows[0].dashboard_data ? rows[0].dashboard_data.toString().substring(0, 100) : "NULL");
        } else {
            console.log("No data in table.");
        }
    } catch (e) {
        console.log("Query failed:", e.message);
    }
}

listDbs();
