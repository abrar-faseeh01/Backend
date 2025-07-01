import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

const generateAccessAndRefreshTokens = async(userId)=>{
  try {
    const user = await User.findById(userId)
    const accessToken = user.generateAccessToken()
    const refreshToken = user.generateRefreshToken()
    user.refreshTokens = refreshToken
    await user.save({validateBeforeSave:false})

    return {accessToken, refreshToken}
  } catch (error) {
    throw new ApiError(401,"Something went wrong while generating tokens")
  }
}

// THE FOLLOWING SYNTAX IS GONNA BE USED A LOT
// REGISTER
const registerUser = asyncHandler(async (req, res) => {
  const { email, fullName, userName, password } = req.body;
 // console.log("email :", email);
  if (
    [fullName, userName, password, email].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }

  const existedUser = await User.findOne({
    $or: [{ userName }, { email }],
  });

  if (existedUser) {
    throw new ApiError(409, "User with this email or username already exists");
  }
  // console.log(req.files);

  const avatarLocalPath = req.files?.avatar[0]?.path;
  // const coverImageLocalPath = req.files?.coverImage[0]?.path;

  let coverImageLocalPath;
  if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
      coverImageLocalPath = req.files.coverImage[0].path
  }
  

  if (!avatarLocalPath) {
    throw new ApiError(400, " Avatar file is required ");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(400, " Avatar file is required ");
  }

  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    userName: userName.toLowerCase(),
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshTokens"
  );
  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user");
  }

  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User registererd successfully"));
});

// LOGIN
const loginUser = asyncHandler(async(req,res)=>{
          // steps:
          // data from req body
          // check username or email
          // find the user
          // password check
          // access and refresh token
          // send cookie


           const {email, userName, password} = req.body
           console.log(email)


           if(!(userName || email)){
            throw new ApiError(404, "username or email is required")
           }
    
           const user = await User.findOne({
            $or:[{userName},{email}]
           })
           if(!user){
            throw new ApiError(404,"user doesn't exist")
           }

           const isPasswordValid = await user.isPasswordCorrect(password)
           if(!isPasswordValid){
            throw new  ApiError(401, "password is invalid")
           }

           const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id)

           const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

           const options ={
            httpOnly: true,
            secure: true
           }

           return res.status(200).cookie("accessToken", accessToken, options). cookie("refreshToken", refreshToken, options).json(
            new ApiResponse(
              200,
              {
                user: loggedInUser,
                accessToken, 
                refreshToken
              },
              "User logged in successfully"
            )
           )

})

// Logout
const logoutUser = asyncHandler(async(req,res)=>{
   await User.findByIdAndUpdate(
    req.user._id,
    {
      $set:{
        refreshTokens: undefined
      }
    },
    {
      new:true
    }
   )

   const options ={
    httpOnly: true,
    secure: true
   }

   return res 
   .status(200)
   .clearCookie("accessToken", options)
   .clearCookie("refreshToken", options)
   .json(new ApiResponse(200, {}, "User logged out successfully"))
})


// Generate new access token using refresh token
const refreshAccessToken = asyncHandler(async(req,res)=>{
   const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken
   if(!incomingRefreshToken){
    throw new ApiError(401, "unauthorized request")
   }
   try {
     const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
     const user = await User.findById(decodedToken?._id)
  
     if(!user){
      throw new ApiError(401, "unauthorized request")
     }
  
     if(incomingRefreshToken !== user?.refreshToken){
      throw new ApiError(401, "Refresh Token is expired or used")
     }
     
     const option ={
      httpOnly: true,
      secure: true
     }
  
     const {accessToken, newRefreshToken} = await generateAccessAndRefreshTokens(user._id)
  
     return res
     .status(200)
     .cookie("accessToken", accessToken)
     .cookie("refreshToken", newRefreshToken)
     .json(
      new ApiResponse(
        200,
        {accessToken, newRefreshToken},
        "Access token refreshed successfully!"
      )
     )
} catch (error) {
  throw new ApiError(401, error?.message || "Invalid Refresh Token")
}

})

// Change current password
const changeCurrentPassword = asyncHandler(async(req,res)=>{
  const {oldPassword, newPassword} = req.body
  const user = await User.findById(req.user._id)
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

  if(!isPasswordCorrect){
    throw new ApiError(401, "Old password is incorrect")
  }

  user.password = newPassword
  await user.save({validateBeforeSave: false})

  return res.status(200).json(new ApiResponse(200, {}, "Password changed successfully!"))

})


export { changeCurrentPassword, loginUser, logoutUser, refreshAccessToken, registerUser };

