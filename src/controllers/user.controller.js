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

const registerUser = asyncHandler(async (req, res, next) => {
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

const loginUser = asyncHandler(async (req, res, next) => {
    const { email, password } = req.body;

    if (!email || !password) {
        throw new ApiError(400, "Please provide email and password");
    }

    const user = await User.findOne({ email });

    if (!user) {
        throw new ApiError(401, "Invalid credentials");
    }

    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
        throw new ApiError(401, "Invalid credentials");
    }

    const { accessToken, refreshToken } =
        await generateAccessTokenAndRefreshToken(user._id);

    const loggedInUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );

    const option = {
        httpOnly: true,
        secure: true,
    };

    return res
        .status(200)
        .cookie("accessToken", accessToken, option)
        .cookie("refreshToken", refreshToken, option)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser,
                    accessToken,
                    refreshToken,
                },
                "User logged in successfully"
            )
        );
});

const logoutUser = asyncHandler(async (req, res, next) => {
    const userId = req.user._id;
    await User.findByIdAndUpdate(
        userId,
        {
            $unset: { refreshToken: 1 },
        },
        { new: true }
    );

    const option = {
        httpOnly: true,
        secure: true,
    };

    return res
        .status(200)
        .clearCookie("refreshToken", option)
        .clearCookie("accessToken", option)
        .json(new ApiResponse(200, {}, "User logged out successfully"));
});

export { registerUser, loginUser, logoutUser };
