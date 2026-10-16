import "dotenv/config";
import mongoose from "mongoose";
import { connectToDatabase } from "./infrastructure/db";
import { SurveyModel, ResponseModel } from "./infrastructure/models";

async function reset() {
  await connectToDatabase();

  await SurveyModel.deleteMany({});
  await ResponseModel.deleteMany({});

  console.log("All surveys and responses deleted");
  await mongoose.disconnect();
}

reset();