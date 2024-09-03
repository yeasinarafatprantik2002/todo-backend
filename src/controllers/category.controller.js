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

export { createCategory };
