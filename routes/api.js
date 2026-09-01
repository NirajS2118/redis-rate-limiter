import express from "express";
import { rateLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();


// Users API
router.get(
    "/users",
    rateLimiter({
        name: "users",
        limit: 5,
        windowSeconds: 10
    }),
    (req, res) => {

        res.json({
            message: "Users API"
        });

    }
);


// Expensive API
router.get(
    "/expensive",
    rateLimiter({
        name: "expensive",
        limit: 2,
        windowSeconds: 10
    }),
    (req, res) => {

        res.json({
            message: "Expensive API"
        });

    }
);


// Login API
router.post(
    "/login",
    rateLimiter({
        name: "login",
        limit: 3,
        windowSeconds: 30
    }),
    (req, res) => {

        res.json({
            message: "Login API"
        });

    }
);


export default router;