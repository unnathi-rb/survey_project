import { SurveyModel, ResponseModel } from "./models";
import { Survey } from "../domain/survey";
import { Question } from "../domain/Question";
import type { SurveyStatus } from "../domain/SurveyStatus";
import { SurveyResponse, type Answer } from "../domain/SurveyResponse";
import { DomainError } from "../domain/DomainError";

export async function findSurvey(id: string): Promise<Survey | null> {
  const doc = await SurveyModel.findById(id).lean();
  if (!doc) return null;

  return Survey.restore({
    id: doc._id!.toString(),
    title: doc.title ?? "",
    description: doc.description ?? "",
    status: (doc.status as SurveyStatus) ?? "draft",
    version: doc.version ?? 1,
    questions: (doc.questions || []).map((q: any) =>
      Question.restore({
        id: q.id,
        type: q.type,
        label: q.label,
        helperText: q.helperText ?? "",
        required: q.required ?? true,
        options: (q.options || []).map((o: any) => ({
          id: o.id,
          text: o.text,
          helperText: o.helperText ?? "",
        })),
        maxWords: q.maxWords ?? null,
      })
    ),
    createdAt: doc.createdAt ?? new Date(),
  });
}

export async function saveSurvey(survey: Survey): Promise<void> {
  const data = survey.toJSON();
  const fields = {
    title: data.title,
    description: data.description,
    status: data.status,
    version: data.version,
    questions: data.questions,
    createdAt: data.createdAt,
  };

  const loadedVersion = survey.loadedVersion;

  // brand-new survey (create, or seed): just write it
  if (loadedVersion === undefined) {
    await SurveyModel.replaceOne(
      { _id: survey.id },
      { _id: data.id, ...fields },
      { upsert: true },
    );
    return;
  }

  // existing survey: write ONLY if the database still has the version we loaded
  const result = await SurveyModel.updateOne(
    { _id: survey.id, version: loadedVersion },
    { $set: fields },
  );
  if (result.matchedCount === 0) {
    throw new DomainError(
      "This survey was changed somewhere else. Reload to see the latest version.",
      "conflict",
    );
  }
}

export async function deleteSurvey(id: string): Promise<void> {
  await SurveyModel.findByIdAndDelete(id);
}

export async function listSurveys(
  statusFilter?: SurveyStatus,
  page: number = 1,
  pageSize: number = 10
): Promise<{ items: Survey[]; total: number }> {
  const query = statusFilter ? { status: statusFilter } : {};
  const skip = (page - 1) * pageSize;

  const [docs, total] = await Promise.all([
    SurveyModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(pageSize).lean(),
    SurveyModel.countDocuments(query),
  ]);

  const items = docs.map((doc: any) =>
    Survey.restore({
      id: doc._id!.toString(),
      title: doc.title ?? "",
      description: doc.description ?? "",
      status: (doc.status as SurveyStatus) ?? "draft",
      version: doc.version ?? 1,
      questions: (doc.questions || []).map((q: any) =>
        Question.restore({
          id: q.id,
          type: q.type,
          label: q.label,
          helperText: q.helperText ?? "",
          required: q.required ?? true,
          options: (q.options || []).map((o: any) => ({
            id: o.id,
            text: o.text,
            helperText: o.helperText ?? "",
          })),
          maxWords: q.maxWords ?? null,
        })
      ),
      createdAt: doc.createdAt ?? new Date(),
    })
  );

  return { items, total };
}

// How a response looks in MongoDB. The database field is called submittedAt,
// and the id is stored as _id. The domain object uses id and createdAt.
type ResponseDoc = {
  _id: string;
  surveyId: string;
  answers: Answer[];
  submittedAt: Date;
};

// Database document -> domain object (the same rules apply again when loading).
function toResponse(doc: ResponseDoc): SurveyResponse {
  return SurveyResponse.restore({
    id: String(doc._id),
    surveyId: doc.surveyId,
    answers: doc.answers,
    createdAt: doc.submittedAt,
  });
}

export async function listResponses(
  surveyId: string,
  page: number = 1,
  pageSize: number = 10,
): Promise<{ items: SurveyResponse[]; total: number }> {
  const query = { surveyId };
  const skip = (page - 1) * pageSize;

  const [docs, total] = await Promise.all([
    // _id is the tie-breaker, so pages never overlap when two responses share a time
    ResponseModel.find(query)
      .sort({ submittedAt: -1, _id: -1 })
      .skip(skip)
      .limit(pageSize)
      .lean(),
    ResponseModel.countDocuments(query),
  ]);

  return {
    items: (docs as unknown as ResponseDoc[]).map(toResponse),
    total,
  };
}

// ALL responses of a survey (used for the results summary).
export async function findAllResponses(surveyId: string): Promise<SurveyResponse[]> {
  const docs = await ResponseModel.find({ surveyId }).lean();
  return (docs as unknown as ResponseDoc[]).map(toResponse);
}

// Domain object -> database document. This was the line that failed:
// the domain has "id", but MongoDB needs "_id" before it can save.
export async function saveResponse(response: SurveyResponse): Promise<void> {
  await ResponseModel.replaceOne(
    { _id: response.id },
    {
      _id: response.id,
      surveyId: response.surveyId,
      answers: response.answers,
      submittedAt: response.createdAt,
    },
    { upsert: true },
  );
}