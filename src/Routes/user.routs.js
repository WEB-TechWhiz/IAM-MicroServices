import {Router} from "express";
import {registerUser } from "../Controllers/user";
import{LoginUser} from "../Controllers/user"
import{LogoutUser} from "../Controllers/user"
import{refreshAccessToken} from "../Controllers/user"
const router=Router()

router.route ("/register").post(registerUser)
router.route("/login").post(LoginUser)
// secured routes
router.route("/logout").post(verifyJWT,LogoutUser)
router.route('/refresh token').post(refreshAccessToken)
export default router;
