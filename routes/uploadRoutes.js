import path from "path";
import express from "express";
import multer from "multer";
import {
  getStorage,
  ref,
  getDownloadURL,
  uploadBytesResumable,
} from "firebase/storage";
import app from "../config/firebase.config.js"

const router = express.Router();

// Initialize Firebase Storage
const storage = getStorage(app);

// Multer storage configuration
const multerStorage = multer.memoryStorage();

// Multer upload middleware
const upload = multer({
  storage: multerStorage,
}).single("image");

router.post("/", async (req, res) => {
  try {
    // Handle file upload
    upload(req, res, async (err) => {
      if (err) {
        console.error("Error uploading image:", err);
        return res.status(400).json({ message: "Error uploading image" });
      }

      // Check if file exists in the request
      if (!req.file) {
        console.log("No file provided in the request");
        return res.status(400).json({ message: "No image file provided" });
      }

      // Get current timestamp for filename uniqueness
      const dateTime = new Date().getTime();

      // Create storage reference with unique filename
      const storageRef = ref(
        storage,
        `files/${req.file.originalname + dateTime}`
      );

      // Create file metadata including the content type
      const metadata = {
        contentType: req.file.mimetype,
      };

      try {
        // Upload the file to Firebase Storage
        const snapshot = await uploadBytesResumable(
          storageRef,
          req.file.buffer,
          metadata
        );

        // Get the download URL of the uploaded file
        const downloadURL = await getDownloadURL(snapshot.ref);

        console.log(
          "File uploaded to Firebase Storage. Download URL:",
          downloadURL
        );

        // Respond with the download URL
      
          res.status(200).send({
            message: "Image uploaded successfully",
            image: downloadURL,
          });
      } catch (error) {
        console.error(
          "Error uploading file to Firebase Storage:",
          error.message
        );
        return res.status(500).json({ message: "Unable to upload image" });
      }
    });
  } catch (error) {
    console.error("Error processing image upload:", error);
    res.status(500).json({ message: "Server Error" });
  }
});

export default router;
