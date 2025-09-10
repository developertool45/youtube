import { asyncHandler } from "./../utils/asyncHandler.js";
import { ApiError } from "./../utils/ApiError.js";
import { User } from "./../models/user.model.js";
import { uploadOnCloudinary } from "./../utils/claudinary.js";
import { ApiResponse } from "./../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import { options } from "./../utils/costants.js";


const generateAceessAndrefreshToken = async(userId) => {
    try {
      const user = await User.findById(userId);
      const accessToken = await user.generateAccessToken();
      const refreshToken = await user.generateRefreshToken();

      user.refreshToken = refreshToken;
      await user.save({ validateBeforeSave: false });
      return {accessToken, refreshToken}
    } catch (error) {
      throw new ApiError(500, "something went wrong while generating tokens.")
    }
}
const registerUser = asyncHandler(async (req, res) => {
  // get user details from frontend
  // validation - not empty
  // check if user already exists :username, email
  // check for images, check for avatar
  // upload them to cloudinary, avatar
  // create user object - create entry in db
  //  remove password and refresh ttoken fild from response
  // check for user creation
  // return response

  const { fullname, email, username, password } = req.body;
  if (!fullname || !username || !email || !password) {
    throw new Error(400, "all fields are required!");
  }
  if ([fullname, email, username, password].some((field) => field?.trim() === "")) {
    throw new ApiError(400, "all fields are required!");
  }
  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });
  if (existedUser) {
    throw new Error(409, "user with email and username already exist.");
  }
  // must log req.files
  const avatarLocalPath = req.files?.avatar[0]?.path;
  //   const coverImageLocalPath = req.files?.coverImage[0]?.path;
  let coverImageLocalPath;

  if (req.files && Array.isArray(req.files?.coverImage) && req.files?.coverImage.length > 0) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  if (!avatarLocalPath) {
    throw new Error(400, "avatar must be required!");
  }
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new Error(400, "avatar must be required!");
  }
  const user = await User.create({
    fullname,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase(),
  });
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken -refreshTokenExpiry"
  );

  if (!createdUser) {
    throw new Error(500, "something went wrong, when user not created!");
  }
  return res.status(201).json(new ApiResponse(200, createdUser, "User registered successfully!"));
});

const loginUser = asyncHandler(async (req, res) => {
  // user details
  // username or email
  // find the user
  // password check
  // access token and refresh token
  // send cookies (secure)
  // response to user
  const { username, email, password } = req.body;  
  
  if (!(username || email) ) {
    throw new ApiError(400, "all field are required!")
  }
  const user = await User.findOne({
    $or:[{email}, {username}]
  })
  if (!user) {
    throw new ApiError(404, "user does not registered, please register now.")
  }
  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentials");
  }
  const { accessToken, refreshToken } = await generateAceessAndrefreshToken(user._id);
  
  const loggedInUser = await User.findById(user._id).select("-password -refreshToken")
  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(new ApiResponse(200, {
      user: loggedInUser, accessToken, refreshToken
      },"user logged in successfully"
    ))

});
const logoutUser = asyncHandler(async (req, res) => {
  // cookies clear
  // remove refresh token
  const userId = req.user._id;
  const user = await User.findByIdAndUpdate(userId,{
      $set: {
          refreshToken: undefined
      }
    }, {new:true});  

  res.status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, "user logout successfully!"))
});
const refreshAccessToken = asyncHandler(async (req, res) => {
 try {
   const incomingRefreshToken = req.cookies?.refreshToken || req.body.refreshToken;
   if (!incomingRefreshToken) {
     throw new ApiError(401, "unauthorized request!")
   }
   const decoded = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
   const user = await User.findById(decoded?._id)
   if (!user) {
     throw new ApiError(401, "invalid refresh token.")
   }
   if (incomingRefreshToken !== user?.refreshToken) {
     throw new ApiError(401, " refresh token is expired or used.")
   }
   const { accessToken, refreshToken } = generateAceessAndrefreshToken(user._id);
   
   return res
     .status(200)
     .cookie("accessToken", accessToken, options)
     .cookie("refreshToken", refreshToken, options)
     .json(new ApiResponse(200, {
       user: accessToken, refreshToken
       },"token refresh successfully."
     ))
 } catch (error) {
  throw new ApiError(401, error.message || "invalid refresh token ")
 }
});





export { registerUser,loginUser,logoutUser,refreshAccessToken };
