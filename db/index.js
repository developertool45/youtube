import mongoose from "mongoose";
import { DB_NAME } from "../utils/costants.js";
export const connectDB = async () => {
	try {
		const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
		console.log("Connected to MongoDB", connectionInstance.connection.host);
	} catch (error) {
		console.error("Error connecting to MongoDB:", error);
		process.exit(1);
	}
};
