import { asyncHandler } from "./../utils/asyncHandler.js";
import { ApiError } from "./../utils/ApiError.js";
import { User } from "./../models/user.model.js";
import { uploadOnCloudinary } from "./../utils/claudinary.js";
import { ApiResponse } from "./../utils/ApiResponse.js";

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

export { registerUser };
