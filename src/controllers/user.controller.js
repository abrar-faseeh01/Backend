 import { asyncHandler } from "../utils/asyncHandler.js";

// the following syntax is gonna be used a lot

const registerUser= asyncHandler( async (req,res)=>{
              res.status(200).json({
                message:"ok"
              })
})

export { registerUser };

