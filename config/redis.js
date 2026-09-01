import { createClient } from "redis";

const redisClient = createClient({
    url: process.env.REDIS_URL
});

redisClient.on("error", (error) => {
    console.error("Redis Client Error:", error);
});

export async function connectRedis() {
    await redisClient.connect();
    console.log("Connected to Redis");
}

export async function closeRedis() {
    if (redisClient.isOpen) {
        await redisClient.quit();
        console.log("Redis connection closed");
    }
}

export default redisClient;