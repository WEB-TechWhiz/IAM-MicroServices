import { Router } from "express";
import { 
    registerUser, 
    loginUser, 
    logoutUser,
    changeCurrentPassword, 
    refreshAccessToken,
    getCurrentUser
} from "../Controllers/user.Controllers.js";
import { verifyJWT } from "../middlewares/auth.js";

const router = Router();

// Public routes (no authentication required)
router.route("/register").post(registerUser);
router.route("/login").post(loginUser);
router.route("/currentuser").get(verifyJWT,getCurrentUser);
router.route("/refresh-token").post(verifyJWT,refreshAccessToken);
router.route("/forgotPassword").post( verifyJWT,changeCurrentPassword);

// Protected routes (authentication required)
router.route("/logout").post(verifyJWT, logoutUser);

export default router;


