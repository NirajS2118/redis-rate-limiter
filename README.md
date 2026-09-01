# Redis Rate Limiter

A production-oriented, Redis-backed API rate limiter built with **Node.js, Express, Redis, and Lua scripting**.

The project demonstrates how to implement a distributed rate limiter using Redis as shared state, Lua scripts for atomic operations, TTL-based expiration, route-specific limits, and standard HTTP rate-limit response headers.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [How It Works](#how-it-works)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Configuration](#environment-configuration)
- [Start Redis](#start-redis)
- [Start the Application](#start-the-application)
- [API Endpoints](#api-endpoints)
- [Rate Limits](#rate-limits)
- [Testing](#testing)
- [Rate Limit Headers](#rate-limit-headers)
- [Testing Redis Directly](#testing-redis-directly)
- [Understanding the Redis Keys](#understanding-the-redis-keys)
- [Why Lua Is Used](#why-lua-is-used)
- [Why Redis Instead of an In-Memory Map](#why-redis-instead-of-an-in-memory-map)
- [Distributed Architecture](#distributed-architecture)
- [Failure Handling](#failure-handling)
- [Stopping the Application](#stopping-the-application)
- [Stopping Redis](#stopping-redis)
- [Troubleshooting](#troubleshooting)
- [Future Improvements](#future-improvements)
- [License](#license)

---

# Overview

Rate limiting controls how many requests a client can make to an API within a specified period.

For example:

```text
5 requests / 10 seconds
```

If a client sends more than 5 requests within the 10-second window, the API returns:

```text
HTTP 429 Too Many Requests
```

This project identifies clients using their IP address and stores their request counters in Redis.

---

# Architecture

## Request Flow

```text
                    Client
                 Browser/Postman
                       |
                       v
              +----------------+
              |    Express     |
              |     Server     |
              +-------+--------+
                      |
                      v
             +------------------+
             | Rate Limiter     |
             | Middleware       |
             +--------+---------+
                      |
                      v
             +------------------+
             |      Redis       |
             |                  |
             | Lua Script       |
             |   INCR           |
             |   EXPIRE         |
             |   TTL            |
             +--------+---------+
                      |
                      v
              Rate Limit Check
                 /        \
                /          \
               v            v
             200            429
            Allowed       Blocked
```

---

# How It Works

For every request:

1. Express receives the request.
2. The rate limiter extracts the client's IP address.
3. A Redis key is generated using the rate-limit policy and IP.
4. A Lua script executes inside Redis.
5. The Lua script atomically:
   - increments the request counter
   - sets the expiration on the first request
   - retrieves the remaining TTL
6. The application checks the request count against the configured limit.
7. The server either:
   - allows the request, or
   - returns `429 Too Many Requests`.

Example:

```text
Request 1 → count = 1 → 200
Request 2 → count = 2 → 200
Request 3 → count = 3 → 200
Request 4 → count = 4 → 200
Request 5 → count = 5 → 200
Request 6 → count = 6 → 429
```

After the window expires:

```text
Redis key expires
      ↓
Counter resets
      ↓
Next request → count = 1
```

---

# Features

- Redis-backed request counters
- Atomic `INCR + EXPIRE` using Lua
- IP-based rate limiting
- Route-specific rate limits
- Fixed-window rate limiting
- Redis TTL-based expiration
- `RateLimit-Limit` header
- `RateLimit-Remaining` header
- `RateLimit-Reset` header
- `Retry-After` header
- HTTP `429 Too Many Requests`
- Health check endpoint
- Redis connection error handling
- Graceful Redis shutdown
- Environment variable configuration
- Docker Compose Redis setup
- Reusable Express middleware

---

# Tech Stack

| Technology | Purpose |
|---|---|
| Node.js | Runtime |
| Express | HTTP server and middleware |
| Redis | Shared rate-limit state |
| Lua | Atomic Redis operations |
| Docker | Local Redis environment |
| dotenv | Environment configuration |

---

# Project Structure

```text
redis-rate-limiter/
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
├── .env
├── .env.example
├── .gitignore
├── docker-compose.yml
├── index.js
├── package.json
├── package-lock.json
└── README.md
```

### `config/redis.js`

Contains Redis client configuration, connection logic, error handling, and graceful shutdown.

### `middleware/rateLimiter.js`

Contains the reusable rate-limiting middleware and Lua script.

### `routes/api.js`

Contains API routes with different rate-limit configurations.

### `index.js`

Application entry point.

### `.env`

Local environment configuration.

This file should **never be committed to Git**.

### `.env.example`

Template showing required environment variables.

### `docker-compose.yml`

Configuration for running Redis locally using Docker.

---

# Prerequisites

Make sure the following are installed:

- Node.js
- npm
- Docker Desktop
- Git

Verify Node.js:

```bash
node -v
```

Verify npm:

```bash
npm -v
```

Verify Docker:

```bash
docker --version
```

Verify Docker is running:

```bash
docker ps
```

---

# Installation

Clone the repository:

```bash
git clone https://github.com/<YOUR_USERNAME>/redis-rate-limiter.git
```

Enter the project directory:

```bash
cd redis-rate-limiter
```

Install dependencies:

```bash
npm install
```

---

# Environment Configuration

Create a `.env` file in the project root.

```text
redis-rate-limiter/
│
├── .env
├── index.js
└── ...
```

Add:

```env
PORT=3000
REDIS_URL=redis://localhost:6379
```

You can create `.env` from the example file.

### Windows CMD

```cmd
copy .env.example .env
```

### PowerShell

```powershell
Copy-Item .env.example .env
```

The `.env` file is ignored by Git.

---

# Start Redis

This project uses Docker to run Redis locally.

Start Redis:

```bash
docker compose up -d
```

Check that Redis is running:

```bash
docker ps
```

You should see a Redis container similar to:

```text
redis-rate-limiter
```

Redis should be available on:

```text
localhost:6379
```

---

# Verify Redis

You can directly connect to Redis using:

```bash
docker exec -it redis-rate-limiter redis-cli
```

Test the connection:

```text
PING
```

Expected response:

```text
PONG
```

Exit Redis:

```text
exit
```

---

# Start the Application

Start the application in development mode:

```bash
npm run dev
```

Or start normally:

```bash
npm start
```

Expected output:

```text
Connected to Redis
Server running at http://localhost:3000
```

---

# API Endpoints

## Health Check

```http
GET /health
```

URL:

```text
http://localhost:3000/health
```

Example response:

```json
{
  "status": "OK"
}
```

The health endpoint is not rate limited.

---

## Users API

```http
GET /api/users
```

URL:

```text
http://localhost:3000/api/users
```

Example response:

```json
{
  "message": "Users API"
}
```

Rate limit:

```text
5 requests / 10 seconds
```

---

## Expensive API

```http
GET /api/expensive
```

URL:

```text
http://localhost:3000/api/expensive
```

Example response:

```json
{
  "message": "Expensive API"
}
```

Rate limit:

```text
2 requests / 10 seconds
```

---

## Login API

```http
POST /api/login
```

URL:

```text
http://localhost:3000/api/login
```

Example response:

```json
{
  "message": "Login API"
}
```

Rate limit:

```text
3 requests / 30 seconds
```

> The `/api/login` endpoint uses `POST`. Typing the URL into a browser address bar sends a `GET` request, so use Postman, curl, or another HTTP client to test it.

---

# Rate Limits

| Endpoint | Method | Limit | Window |
|---|---|---:|---:|
| `/health` | GET | None | - |
| `/api/users` | GET | 5 | 10 seconds |
| `/api/expensive` | GET | 2 | 10 seconds |
| `/api/login` | POST | 3 | 30 seconds |

---

# Testing

## Test `/api/users`

Open Postman.

Create:

```text
GET http://localhost:3000/api/users
```

Send the request repeatedly.

Expected:

```text
Request 1 → 200 OK
Request 2 → 200 OK
Request 3 → 200 OK
Request 4 → 200 OK
Request 5 → 200 OK
Request 6 → 429 Too Many Requests
```

After approximately 10 seconds, the Redis key expires and requests are allowed again.

---

## Test `/api/expensive`

Create:

```text
GET http://localhost:3000/api/expensive
```

Expected:

```text
Request 1 → 200 OK
Request 2 → 200 OK
Request 3 → 429 Too Many Requests
```

---

## Test `/api/login`

In Postman:

```text
POST http://localhost:3000/api/login
```

Expected:

```text
Request 1 → 200 OK
Request 2 → 200 OK
Request 3 → 200 OK
Request 4 → 429 Too Many Requests
```

---

# Rate Limit Headers

Successful responses include rate-limit information.

Example:

```http
RateLimit-Limit: 5
RateLimit-Remaining: 3
RateLimit-Reset: 7
```

### `RateLimit-Limit`

Maximum number of requests allowed during the window.

Example:

```text
5
```

### `RateLimit-Remaining`

Number of requests remaining.

Example:

```text
3
```

### `RateLimit-Reset`

Approximate number of seconds until the current window expires.

Example:

```text
7
```

### `Retry-After`

Returned when the rate limit has been exceeded.

Example:

```http
Retry-After: 5
```

This tells the client approximately how long to wait before retrying.

---

# 429 Response

When the limit is exceeded:

```http
HTTP/1.1 429 Too Many Requests
```

Example:

```json
{
  "message": "Too many requests. Try again later.",
  "limit": 5,
  "remaining": 0,
  "retryAfter": 7
}
```

---

# Testing Redis Directly

Open Redis CLI:

```bash
docker exec -it redis-rate-limiter redis-cli
```

List Redis keys:

```text
KEYS *
```

You may see:

```text
1) "rate-limit:users:::1"
```

The exact key depends on the client's IP address.

---

## Check the Counter

For example:

```text
GET rate-limit:users:::1
```

Possible result:

```text
"4"
```

This means the client has made 4 requests in the current window.

---

## Check TTL

Run:

```text
TTL rate-limit:users:::1
```

Possible result:

```text
(integer) 7
```

This means approximately 7 seconds remain before the key expires.

After the TTL reaches zero, Redis automatically removes the key.

---

# Understanding the Redis Keys

The application uses the following format:

```text
rate-limit:<policy>:<ip>
```

For example:

```text
rate-limit:users:::1
```

This can be interpreted as:

```text
rate-limit
    |
    +-- policy: users
    |
    +-- client IP: ::1
```

Different APIs therefore have independent counters.

For example:

```text
rate-limit:users:::1
rate-limit:expensive:::1
rate-limit:login:::1
```

This allows each API to have a different rate-limit policy.

---

# Why Lua Is Used

The rate limiter needs to perform multiple Redis operations:

```text
INCR
EXPIRE
TTL
```

The important operations are:

```text
INCR + EXPIRE
```

They need to be handled atomically.

The Lua script performs:

```lua
local count = redis.call('INCR', KEYS[1])

if count == 1 then
    redis.call('EXPIRE', KEYS[1], ARGV[1])
end

local ttl = redis.call('TTL', KEYS[1])

return {count, ttl}
```

Conceptually:

```text
Request
   |
   v
Redis
   |
   +-- INCR
   |
   +-- Is this the first request?
   |       |
   |       +-- Yes → EXPIRE
   |
   +-- Get TTL
   |
   +-- Return count + TTL
```

The script executes atomically inside Redis.

This prevents another Redis command from executing between the operations.

---

# Why Redis Instead of an In-Memory Map?

A simple implementation can use:

```javascript
const requests = new Map();
```

However, this state exists only inside one Node.js process.

Consider:

```text
              Load Balancer
              /           \
             /             \
            v               v
       Server 1          Server 2
          |                 |
        Map 1             Map 2
```

The servers have separate counters.

Server 1 might have:

```text
user → 5
```

while Server 2 has:

```text
user → 1
```

The rate limit is therefore not globally consistent.

Redis provides shared state:

```text
       Server 1 ─┐
                 |
       Server 2 ─┼──→ Redis
                 |
       Server 3 ─┘
```

All application instances can access the same counter.

---

# Distributed Architecture

The system can be deployed like this:

```text
                         Internet
                            |
                            v
                    +---------------+
                    | Load Balancer |
                    +-------+-------+
                            |
              +-------------+-------------+
              |                           |
              v                           v
       +-------------+             +-------------+
       | Express     |             | Express     |
       | Server 1    |             | Server 2    |
       +------+------+             +------+------+
              |                           |
              +-------------+-------------+
                            |
                            v
                    +---------------+
                    |     Redis     |
                    |               |
                    | Rate Counters |
                    | TTL           |
                    +---------------+
```

Because Redis contains the shared rate-limit state, requests can be distributed between multiple Express servers while maintaining a shared limit.

---

# Failure Handling

The middleware currently uses a **fail-open** strategy.

If Redis becomes unavailable:

```text
Client
   |
   v
Express
   |
   v
Redis unavailable
   |
   v
Allow request
```

The request continues using:

```javascript
next();
```

This favors application availability.

For highly security-sensitive systems, a **fail-closed** strategy may be more appropriate:

```text
Redis unavailable
      |
      v
Reject request
```

The correct strategy depends on the application's requirements.

---

# Stopping the Application

If the application is running with:

```bash
npm run dev
```

press:

```text
Ctrl + C
```

The application has graceful shutdown handling and will close the Redis connection.

---

# Stopping Redis

To stop the Redis container:

```bash
docker compose down
```

To start it again:

```bash
docker compose up -d
```

Check the container:

```bash
docker ps
```

---

# Troubleshooting

## `Cannot use import statement outside a module`

Make sure `package.json` contains:

```json
"type": "module"
```

Example:

```json
{
  "name": "redis-rate-limiter",
  "version": "1.0.0",
  "type": "module"
}
```

---

## Redis connection error

Check that Docker is running:

```bash
docker ps
```

If the Redis container isn't running:

```bash
docker compose up -d
```

Then test Redis:

```bash
docker exec -it redis-rate-limiter redis-cli
```

Run:

```text
PING
```

Expected:

```text
PONG
```

---

## Port 3000 already in use

Change `.env`:

```env
PORT=3001
```

Then restart the Node.js application.

---

## Redis port 6379 already in use

Check Docker:

```bash
docker ps
```

If another Redis container is already using port `6379`, stop the conflicting container or change the Docker Compose port mapping.

---

## Rate-limit key is not appearing

Make sure you have actually sent a request to a rate-limited endpoint.

For example:

```text
GET http://localhost:3000/api/users
```

Then check:

```bash
docker exec -it redis-rate-limiter redis-cli
```

and:

```text
KEYS *
```

The key only exists after the application receives a request.

---

# Future Improvements

Possible improvements for a production-grade implementation include:

- Sliding-window rate limiting
- Token-bucket rate limiting
- Redis transactions or Redis Functions
- Redis Cluster
- Redis Sentinel / high availability
- Authentication-based rate limiting
- User ID-based rate limiting
- API-key-based rate limiting
- Configurable policies
- Per-user and per-IP limits
- Rate-limit metrics
- Prometheus monitoring
- Structured logging
- Automated tests
- Integration tests
- Load testing
- API Gateway integration
- Proxy-aware client IP handling
- Redis authentication and TLS
- Better Redis failure strategies

---

# License

This project is available for educational and development purposes.