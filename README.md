# Redis Rate Limiter

A Redis-backed rate limiter built with Node.js, Express, Redis, and Lua scripting.

## Architecture

Client
  ↓
Express
  ↓
Rate Limiter Middleware
  ↓
Redis Lua Script
  ↓
INCR + EXPIRE + TTL
  ↓
Rate Limit Decision
  ↓
200 / 429

## Features

- Redis-backed request counters
- Atomic INCR + EXPIRE using Lua
- IP-based rate limiting
- Route-specific rate limits
- TTL-based expiration
- RateLimit headers
- Retry-After header
- Health check endpoint
- Graceful Redis shutdown
- Docker Compose setup

## Tech Stack

- Node.js
- Express
- Redis
- Docker
- Lua

## Project Structure

```text
Request-rate-limiter/
│
├── config/
│   └── redis.js
│
├── middleware/
│   └── rateLimiter.js
│
├── routes/
│   └── api.js
│
├── .env.example
├── .gitignore
├── docker-compose.yml
├── index.js
├── package.json
├── package-lock.json
└── README.md