import dotenv from "dotenv";
import { connectDB } from "./db/index.js";
import app from "./app.js";
dotenv.config({
	path: "./.env",
});
const PORT = process.env.PORT || 8000;
connectDB()
	.then(() => {	
		app.listen(PORT, () => {		
			console.log(`Server is running on port ${PORT}`);
		});
	})
	.catch((error) => {
		console.error("Error connecting to MongoDB:", error);
	})

/*
// MongoDB database connection
;(async () => {
	try {
		const res = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
		app.on("error", (err) => {
			console.error(err)
			throw err
		});
		app.listen(process.env.PORT, () => {
			console.log(`Server is running on port ${process.env.PORT}`);
		})
		console.log("Connected to MongoDB");
	} catch (error) {
		console.error("Error connecting to MongoDB:", error);
	}
})();
*/