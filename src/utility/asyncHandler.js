//  const asyncHandler=(requestHandler)=>{
//     return (req,res,next)=>{
//         Promise.resolve(requestHandler(req,res,next)).catch((err)=>next(err))
//     }
//  }

 const asyncHandler=(requestHandler)=>async(req,res,next)=>{
    try {
        await requestHandler(req,res,next)
    } catch (error) {
        res.Status(error.code || 500).json({
            Success:false,
            message:err.message
        })
        
    }
 }

 export {asyncHandler}
//  const asyncHandler=()=>{}
//  const asyncHandler=(fun)=>()=>{}
//  const asyncHandler= (fun)=>()=>{}