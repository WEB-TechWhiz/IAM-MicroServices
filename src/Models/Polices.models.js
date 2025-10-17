import mongoose,{Schema} from "mongoose";
// Policies define what actions are allowed/denied.
const PolicieSchema= new Schema(
    {
        name:{
            type:String,
        },
        description:{
            type:String,
        },
        defaultVersionId:{
            type:string,
            default:'v1',
        },
        actions:[{type:String}],
        resources: [{ type: String }],
    },{timeStamp:true})
export const Polices=mongoose.model("Polices",PolicieSchema);                        