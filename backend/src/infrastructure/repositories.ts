import { Survey } from "../domain/survey";
import { SurveyResponse } from "../domain/SurveyResponse";
import type { SurveyStatus } from "../domain/SurveyStatus";
import type { QuestionType } from "../domain/Questiontype";
import type { Question } from "../domain/Question";
import type { Answer } from "../domain/SurveyResponse";
import { SurveyModel, ResponseModel } from "./models";

// ---------- shapes of what comes out of MongoDB ----------

type SurveyDoc = {
  _id: string;
  title: string;
  description: string;
  status: string;
  questions: {
    id: string;
    type: string;
    label: string;
    helperText: string;
    required?: boolean;
    options: { id: string; text: string }[];
  }[];
  createdAt: Date;
};

type ResponseDoc = {
  _id: string;
  surveyId: string;
  answers: { questionId: string; value: unknown }[];
  submittedAt: Date;
};

// ---------- turning saved data back into domain objects ----------

function toSurvey(doc: SurveyDoc): Survey {
  const questions: Question[] = doc.questions.map((q) => ({
    id: q.id,
    type: q.type as QuestionType,
    label: q.label,
    helperText: q.helperText,
    required: q.required === true,
    options: q.options.map((o) => ({ id: o.id, text: o.text })),
  }));

  return Survey.restore({
    id: doc._id,
    title: doc.title,
    description: doc.description,
    status: doc.status as SurveyStatus,
    questions: questions,
    createdAt: doc.createdAt,
  });
}

function toResponse(doc: ResponseDoc): SurveyResponse {
  return SurveyResponse.restore({
    id: doc._id,
    surveyId: doc.surveyId,
    answers: doc.answers as Answer[],
    submittedAt: doc.submittedAt,
  });
}

// ---------- surveys ----------

// Save a survey (creates it, or replaces the old copy).
export async function saveSurvey(survey: Survey): Promise<void> {
  await SurveyModel.replaceOne(
    { _id: survey.id },
    {
      _id: survey.id,
      title: survey.title,
      description: survey.description,
      status: survey.status,
      questions: survey.questions,
      createdAt: survey.createdAt,
    },
    { upsert: true },
  );
}

// Find one survey. Gives null if it does not exist.
export async function findSurvey(id: string): Promise<Survey | null> {
  const doc = await SurveyModel.findById(id).lean();
  if (!doc) return null;
  return toSurvey(doc as unknown as SurveyDoc);
}

// One page of surveys, newest first, with an optional status filter.
export async function listSurveys(
  status: SurveyStatus | undefined,
  page: number,
  pageSize: number,
): Promise<{ items: Survey[]; total: number }> {
  const filter = status ? { status: status } : {};

  const total = await SurveyModel.countDocuments(filter);
  const docs = await SurveyModel.find(filter)
    .sort({ createdAt: -1, _id: -1 }) // newest first, id breaks ties
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .lean();

  const items = (docs as unknown as SurveyDoc[]).map(toSurvey);
  return { items: items, total: total };
}

// ---------- responses ----------

export async function saveResponse(response: SurveyResponse): Promise<void> {
  await ResponseModel.replaceOne(
    { _id: response.id },
    {
      _id: response.id,
      surveyId: response.surveyId,
      answers: response.answers,
      submittedAt: response.submittedAt,
    },
    { upsert: true },
  );
}

// One page of responses for a survey, newest first.
export async function listResponses(
  surveyId: string,
  page: number,
  pageSize: number,
): Promise<{ items: SurveyResponse[]; total: number }> {
  const total = await ResponseModel.countDocuments({ surveyId: surveyId });
  const docs = await ResponseModel.find({ surveyId: surveyId })
    .sort({ submittedAt: -1, _id: -1 })
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .lean();

  const items = (docs as unknown as ResponseDoc[]).map(toResponse);
  return { items: items, total: total };
}

// ALL responses of a survey (used for the results summary).
export async function findAllResponses(surveyId: string): Promise<SurveyResponse[]> {
  const docs = await ResponseModel.find({ surveyId: surveyId }).lean();
  return (docs as unknown as ResponseDoc[]).map(toResponse);
}
export async function deleteSurvey(id: string): Promise<void> {
  await SurveyModel.deleteOne({ _id: id });
}