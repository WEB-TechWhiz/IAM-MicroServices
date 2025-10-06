// user ha ya nahi ha 
import { User } from "../Models/User.model";
import { apiError } from "../utility/apiEError";
import { asyncHandler } from "../utility/asyncHandler";
import jwt from 'jsonwebtoken'


export const verifyJWT=asyncHandler(async(req ,res ,next)=>{
 try {
     const token =  req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer","")
     if(!token){
       throw new apiError(401,"unauthorized request")
     }
    const decodedToken = jwt.verify(token,process.env.ACCESS_TOKEN_SECRET)
     const user = await User.findById(decodedToken?._id).select("-password -RefrenceToken")
     if(!user){
       throw new apiError(401,"Invalid Access Token")
     }
     req.user=user;
     next()
 } catch (error) {
     throw new apiError(401,error?.message || "invalid access token")
 }
})