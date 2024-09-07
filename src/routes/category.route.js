import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
    createCategory,
    getCategories,
    getCategoriesById,
    updateCategory,
    deleteCategory,
    addTodoToCategory,
    removeTodoFromCategory,
} from "../controllers/category.controller.js";

const router = Router();

// private routes
router.post("/", verifyJWT, createCategory);
router.get("/", verifyJWT, getCategories);
router.get("/:id", verifyJWT, getCategoriesById);
router.patch("/:id", verifyJWT, updateCategory);
router.delete("/:id", verifyJWT, deleteCategory);
router.patch("/add/:todoId/:categoryId", verifyJWT, addTodoToCategory);
router.patch("/remove/:todoId/:categoryId", verifyJWT, removeTodoFromCategory);

export default router;
