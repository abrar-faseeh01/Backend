 import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
// the following syntax is gonna be used a lot

const registerUser= asyncHandler( async (req,res)=>{
          const {email, fullName, userName, password}=req.body
          console.log("email :", email)

          if ([fullName,userName,password,email].some((field)=>field?.trim() ==="")) {
            throw new ApiError(400, "All fields are required")
          }
          
          const existedUser = User.findOne({
            $or : [{ userName },  { email }]
          })
          if(existedUser){
            throw new ApiError(409, "User with this email or username already exists")
          }

          const avatarLocalPath= req.files?.avatar[0]?.path;
          const coverImageLocalPath = req.files?.coverImage[0]?.path;

          if(!avatarLocalPath){
            throw new ApiError(400," Avatar file is required ")
          }


         const avatar= await uploadOnCloudinary(avatarLocalPath )
         const coverImage= await uploadOnCloudinary(coverImageLocalPath )
 
          if(!avatar){
            throw new ApiError(400," Avatar file is required ")
          }

           const user= await User.create({
            fullName,
            avatar: avatar.url,
            coverImage: coverImage?.url || "",
            email,
            password,
            userName: userName.toLowerCase()
           })

           const createdUser= await User.findById(user._id).select(
            "-password -refreshTokens"
           )
           if(!createdUser){
            throw new ApiError(500, "Something went wrong while registering the user")
           }

           return res.status(201).json(
            new ApiResponse(200, createdUser, "User registererd successfully")
           )
})

export { registerUser };

