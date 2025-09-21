const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.PORTAL_DB_PATH || path.join(__dirname, 'portal.db');

// Initialize SQLite database
function initializeDB() {
    return new Promise((resolve, reject) => {
        // Ensure directory exists
        fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

        const db = new sqlite3.Database(DB_PATH, (err) => {
            if (err) {
                reject(err);
                return;
            }

            // Create nonces table
            db.run(`
                CREATE TABLE IF NOT EXISTS nonces (
                    nonce TEXT PRIMARY KEY,
                    client_ip TEXT NOT NULL,
                    issued_at INTEGER NOT NULL,
                    used INTEGER DEFAULT 0,
                    used_at INTEGER DEFAULT NULL
                )
            `, (err) => {
                if (err) {
                    reject(err);
                } else {
                    console.log('✅ Database schema initialized');
                    resolve(db);
                }
            });
        });
    });
}

// Insert new nonce
function insertNonce(db, nonce, clientIP, issuedAt) {
    return new Promise((resolve, reject) => {
        db.run(
            'INSERT INTO nonces (nonce, client_ip, issued_at) VALUES (?, ?, ?)',
            [nonce, clientIP, issuedAt],
            function(err) {
                if (err) reject(err);
                else resolve(this.lastID);
            }
        );
    });
}

// Check if nonce is valid (issued and not used)
function isNonceValid(db, nonce) {
    return new Promise((resolve, reject) => {
        db.get(
            'SELECT used FROM nonces WHERE nonce = ?',
            [nonce],
            (err, row) => {
                if (err) reject(err);
                else resolve(row && row.used === 0);
            }
        );
    });
}

// Mark nonce as used atomically
function markNonceUsed(db, nonce) {
    return new Promise((resolve, reject) => {
        const usedAt = Math.floor(Date.now() / 1000);

        db.run(
            'UPDATE nonces SET used = 1, used_at = ? WHERE nonce = ? AND used = 0',
            [usedAt, nonce],
            function(err) {
                if (err) {
                    reject(err);
                } else if (this.changes === 0) {
                    reject(new Error('Nonce already used or not found'));
                } else {
                    resolve(true);
                }
            }
        );
    });
}

// Get nonce statistics (for debugging)
function getNonceStats(db) {
    return new Promise((resolve, reject) => {
        db.all(
            'SELECT COUNT(*) as total, SUM(used) as used_count FROM nonces',
            [],
            (err, rows) => {
                if (err) reject(err);
                else resolve(rows[0]);
            }
        );
    });
}

module.exports = {
    initializeDB,
    insertNonce,
    isNonceValid,
    markNonceUsed,
    getNonceStats
};