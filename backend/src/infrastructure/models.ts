import mongoose from "mongoose";

// A survey is stored as ONE document, with its questions and options inside it.
const optionSchema = new mongoose.Schema(
  { id: String, text: String },
  { _id: false },
);

const questionSchema = new mongoose.Schema(
  {
    id: String,
    type: String,
    label: String,
    helperText: String,
    required: Boolean,
    options: [optionSchema],
  },
  { _id: false },
);

const surveySchema = new mongoose.Schema({
  _id: String, // we use our own id (the one the domain made)
  title: String,
  description: String,
  status: String,
  questions: [questionSchema],
  createdAt: Date,
});

// A response is stored separately, and points to its survey.
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