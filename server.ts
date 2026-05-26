import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import apiRouter from "./routes/index.js";
import { db } from "./db/index.js";
import { sql } from "drizzle-orm";
import { connectRedis } from "./config/redis.js";
import uploadRoutes from "./routes/upload.routes.js";
import { notFoundHandler } from "./middleware/notFound.middleware.js";
import { errorHandler } from "./middleware/error.middleware.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api", apiRouter);
app.use("/api/uploads", uploadRoutes)

app.get("/", (req, res) => {
    res.send("TypeScript Backend Running 🚀");
});


const PORT = process.env.PORT || 5000;

async function startServer() {
    try {
        // Connect to Redis
        await connectRedis();

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
    } catch (error) {
        console.error("❌ Server startup failed:", error);
        process.exit(1);
    }
}
// hengeling the errors
app.use(notFoundHandler);
app.use(errorHandler);

startServer();