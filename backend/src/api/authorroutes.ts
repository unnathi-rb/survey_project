import { Router } from "express";
import { z } from "zod";
import { Survey } from "../domain/survey";
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

// ---------- the shapes we expect in request bodies ----------

const createBody = z.object({
  title: z.string(),
  description: z.string().optional(),
});

const addQuestionBody = z.object({
  type: z.enum(["short_text", "long_text", "single_choice", "multiple_choice", "rating"]),
  label: z.string(),
});

const updateQuestionBody = z.object({
  label: z.string().optional(),
  helperText: z.string().optional(),
  required: z.boolean().optional(),
});

const addOptionBody = z.object({
  text: z.string(),
});
const moveQuestionBody = z.object({
  direction: z.enum(["up", "down"]),
});

// ---------- surveys ----------

// Create a draft survey
authorRoutes.post("/surveys", async (req, res) => {
  const result = createBody.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: "title must be text" });
  }

  const survey = new Survey(result.data.title, result.data.description ?? "");
  await saveSurvey(survey);

  res.status(201).json(survey);
});

// List surveys: newest first, with an optional status filter and pages
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

  res.json(makePage(items, total, paging.page, paging.pageSize));
});

// Get one survey by id
authorRoutes.get("/surveys/:id", async (req, res) => {
  const survey = await findSurvey(req.params.id);
  if (!survey) {
    return res.status(404).json({ error: "Survey not found" });
  }

  res.json(survey);
});

// ---------- questions ----------

// Add a question
authorRoutes.post("/surveys/:id/questions", async (req, res) => {
  const survey = await findSurvey(req.params.id);
  if (!survey) {
    return res.status(404).json({ error: "Survey not found" });
  }

  const body = addQuestionBody.safeParse(req.body);
  if (!body.success) {
    return res.status(400).json({
      error: "type must be a valid question type and label must be text",
    });
  }

  try {
    survey.addQuestion(body.data.type, body.data.label);
    await saveSurvey(survey);
    res.status(201).json(survey);
  } catch (error) {
    sendError(res, error);
  }
});

// Edit a question
authorRoutes.patch("/surveys/:id/questions/:questionId", async (req, res) => {
  const survey = await findSurvey(req.params.id);
  if (!survey) {
    return res.status(404).json({ error: "Survey not found" });
  }

  const body = updateQuestionBody.safeParse(req.body);
  if (!body.success) {
    return res.status(400).json({ error: "label and helperText must be text" });
  }

  try {
    survey.updateQuestion(req.params.questionId, body.data);
    await saveSurvey(survey);
    res.json(survey);
  } catch (error) {
    sendError(res, error);
  }
});

// Delete a question
authorRoutes.delete("/surveys/:id/questions/:questionId", async (req, res) => {
  const survey = await findSurvey(req.params.id);
  if (!survey) {
    return res.status(404).json({ error: "Survey not found" });
  }

  try {
    survey.removeQuestion(req.params.questionId);
    await saveSurvey(survey);
    res.json(survey);
  } catch (error) {
    sendError(res, error);
  }
});

// ---------- options ----------

// Add an option to a choice question
authorRoutes.post("/surveys/:id/questions/:questionId/options", async (req, res) => {
  const survey = await findSurvey(req.params.id);
  if (!survey) {
    return res.status(404).json({ error: "Survey not found" });
  }

  const body = addOptionBody.safeParse(req.body);
  if (!body.success) {
    return res.status(400).json({ error: "text must be text" });
  }

  try {
    survey.addOption(req.params.questionId, body.data.text);
    await saveSurvey(survey);
    res.status(201).json(survey);
  } catch (error) {
    sendError(res, error);
  }
});
// Move a question up or down
authorRoutes.patch("/surveys/:id/questions/:questionId/move", async (req, res) => {
  const survey = await findSurvey(req.params.id);
  if (!survey) {
    return res.status(404).json({ error: "Survey not found" });
  }

  const body = moveQuestionBody.safeParse(req.body);
  if (!body.success) {
    return res.status(400).json({ error: "direction must be up or down" });
  }

  try {
    survey.moveQuestion(req.params.questionId, body.data.direction);
    await saveSurvey(survey);
    res.json(survey);
  } catch (error) {
    sendError(res, error);
  }
});
// Delete an option
authorRoutes.delete(
  "/surveys/:id/questions/:questionId/options/:optionId",
  async (req, res) => {
    const survey = await findSurvey(req.params.id);
    if (!survey) {
      return res.status(404).json({ error: "Survey not found" });
    }

    try {
      survey.removeOption(req.params.questionId, req.params.optionId);
      await saveSurvey(survey);
      res.json(survey);
    } catch (error) {
      sendError(res, error);
    }
  },
);

// ---------- publish and close ----------

// Publish a draft survey
authorRoutes.post("/surveys/:id/publish", async (req, res) => {
  const survey = await findSurvey(req.params.id);
  if (!survey) {
    return res.status(404).json({ error: "Survey not found" });
  }

  try {
    survey.publish();
    await saveSurvey(survey);
    res.json(survey);
  } catch (error) {
    sendError(res, error);
  }
});

// Close a published survey
authorRoutes.post("/surveys/:id/close", async (req, res) => {
  const survey = await findSurvey(req.params.id);
  if (!survey) {
    return res.status(404).json({ error: "Survey not found" });
  }

  try {
    survey.close();
    await saveSurvey(survey);
    res.json(survey);
  } catch (error) {
    sendError(res, error);
  }
});

// ---------- responses and results ----------

// List the responses of one survey: newest first, with pages
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

// The summary of ALL responses
authorRoutes.get("/surveys/:id/results", async (req, res) => {
  const survey = await findSurvey(req.params.id);
  if (!survey) {
    return res.status(404).json({ error: "Survey not found" });
  }

  const all = await findAllResponses(survey.id);

  res.json(buildResults(survey, all));
});
// Delete a draft survey
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