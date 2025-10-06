import mongoose,{Schema} from "mongoose";
// Policies define what actions are allowed/denied.
const PolicieSchema= new Schema(
    {
        policeName:{
            type:String,
        },
        description:{
            type:String,
        },
        defaultVersionId:{
            type:string,
            default:'v1',
        },
        attachementCount:{
            type:Number,
        }
    },{timeStamp:true})
export const Polices=mongoose.model("Polices",PolicieSchema);                        