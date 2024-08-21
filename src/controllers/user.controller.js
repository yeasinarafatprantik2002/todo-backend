import { User } from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import {
    uploadOnCloudinary,
    deleteFromCloudinary,
} from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const generateAccessTokenAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId);
        user.refreshToken = user.generateRefreshToken();
        await user.save({ validateBeforeSave: false });

        const accessToken = user.generateAccessToken();
        const refreshToken = user.refreshToken;

        return { accessToken, refreshToken };
    } catch (error) {
        throw new ApiError(500, "Error generating token");
    }
};

const register = asyncHandler(async (req, res, next) => {
    const { fname, lname, email, password } = req.body;

    if (
        [fname, lname, email, password].some(
            (field) => (field === field?.trim()) === ""
        )
    ) {
        throw new ApiError(400, "Please fill in all fields");
    }

    const username = email.split("@")[0];

    const fullName = `${fname} ${lname}`;

    const existedUser = await User.findOne({ email });

    if (existedUser) {
        throw new ApiError(400, "User already exists");
    }

    const avatarLocalPath = req.file?.path;

    let avatarCloudinary;
    if (avatarLocalPath) {
        avatarCloudinary = await uploadOnCloudinary(avatarLocalPath);
    }

    if (!avatarCloudinary.url) {
        throw new ApiError(500, "Error uploading avatar");
    }

    const user = await User.create({
        fname,
        lname,
        fullName,
        username,
        email,
        password,
        avatar: avatarCloudinary?.url,
    });

    const createdUser = await User.findById(user._id).select("-password");

    return res
        .status(201)
        .json(
            new ApiResponse(201, createdUser, "User registered successfully")
        );
});

export { register };
