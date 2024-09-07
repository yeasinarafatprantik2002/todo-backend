import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
    createCategory,
    getCategories,
    getCategoriesById,
} from "../controllers/category.controller.js";

const router = Router();

// private routes
router.post("/", verifyJWT, createCategory);
router.get("/", verifyJWT, getCategories);
router.get("/:id", verifyJWT, getCategoriesById);

export default router;
