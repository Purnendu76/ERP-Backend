import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import apiRouter from "./routes/index.js";
import { db } from "./db/index.js";
import { sql } from "drizzle-orm";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api", apiRouter);

app.get("/", (req, res) => {
    res.send("TypeScript Backend Running 🚀");
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
    console.log(`🚀 Server running on port ${PORT}`);
    
    try {
        // Test database connection
        await db.execute(sql`SELECT 1`);
        console.log("🔌 Database connected successfully! 💾 ✨");
    } catch (err) {
        console.error("❌ Database connection failed:", err);
    }
});