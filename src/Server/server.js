// test server
import express from "express";

const app = express();

app.use(express.json());

// test server
app.get("/", (req, res) => {
    res.send("OK");
});

// API register
app.post("/api/agent/register", (req, res) => {
    console.log("REGISTER:", req.body);
    res.json({ message: "registered" });
});

// API login
app.post("/api/agent/login", (req, res) => {
    console.log("LOGIN:", req.body);

    // trả về token giả
    res.json({ token: "test-token-123" });
});

// API upload (client gửi binary)
app.post("/upload", (req, res) => {
    console.log("UPLOAD received");
    res.sendStatus(200);
});

app.listen(3000, () => {
    console.log("Server running on port 3000");
});