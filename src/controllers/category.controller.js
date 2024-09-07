import { Category } from "../models/category.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import mongoose from "mongoose";

const createCategory = asyncHandler(async (req, res, next) => {
    const { name, description } = req.body;
    const owner = req.user._id;

    if (!name) {
        return next(new ApiError(400, "Name is required"));
    }

    if (!mongoose.Types.ObjectId.isValid(owner)) {
        return next(new ApiError(400, "Invalid owner"));
    }

    const category = await Category.create({ name, description, owner });

    const createdCategory = await Category.findOne({
        _id: category._id,
    }).select("-__v -todos");

    return res
        .status(201)
        .json(
            new ApiResponse(
                201,
                createdCategory,
                "Category created successfully"
            )
        );
});

const getCategories = asyncHandler(async (req, res, next) => {
    const ownerId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(ownerId)) {
        return next(new ApiError(400, "Invalid owner"));
    }

    const categories = await Category.aggregate([
        {
            $match: { owner: new mongoose.Types.ObjectId(ownerId) },
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $project: {
                            _id: 0,
                            fullName: 1,
                            username: 1,
                            avatar: 1,
                            email: 1,
                        },
                    },
                ],
            },
        },
        {
            $unwind: "$owner",
        },
        {
            $lookup: {
                from: "todos",
                localField: "todos",
                foreignField: "_id",
                as: "todos",
                pipeline: [
                    {
                        $project: {
                            _id: 0,
                            title: 1,
                            description: 1,
                            status: 1,
                        },
                    },
                ],
            },
        },

        {
            $project: {
                __v: 0,
            },
        },
    ]);

    return res
        .status(200)
        .json(new ApiResponse(200, categories, "Categories retrieved"));
});

const getCategoriesById = asyncHandler(async (req, res, next) => {
    const ownerId = req.user._id;
    const categoryId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(ownerId)) {
        return next(new ApiError(400, "Invalid owner"));
    }

    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
        return next(new ApiError(400, "Invalid category"));
    }

    const category = await Category.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(categoryId),
                owner: new mongoose.Types.ObjectId(ownerId),
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $project: {
                            _id: 0,
                            fullName: 1,
                            username: 1,
                            avatar: 1,
                            email: 1,
                        },
                    },
                ],
            },
        },
        {
            $unwind: "$owner",
        },
        {
            $lookup: {
                from: "todos",
                localField: "todos",
                foreignField: "_id",
                as: "todos",
                pipeline: [
                    {
                        $project: {
                            _id: 0,
                            title: 1,
                            description: 1,
                            status: 1,
                        },
                    },
                ],
            },
        },

        {
            $project: {
                __v: 0,
            },
        },
    ]);

    if (category.length === 0) {
        return next(new ApiError(404, "Category not found"));
    }

    return res
        .status(200)
        .json(new ApiResponse(200, category, "Category retrieved"));
});

const updateCategory = asyncHandler(async (req, res, next) => {
    const { name, description } = req.body;
    const ownerId = req.user._id;
    const categoryId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(ownerId)) {
        return next(new ApiError(400, "Invalid owner"));
    }

    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
        return next(new ApiError(400, "Invalid category"));
    }

    const category = await Category.findOneAndUpdate(
        {
            _id: categoryId,
            owner: ownerId,
        },
        { name, description },
        { new: true }
    );

    if (!category) {
        return next(new ApiError(404, "Category not found"));
    }

    return res.status(200).json(new ApiResponse(200, {}, "Category updated"));
});

const deleteCategory = asyncHandler(async (req, res, next) => {
    const ownerId = req.user._id;
    const categoryId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(ownerId)) {
        return next(new ApiError(400, "Invalid owner"));
    }

    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
        return next(new ApiError(400, "Invalid category"));
    }

    const category = await Category.findById(categoryId);

    if (!category) {
        return next(new ApiError(404, "Category not found"));
    }

    if (!category.todos.length === 0) {
        return next(new ApiError(400, "Category has todos"));
    }

    await Category.findByIdAndDelete(categoryId);

    return res.status(200).json(new ApiResponse(200, {}, "Category deleted"));
});

export {
    createCategory,
    getCategories,
    getCategoriesById,
    updateCategory,
    deleteCategory,
};
