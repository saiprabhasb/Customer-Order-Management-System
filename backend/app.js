const express = require("express");
const path = require("path");
const mysql = require("mysql2");
const WebSocket = require("ws");
require("dotenv").config(); // For environment variables

// WebSocket server setup
const wss = new WebSocket.Server({ noServer: true });
const clients = new Set();

// Broadcast a message to all connected WebSocket clients
function broadcast(data) {
    for (const client of clients) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    }
}

// Handle WebSocket connections
wss.on("connection", (ws) => {
    clients.add(ws);
    console.log("Client connected. Total connected clients:", clients.size);

    ws.on("close", (code, reason) => {
        clients.delete(ws);
        console.log(`Client disconnected. Total clients: ${clients.size}`);
    });

    ws.on("error", (err) => {
        console.error("WebSocket error:", err);
    });
});

// Express setup
const app = express();
const port = 3000;

// MySQL database connection
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

db.connect((err) => {
    if (err) {
        console.error("Error connecting to the database:", err);
    } else {
        console.log("Connected to the Database");
    }
});

app.use(express.json());
app.use(express.static(path.join(__dirname, "../frontend")));

// Middleware for role-based access
function authorizeRole(allowedRoles) {
    return (req, res, next) => {
        const { role } = req.headers;
        if (!role || !allowedRoles.includes(role)) {
            return res.status(403).json({ message: "Access denied" });
        }
        next();
    };
}

// API endpoints

// Fetch all products
app.get("/api/products", (req, res) => {
    const query = "SELECT * FROM products";
    db.query(query, (err, results) => {
        if (err) {
            res.status(500).json({ error: "Database error" });
        } else {
            res.json(results);
        }
    });
});

// Fetch paginated orders
app.get("/api/orders", (req, res) => {
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;

    const query = "SELECT * FROM orders LIMIT ? OFFSET ?";
    db.query(query, [limit, offset], (err, results) => {
        if (err) {
            res.status(500).json({ error: "Database error" });
        } else {
            res.json(results);
        }
    });
});

// Create a new order
app.post("/api/orders", (req, res) => {
    const { customer_name, total_price, status } = req.body;
    const query = "INSERT INTO orders (customer_name, total_price, status) VALUES (?, ?, ?)";
    db.query(query, [customer_name, total_price, status], (err, result) => {
        if (err) {
            res.status(500).json({ error: "Database error" });
        } else {
            broadcast({ orderId: result.insertId, customer_name, total_price, status });
            res.json({ message: "Order added successfully", orderId: result.insertId });
        }
    });
});

// Update an order's status
app.put("/api/orders/:id", (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    const query = "UPDATE orders SET status = ? WHERE id = ?";
    db.query(query, [status, id], (err, result) => {
        if (err) {
            res.status(500).json({ error: "Database error" });
        } else if (result.affectedRows === 0) {
            res.status(404).json({ message: "Order not found" });
        } else {
            broadcast({ orderId: id, status });
            res.json({ message: "Order status updated successfully" });
        }
    });
});

// Add a new product
app.post("/api/products", authorizeRole(["manager"]), (req, res) => {
    const { name, price, stock_quantity } = req.body;
    const query = "INSERT INTO products (name, price, stock_quantity) VALUES (?, ?, ?)";
    db.query(query, [name, price, stock_quantity], (err, result) => {
        if (err) {
            res.status(500).json({ error: "Database error" });
        } else {
            res.json({ message: "Product added successfully", productId: result.insertId });
        }
    });
});

// Generate order reports
app.get("/api/reports/orders", (req, res) => {
    const query = `
        SELECT status, COUNT(*) AS count
        FROM orders
        GROUP BY status
    `;
    db.query(query, (err, results) => {
        if (err) {
            res.status(500).json({ error: "Database error" });
        } else {
            res.json(results);
        }
    });
});

// Start the server
const server = app.listen(port, () => {
    console.log(`Successfully running on localhost ${port}`);
});

// Upgrade HTTP server for WebSocket connections
server.on("upgrade", (req, socket, head) => {
    wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit("connection", ws, req);
    });
});
