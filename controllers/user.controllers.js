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
const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword, confPassword } = req.body;
  if(!oldPassword || !newPassword || !confPassword) {
    throw new ApiError(400, "all fields are required!")
  }
  if (newPassword !== confPassword) {
    throw new ApiError(400, "new password and confirm password does not match!")
  }
  const user = await User.findById(req.user?._id);
  const isvalid = await user.isPasswordCorrect(oldPassword);
  if (!isvalid) {
    throw new ApiError(400, "invalid current password!")
  }
  user.password = newPassword;
  await user.save({ validateBeforeSave: false });
  return res.status(200).json(new ApiResponse(200, "password change successfully!"))
})
const getCurrentUser = asyncHandler(async (req, res) => {  
  return res.status(200).json(new ApiResponse(200, req.user, "user feched successfully!"))
})
const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullname, username } = req.body;
  if (!fullname || !username) {
    throw new ApiError(400, "all fields are required!")
  }

  const user = await User.findByIdAndUpdate(req.user?._id, {
    $set: {
      fullname,
      username
    }
  },
  { new: true }).select("-password -refreshToken -refreshTokenExpiry");
  return res.status(200).json(new ApiResponse(200, user, "account details updated successfully!"));
})
const updateAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;
  if (!avatarLocalPath) {
    throw new ApiError(400, "avatar file is missing")
  }
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  if (!avatar.url) {
    throw new ApiError(400, "Error while uploading avatar!")
  }
  const user = await User.findOneAndUpdate(req.user?._id, {
    $set: {
      avatar: avatar.url
    }
  }, { new: true }).select("-password")
  return res.status(200).json(new ApiResponse(200, user.avatar, "avatar update successfulluy"))
})
const updateCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path;
  if (!coverImageLocalPath) {
    throw new ApiError(400, "coverImage file is missing")
  }
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);
  if (!coverImage.url) {
    throw new ApiError(400, "Error while uploading coverImage!")
  }
  const user = await User.findOneAndUpdate(req.user?._id, {
    $set: {
      coverImage: coverImage.url
    }
  }, { new: true }).select("-password")
  return res.status(200).json(new ApiResponse(200, user.coverImage, "coverImage update successfulluy"))
})



export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateAvatar,
  updateCoverImage
};
