import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { createCategory } from "../controllers/category.controller.js";

const router = Router();

// private routes
router.post("/", verifyJWT, createCategory);

export default router;
