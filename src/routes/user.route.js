import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
    registerUser,
    loginUser,
    logoutUser,
    refreshToken,
    changePassword,
} from "../controllers/user.controller.js";

const router = Router();

// public routes
router.route("/register").post(upload.single("avatar"), registerUser);
router.route("/login").post(loginUser);

// private routes
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/refresh-token").post(refreshToken);
router.route("/change-password").post(verifyJWT, changePassword);

export default router;
