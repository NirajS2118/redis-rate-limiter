import redisClient from "../config/redis.js";

const rateLimitScript = `
    local count = redis.call('INCR', KEYS[1])

    if count == 1 then
        redis.call('EXPIRE', KEYS[1], ARGV[1])
    end

    local ttl = redis.call('TTL', KEYS[1])

    return {count, ttl}
`;

export function rateLimiter({
    name = "default",
    limit = 100,
    windowSeconds = 60
} = {}) {

    return async function (req, res, next) {

        try {

            const ip = req.ip;

            const key = `rate-limit:${name}:${ip}`;

            const result = await redisClient.eval(
                rateLimitScript,
                {
                    keys: [key],
                    arguments: [windowSeconds.toString()]
                }
            );

            const count = result[0];
            const ttl = result[1];

            const remaining = Math.max(
                0,
                limit - count
            );

            res.setHeader(
                "RateLimit-Limit",
                limit
            );

            res.setHeader(
                "RateLimit-Remaining",
                remaining
            );

            res.setHeader(
                "RateLimit-Reset",
                ttl
            );

            console.log(
                `IP: ${ip} | ${name} | ${count}/${limit} | TTL: ${ttl}s`
            );

            if (count > limit) {

                res.setHeader(
                    "Retry-After",
                    ttl
                );

                return res.status(429).json({
                    message: "Too many requests. Try again later.",
                    limit,
                    remaining: 0,
                    retryAfter: ttl
                });
            }

            next();

        } catch (error) {

            console.error(
                "Rate limiter error:",
                error
            );

            // Fail open for this demo.
            next();
        }
    };
}