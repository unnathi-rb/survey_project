import mongoose from "mongoose";

export async function connectToDatabase() {
  const url = process.env.MONGO_URL;
  if (!url) {
    throw new Error("MONGO_URL is missing in the .env file");
  }

  await mongoose.connect(url);
  console.log("Connected to MongoDB");
}