import express from "express";
import "dotenv/config";

import apiRouter from "./routes/api.js";

import {
    connectRedis,
    closeRedis
} from "./config/redis.js";


const app = express();

const port = process.env.PORT || 3000;


app.use(express.json());


// Health check
app.get("/health", (req, res) => {

    res.json({
        status: "OK"
    });

});


// API routes
app.use("/api", apiRouter);


// Connect Redis before accepting requests
await connectRedis();


const server = app.listen(
    port,
    () => {

        console.log(
            `Server running at http://localhost:${port}`
        );

    }
);


// Graceful shutdown
async function shutdown() {

    console.log("Shutting down server...");

    server.close(async () => {

        await closeRedis();

        process.exit(0);

    });
}


process.on("SIGINT", shutdown);

process.on("SIGTERM", shutdown);