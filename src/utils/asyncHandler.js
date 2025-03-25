//USING PROMISES
// What is the use of it? -> So that we don't have to write promises or try-catch again and again
const asyncHandler=(requestHandler)=>{
    return (req,res,next)=>{
        Promise.resolve(requestHandler(req,res,next)).catch((err)=>next(err))
    }
}

export { asyncHandler }

// USING TRY_CATCH

// const asyncHandler = (fn)=> async(req,res,next)=>{
//     try {
//         await fn(req,res,next)
        
//     } catch (error) {
//         res.status(err.code || 500).json({
//             success:false,
//             message:error.message
//         })
//     }
// }

