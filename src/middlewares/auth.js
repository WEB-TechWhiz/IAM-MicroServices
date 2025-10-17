import { ApiError } from "../utility/ApiError.js";
import { asyncHandler } from "../utility/asyncHandler.js";
import jwt from "jsonwebtoken"
import { User } from "../Models/User.model.js";

export const verifyJWT = asyncHandler(async(req, _, next) => {
  try {
    const token = (
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ","")
    );
    if (!token || typeof token !== "string" || token.trim() === "") {
      throw new ApiError(401, "Unauthorized request: Token missing or invalid");
    }

    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    // Use the correct field name: "-password -RefrenceToken" if that's your schema
    const user = await User.findById(decodedToken?._id).select("-password -RefrenceToken");
    if (!user) {
      throw new ApiError(401, "Invalid Access Token");
    }
    req.user = user;
    next();
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid access token");
  }
});
