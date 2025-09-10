import jwt from "jsonwebtoken";
import { ApiError } from "../utils/ApiError.js";
import { User } from "./../models/user.model.js";
export const verifyJWT = async (req, _, next) => { // when res not use we can use _ instead.
	try {
		const token = req.cookies?.accessToken || req.header("Authorization").replace("Bearer ", "");
				
		if(!token) {
			throw new ApiError(401, "unauthorized request!");
		}
		const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
		const user = await User.findById(decodedToken._id).select("-password -refreshToken");
		if (!user) {
			// next : discuss about frontend 
			throw new ApiError(401, "invalid access token or token expired.");
		}
		req.user = user;
		next();
	} catch (error) {
		throw new ApiError(401, error.message);
	}
}