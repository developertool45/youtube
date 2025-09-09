import { v2 as cloudinary } from 'cloudinary';
import dotenv from "dotenv";
import fs from "fs";
dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_SECRET_KEY,
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;
    //upload the file on clodinary
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });

    // console.log("file is uploaded on cloudinary", response);
    fs.unlinkSync(localFilePath); // remove file synchronously
    return response;
  } catch (error) {
    // console.log(error);
    // remove the locally saved temp file as the upload operation got faild
    fs.unlinkSync(localFilePath);
    return null;
  }
};

export { uploadOnCloudinary };
