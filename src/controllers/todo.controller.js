import { Todo } from "../models/todo.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import mongoose from "mongoose";

const createTodo = asyncHandler(async (req, res, next) => {
    const { title, content } = req.body;

    if (!title || !content) {
        return next(new ApiError(400, "Title and content are required"));
    }

    const todo = await Todo.create({
        title,
        content,
        owner: new mongoose.Types.ObjectId(req.user._id),
    });

    const createdTodo = await Todo.findById(todo._id);

    res.status(201).json(
        new ApiResponse(201, createdTodo, "Todo created successfully")
    );
});

const getTodos = asyncHandler(async (req, res, next) => {
    const todos = await Todo.aggregate([
        { $match: { owner: new mongoose.Types.ObjectId(req.user._id) } },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $project: {
                            _id: 1,
                            email: 1,
                            username: 1,
                            fullName: 1,
                            avatar: 1,

                            createdAt: 0,
                            updatedAt: 0,
                            __v: 0,
                        },
                    },
                ],
            },
        },
        { $unwind: "$owner" },
        {
            $project: {
                _id: 1,
                title: 1,
                content: 1,
                isCompleted: 1,
                owner: 1,
                createdAt: 1,
                updatedAt: 1,
            },
        },
    ]);

    res.status(200).json(
        new ApiResponse(200, todos, "Todos fetched successfully")
    );
});

const getTodo = asyncHandler(async (req, res, next) => {
    const todoId = req.params.id;
    const owner = req.user._id;

    if (!mongoose.isValidObjectId(todoId)) {
        return next(new ApiError(400, "Invalid todo ID"));
    }

    const todo = await Todo.findById(todoId);

    if (!todo) {
        return next(new ApiError(404, "Todo not found"));
    }

    if (todo.owner.toString() !== owner) {
        return next(
            new ApiError(403, "You are not authorized to access this todo")
        );
    }

    const detailTodo = await Todo.aggregate([
        { $match: { _id: new mongoose.Types.ObjectId(todoId) } },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $project: {
                            _id: 1,
                            email: 1,
                            username: 1,
                            fullName: 1,
                            avatar: 1,

                            createdAt: 0,
                            updatedAt: 0,
                            __v: 0,
                        },
                    },
                ],
            },
        },
        { $unwind: "$owner" },
        {
            $project: {
                _id: 1,
                title: 1,
                content: 1,
                isCompleted: 1,
                owner: 1,
                createdAt: 1,
                updatedAt: 1,
            },
        },
    ]);

    res.status(200).json(
        new ApiResponse(200, detailTodo, "Todo fetched successfully")
    );
});

const updateTodo = asyncHandler(async (req, res, next) => {
    const todoId = req.params.id;
    const owner = req.user._id;

    if (!mongoose.isValidObjectId(todoId)) {
        return next(new ApiError(400, "Invalid todo ID"));
    }

    const todo = await Todo.findById(todoId);

    if (!todo) {
        return next(new ApiError(404, "Todo not found"));
    }

    if (todo.owner.toString() !== owner) {
        return next(
            new ApiError(403, "You are not authorized to access this todo")
        );
    }

    const { title, content, isCompleted } = req.body;

    const updatedTodo = await Todo.findByIdAndUpdate(
        todoId,
        {
            title,
            content,
            isCompleted,
        },
        { new: true }
    );

    res.status(200).json(
        new ApiResponse(200, updatedTodo, "Todo updated successfully")
    );
});

const deleteTodo = asyncHandler(async (req, res, next) => {
    const todoId = req.params.id;
    const owner = req.user._id;

    if (!mongoose.isValidObjectId(todoId)) {
        return next(new ApiError(400, "Invalid todo ID"));
    }

    const todo = await Todo.findById(todoId);

    if (!todo) {
        return next(new ApiError(404, "Todo not found"));
    }

    if (todo.owner.toString() !== owner) {
        return next(
            new ApiError(403, "You are not authorized to access this todo")
        );
    }

    await Todo.findByIdAndDelete(todoId);

    res.status(200).json(
        new ApiResponse(200, null, "Todo deleted successfully")
    );
});

export { createTodo, getTodos, getTodo, updateTodo, deleteTodo };
