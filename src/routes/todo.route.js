import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
    createTodo,
    getTodos,
    getTodo,
    updateTodo,
    deleteTodo,
    toggleTodo,
} from "../controllers/todo.controller.js";

const router = Router();

router.post("/", verifyJWT, createTodo);
router.get("/", verifyJWT, getTodos);
router.get("/:id", verifyJWT, getTodo);
router.patch("/:id", verifyJWT, updateTodo);
router.delete("/:id", verifyJWT, deleteTodo);
router.patch("/:id/toggle", verifyJWT, toggleTodo);

export default router;
