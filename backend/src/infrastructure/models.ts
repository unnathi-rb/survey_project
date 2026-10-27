import mongoose from "mongoose";

const optionSchema = new mongoose.Schema(
  { id: String, text: String, helperText: String },
  { _id: false },
);

const questionSchema = new mongoose.Schema(
  {
    id: String,
    type: String,
    label: String,
    helperText: String,
    required: Boolean,
    maxWords: Number,
    options: [optionSchema],
  },
  { _id: false },
);

const surveySchema = new mongoose.Schema({
  _id: String,
  title: String,
  description: String,
  status: String,
  version: { type: Number, default: 1 },
  questions: [questionSchema],
  createdAt: Date,
});

const answerSchema = new mongoose.Schema(
  { questionId: String, value: mongoose.Schema.Types.Mixed },
  { _id: false },
);

const responseSchema = new mongoose.Schema({
  _id: String,
  surveyId: { type: String, index: true },
  answers: [answerSchema],
  submittedAt: Date,
});

export const SurveyModel = mongoose.model("Survey", surveySchema);
export const ResponseModel = mongoose.model("Response", responseSchema);