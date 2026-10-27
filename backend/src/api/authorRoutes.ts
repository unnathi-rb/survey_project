import { Router } from "express";
import type { Request, Response } from "express";
import { z } from "zod";
import { Survey } from "../domain/survey";
import { DomainError } from "../domain/DomainError";
import { isSurveyStatus } from "../domain/SurveyStatus";
import type { SurveyStatus } from "../domain/SurveyStatus";
import {
  saveSurvey,
  findSurvey,
  listSurveys,
  listResponses,
  findAllResponses,
  deleteSurvey,
} from "../infrastructure/repositories";
import { sendError } from "./errors";
import { readPagination, makePage } from "./pagination";
import { buildResults } from "./results";

export const authorRoutes = Router();

// Every edit may carry the survey version the browser last saw.
const version = z.number().int().optional();

const createBody = z.object({
  title: z.string(),
  description: z.string().optional(),
});

const addQuestionBody = z.object({
  type: z.enum(["short_text", "long_text", "single_choice", "multiple_choice", "rating"]),
  label: z.string(),
  version,
});

const updateQuestionBody = z.object({
  label: z.string().optional(),
  helperText: z.string().optional(),
  required: z.boolean().optional(),
  maxWords: z.number().nullable().optional(),
  version,
});

const addOptionBody = z.object({
  text: z.string(),
  helperText: z.string().optional(),
  version,
});

// An option edit changes the text, the helper text, or both.
const updateOptionBody = z
  .object({
    text: z.string().optional(),
    helperText: z.string().optional(),
    version,
  })
  .refine((b) => b.text !== undefined || b.helperText !== undefined, {
    message: "send text, helperText or both",
  });

const moveQuestionBody = z.object({
  direction: z.enum(["up", "down"]),
  version,
});

const versionOnlyBody = z.object({ version });

// A DELETE or POST may arrive with no body at all. That is fine (no version sent).
function readVersionOnly(req: Request): { version?: number } | null {
  const parsed = versionOnlyBody.safeParse(req.body ?? {});
  return parsed.success ? parsed.data : null;
}

// Stops an edit that was made on an OLD copy of the survey (for example from a
// second browser tab). The browser says "I last saw version 4"; if the survey is
// already at version 5, the edit is refused instead of being applied to newer data.
function assertFresh(survey: Survey, seenVersion: number | undefined) {
  if (seenVersion !== undefined && seenVersion !== survey.version) {
    throw new DomainError(
      "This survey was changed somewhere else (you have version " +
        seenVersion + ", the latest is " + survey.version + ").",
      "conflict",
    );
  }
}

// The one path every change goes through:
// load -> check the version -> ask the domain to change it -> save -> answer.
async function editSurvey(
  req: Request,
  res: Response,
  seenVersion: number | undefined,
  change: (survey: Survey) => void,
  successStatus = 200,
) {
  const survey = await findSurvey(String(req.params.id));
  if (!survey) {
    return res.status(404).json({ error: "Survey not found" });
  }

  try {
    assertFresh(survey, seenVersion);
    change(survey);
    await saveSurvey(survey);
    res.status(successStatus).json(survey.toJSON());
  } catch (error) {
    sendError(res, error);
  }
}

// ---------- surveys ----------

authorRoutes.post("/surveys", async (req, res) => {
  const result = createBody.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: "title must be text" });
  }

  const survey = new Survey(result.data.title, result.data.description ?? "");
  await saveSurvey(survey);

  res.status(201).json(survey.toJSON());
});

authorRoutes.get("/surveys", async (req, res) => {
  const paging = readPagination(req.query);
  if ("error" in paging) {
    return res.status(400).json({ error: paging.error });
  }

  let statusFilter: SurveyStatus | undefined = undefined;
  const status = req.query.status;
  if (status !== undefined) {
    if (!isSurveyStatus(status)) {
      return res.status(400).json({
        error: "status must be draft, published or closed",
      });
    }
    statusFilter = status;
  }

  const { items, total } = await listSurveys(statusFilter, paging.page, paging.pageSize);

  res.json(makePage(items.map(s => s.toJSON()), total, paging.page, paging.pageSize));
});

authorRoutes.get("/surveys/:id", async (req, res) => {
  const survey = await findSurvey(req.params.id);
  if (!survey) {
    return res.status(404).json({ error: "Survey not found" });
  }

  res.json(survey.toJSON());
});

// ---------- questions ----------

authorRoutes.post("/surveys/:id/questions", async (req, res) => {
  const body = addQuestionBody.safeParse(req.body);
  if (!body.success) {
    return res.status(400).json({
      error: "type must be a valid question type and label must be text",
    });
  }
  const { type, label, version } = body.data;
  await editSurvey(req, res, version, (s) => s.addQuestion(type, label), 201);
});

authorRoutes.patch("/surveys/:id/questions/:questionId", async (req, res) => {
  const body = updateQuestionBody.safeParse(req.body);
  if (!body.success) {
    return res.status(400).json({
      error:
        "label and helperText must be text, required must be true or false, and maxWords must be a number or null",
    });
  }
  const { version, ...changes } = body.data;
  await editSurvey(req, res, version, (s) =>
    s.updateQuestion(String(req.params.questionId), changes),
  );
});

authorRoutes.delete("/surveys/:id/questions/:questionId", async (req, res) => {
  const body = readVersionOnly(req);
  if (!body) return res.status(400).json({ error: "version must be a whole number" });
  await editSurvey(req, res, body.version, (s) =>
    s.removeQuestion(String(req.params.questionId)),
  );
});

authorRoutes.patch("/surveys/:id/questions/:questionId/move", async (req, res) => {
  const body = moveQuestionBody.safeParse(req.body);
  if (!body.success) {
    return res.status(400).json({ error: "direction must be up or down" });
  }
  await editSurvey(req, res, body.data.version, (s) =>
    s.moveQuestion(String(req.params.questionId), body.data.direction),
  );
});

// ---------- options ----------

authorRoutes.post("/surveys/:id/questions/:questionId/options", async (req, res) => {
  const body = addOptionBody.safeParse(req.body);
  if (!body.success) {
    return res.status(400).json({ error: "text and helperText must be text" });
  }
  const { text, helperText, version } = body.data;
  await editSurvey(
    req, res, version,
    (s) => s.addOption(String(req.params.questionId), text, helperText),
    201,
  );
});

authorRoutes.patch(
  "/surveys/:id/questions/:questionId/options/:optionId",
  async (req, res) => {
    const body = updateOptionBody.safeParse(req.body);
    if (!body.success) {
      return res.status(400).json({ error: "send text, helperText or both (as text)" });
    }
    const { version, ...changes } = body.data;
    await editSurvey(req, res, version, (s) =>
      s.updateOption(String(req.params.questionId), String(req.params.optionId), changes),
    );
  },
);

authorRoutes.delete(
  "/surveys/:id/questions/:questionId/options/:optionId",
  async (req, res) => {
    const body = readVersionOnly(req);
    if (!body) return res.status(400).json({ error: "version must be a whole number" });
    await editSurvey(req, res, body.version, (s) =>
      s.removeOption(String(req.params.questionId), String(req.params.optionId)),
    );
  },
);

// ---------- publish and close ----------

authorRoutes.post("/surveys/:id/publish", async (req, res) => {
  const body = readVersionOnly(req);
  if (!body) return res.status(400).json({ error: "version must be a whole number" });
  await editSurvey(req, res, body.version, (s) => s.publish());
});

authorRoutes.post("/surveys/:id/close", async (req, res) => {
  const body = readVersionOnly(req);
  if (!body) return res.status(400).json({ error: "version must be a whole number" });
  await editSurvey(req, res, body.version, (s) => s.close());
});

// ---------- responses and results ----------

authorRoutes.get("/surveys/:id/responses", async (req, res) => {
  const survey = await findSurvey(req.params.id);
  if (!survey) {
    return res.status(404).json({ error: "Survey not found" });
  }

  const paging = readPagination(req.query);
  if ("error" in paging) {
    return res.status(400).json({ error: paging.error });
  }

  const { items, total } = await listResponses(survey.id, paging.page, paging.pageSize);

  res.json(makePage(items, total, paging.page, paging.pageSize));
});

authorRoutes.get("/surveys/:id/results", async (req, res) => {
  const survey = await findSurvey(req.params.id);
  if (!survey) {
    return res.status(404).json({ error: "Survey not found" });
  }

  const all = await findAllResponses(survey.id);

  res.json(buildResults(survey, all));
});

authorRoutes.delete("/surveys/:id", async (req, res) => {
  const survey = await findSurvey(req.params.id);
  if (!survey) {
    return res.status(404).json({ error: "Survey not found" });
  }

  try {
    survey.assertCanBeDeleted();
    await deleteSurvey(survey.id);
    res.status(204).send();
  } catch (error) {
    sendError(res, error);
  }
});