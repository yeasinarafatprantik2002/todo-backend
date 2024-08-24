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

const refreshToken = asyncHandler(async (req, res, next) => {
    const incomingRefreshToken =
        req.cookies.refreshToken || req.headers["x-refresh-token"];

    if (!incomingRefreshToken) {
        throw new ApiError(401, "Unauthorized request");
    }
    try {
        const decoded = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        );

        const user = await User.findById(decoded._id);

        if (!user) {
            throw new ApiError(401, "Unauthorized");
        }

        if (user.refreshToken !== incomingRefreshToken) {
            throw new ApiError(401, "Unauthorized");
        }

        const { accessToken, refreshToken } =
            await generateAccessTokenAndRefreshToken(user._id);

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
                        accessToken,
                        refreshToken,
                    },
                    "Token refreshed successfully"
                )
            );
    } catch (error) {
        throw new ApiError(401, "Unauthorized");
    }
});

const changePassword = asyncHandler(async (req, res, next) => {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        throw new ApiError(400, "Please provide current and new password");
    }

    const user = await User.findById(req.user._id);

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    const isMatch = await user.matchPassword(currentPassword);

    if (!isMatch) {
        throw new ApiError(401, "Invalid current password");
    }

    user.password = newPassword;
    await user.save();

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Password changed successfully"));
});

const getCurrentUser = asyncHandler(async (req, res, next) => {
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id),
            },
        },

        {
            $lookup: {
                from: "categories",
                localField: "user",
                foreignField: "_id",
                as: "categories",
                pipeline: [
                    {
                        $match: {
                            owner: new mongoose.Types.ObjectId(req.user._id),
                        },
                    },
                    {
                        $project: {
                            _id: 1,
                            name: 1,
                            description: 1,
                        },
                    },

                    {
                        $lookup: {
                            from: "todos",
                            localField: "_id",
                            foreignField: "category",
                            as: "todos",
                            pipeline: [
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
                                                    fname: 1,
                                                    lname: 1,
                                                    fullName: 1,
                                                    username: 1,
                                                    email: 1,
                                                    avatar: 1,
                                                },
                                            },
                                        ],
                                    },
                                },
                                {
                                    $project: {
                                        _id: 1,
                                        name: 1,
                                        content: 1,
                                        isCompleted: 1,
                                    },
                                },

                                {
                                    $sort: {
                                        createdAt: -1,
                                    },
                                },
                            ],
                        },
                    },
                ],
            },
        },

        {
            $addFields: {
                categories: {
                    $map: {
                        input: "$categories",
                        as: "category",
                        in: {
                            _id: "$$category._id",
                            name: "$$category.name",
                            description: "$$category.description",
                            todos: "$$category.todos",
                        },
                    },
                },
            },
        },

        {
            $project: {
                _id: 1,
                fname: 1,
                lname: 1,
                fullName: 1,
                username: 1,
                email: 1,
                avatar: 1,
                categories: 1,
            },
        },
    ]);

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    return res.status(200).json(new ApiResponse(200, user, "User found"));
});

const updateUser = asyncHandler(async (req, res, next) => {
    const { fname, lname } = req.body;

    if ([fname, lname].some((field) => (field === field?.trim()) === "")) {
        throw new ApiError(400, "Please fill in all fields");
    }

    const user = await User.findById(req.user._id);

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    user.fname = fname || user.fname;
    user.lname = lname || user.lname;
    user.fullName = `${fname} ${lname}`;

    await user.save();

    const updatedUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );

    return res
        .status(200)
        .json(new ApiResponse(200, updatedUser, "User updated successfully"));
});

const updateAvatar = asyncHandler(async (req, res, next) => {
    const oldAvatar = req.user.avatar;

    const avatarLocalPath = req.file?.path;

    let avatarCloudinary;
    if (avatarLocalPath) {
        avatarCloudinary = await uploadOnCloudinary(avatarLocalPath);
    }

    if (!avatarCloudinary.url) {
        throw new ApiError(500, "Error uploading avatar");
    }

    if (oldAvatar) {
        await deleteFromCloudinary(oldAvatar);
    }

    const user = await User.findById(req.user._id);

    user.avatar = avatarCloudinary.url;
    await user.save();

    const updatedUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );

    return res
        .status(200)
        .json(new ApiResponse(200, updatedUser, "Avatar updated successfully"));
});

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshToken,
    changePassword,
    getCurrentUser,
    updateUser,
    updateAvatar,
};
