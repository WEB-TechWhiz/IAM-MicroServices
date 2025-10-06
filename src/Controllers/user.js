 import { apiError } from "../utility/apiEError.js";
 import { asyncHandler } from "../utility/asyncHandler.js";
 import {User} from '../Models/User.model.js'
 import { ApiResponse } from "../utility/ApiResponse.js";
 import jwt from "jsonwebtoken"
 const registerUser=asyncHandler(async(req,res)=>{
   
    // point1 getting the payload(data) from the front end 
    const {userName,email,password}=req.body
    // check the validations
    if(
        [userName,email,password].some((field)=>field?.trim()==="")
    ){
        throw new apiError(400,"all fields are required")
    }
   const existedUser =  User.find({
        $or:[{userName},{email}]
     })
     if(existedUser){
        throw new apiError(409,"user with email or user name already exist")
     }
    const user = await User.create({
         userName:userName.toLowerCase(),
         email,
         password
      })
     const CreatedUser= await User.findById(user._id).select("-password -RefrenceToken")
     if (!CreatedUser){
        throw new apiError (500,"something went wrong while register the user")
     }

     return res.status(201).json(
        new ApiResponse(200,CreatedUser,"user register successfully")
     )

 })
   const LoginUser=asyncHandler(async(req, res, )=>{
     // req body=>data
    //  username or email
    // find the user
    // access and refresh token
    // send cokkie
    // send respones
    const {email,userName,password}=req.body
    
    if (!(userName && email)){
        throw new apiError(400,"username and email is required")
    }
   const user = await User.findOne({
        $or:[{userName},{email}]
    })

     if(!user){
        throw new apiError(404,"user does not exist")
     }
     const isPasswordVaild=await user.isPasswordCorrect(password)
      if(!isPasswordVaild){
        throw new apiError(401,"invalid user credantials")
     }
     const {accessToken,refressToken}=await generateAccessAndRefreshToken(user._id)

     const LogedInUser = awaitUser.findById(user._id).select("-password -refreshToken")
     const options={
        httpOnly:true,
        secure:true
     }
     return res.status(200)
      .Cookie("accessToken",accessToken,options)
      .Cookie("refressToken",refressToken,options)
      .json(
        new ApiResponse(200,{
            user:LogedInUser,accessToken,refressToken
        },"user logged In successfully")
      )
   })
   const LogoutUser=asyncHandler(async(req,res)=>{
    await User.findByIdAndUpdate(
         req.user._id,
         {
            $set:{
                RefrenceToken:undefined
            }
            
         },
         {
                new:true
            }
    )

    const options={
        httpOnly:true,
        secure:true
     }
     return res.status(200).clearCookie("accessToken",options).clearCookie("refressToken",options).
     json(
        new ApiResponse(200,{},"user logged out")
     )
   })
    const refreshAccessToken = asyncHandler(async(req, res,)=>{
        const incomingrefreshToken = req.Cookies.refressToken || req.body.refressToken
        
        if(!incomingrefreshToken){
            throw new apiError(401,"unauthorized request")
        }
    try {
           const decodedToken = jwt.verify(
                incomingrefreshToken,
                process.env.REFRESH_TOKEN_SECRET
            )
            const user = await User.findById(decodedToken?._id)
            if(!user){
                throw new apiError(401,"invalid refresh token")
            }
            if(incomingrefreshToken!==user?.refressToken){
                throw new apiError(401,"refresh token is expired or user")
            }
             const options={
            httpOnly:true,
            secure:true
         }
       const {accessToken,newrefressToken} = await generateAccessAndRefreshToken(user._id)
         return res.status(200).Cookie("accessToken",accessToken,options).Cookie("refressToken",newrefressToken,options).
         json(
            new ApiResponse(
                200,
                {accessToken, refressToken:newrefressToken},
                "accesss token refress"
            )
         )
    } catch (error) {
        throw new apiError(401,"invalid refresh token")
    }
    })
//    generate access token and refresh token
   const generateAccessAndRefreshToken = async(userId)=>{
    try {
       const user = await User.findById(userId) 
       const accessToken =user.generateAccessToken()
       const refressToken =user.generateRefressToken()

      user.refressToken=refressToken
      await user.save({validateBeforeSave:false})
   
      return {accessToken,refressToken}

    } catch (error) {
       throw new apiError(500,"Something went wront while generating access and refress token") 
    }
   }

 export{registerUser,LoginUser,LogoutUser,refreshAccessToken}