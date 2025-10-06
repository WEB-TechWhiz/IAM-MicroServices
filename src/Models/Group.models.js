import mongoose, { Schema } from "mongoose";
import User from "./User.model"
const GroupShema=mongoose.Schema(
    {
       groupName:{
        type:String,
       },
       description:{
        type:String,
       },
       member:{
        type:Schema.Types.ObjectId,
        ref:User
       } 
    },{timeStamp:true})

export const groups=mongoose.model("groups",GroupShema);
