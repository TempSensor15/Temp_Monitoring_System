const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const os = require('os');
const app = express();
const PORT = 5000;

// --- Allow CORS for all devices on same Wi-Fi ---
app.use(cors());
app.use(express.json());

// --- DB path ---
const DB_PATH = path.join(__dirname, 'sensor_data.db');

// --- Logging middleware ---
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// --- Reusable query runner ---
function runQuery(sql, res) {
  const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
      console.error("DB connection error:", err.message);
      return res.status(500).json({ error: "Database connection failed" });
    }
  });

  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error("Query error:", err.message);
      res.status(500).json({ error: "Query failed" });
    } else {
      const formatted = rows.map(row => ({
        timestamp: row.timestamp,
        temperature: row.temperature,
        humidity: row.humidity
      }));
      res.json(formatted);
    }
    db.close();
  });
}

// --- API routes ---
app.get('/api/data/1h', (req, res) => {
  const sql = `SELECT * FROM readings WHERE timestamp >= strftime('%Y-%m-%d %H:%M:%S', 'now', 'localtime', '-1 hours')`;
  console.log("1 hour data served to the user");
  runQuery(sql, res);
});

app.get('/api/data/12h', (req, res) => {
  const sql = `SELECT * FROM readings WHERE timestamp >= strftime('%Y-%m-%d %H:%M:%S', 'now', 'localtime', '-12 hours')`;
  console.log("12 hour data served to the user");
  runQuery(sql, res);
});

app.get('/api/data/24h', (req, res) => {
  const sql = `SELECT * FROM readings WHERE timestamp >= strftime('%Y-%m-%d %H:%M:%S', 'now', 'localtime', '-24 hours')`;
  console.log("24 hour data served to the user");
  runQuery(sql, res);
});

app.get('/api/data/7d', (req, res) => {
  const sql = `SELECT * FROM readings WHERE timestamp >= strftime('%Y-%m-%d %H:%M:%S', 'now', 'localtime', '-7 days')`;
  console.log("7 days data served to the user");
  runQuery(sql, res);
});

app.get('/api/data/30d', (req, res) => {
  const sql = `SELECT * FROM readings WHERE timestamp >= strftime('%Y-%m-%d %H:%M:%S', 'now', 'localtime', '-30 days')`;
  console.log("30 days data served to the user");
  runQuery(sql, res);
});

// --- Default route ---
app.get('/', (req, res) => {
  res.send('✅ Raspberry Pi Sensor API is Running');
});

function getLocalIp() {
  const networkInterfaces = os.networkInterfaces();
  let ipAddress = null;

  // Loop through network interfaces to find the first non-internal network address
  for (const interfaceName in networkInterfaces) {
    for (const interfaceDetails of networkInterfaces[interfaceName]) {
      if (!interfaceDetails.internal && interfaceDetails.family === 'IPv4') {
        ipAddress = interfaceDetails.address;
        break;
      }
    }
    if (ipAddress) break;
  }

  return ipAddress || 'IP address not found';
}

// GET route to send the Raspberry Pi's IP address
app.get('/get-ip', (req, res) => {
  const ipAddress = getLocalIp();
  res.json({ ipAddress });
});

// --- Start server ---
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server is running at http://<raspberry-ip>:${PORT}`);
});
