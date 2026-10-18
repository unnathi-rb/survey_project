import { Router } from "express";
import { z } from "zod";
import { SurveyResponse } from "../domain/SurveyResponse";
import { findSurvey, saveResponse } from "../infrastructure/repositories";
import { sendError } from "./errors";
export const respondentRoutes = Router();
const submitBody = z.object({
  answers: z.array(
    z.object({
      questionId: z.string(),
      value: z.unknown(),
    }),
  ),
});

// Get the form to fill in (only for a published survey)
respondentRoutes.get("/surveys/:id/form", async (req, res) => {
  const survey = await findSurvey(req.params.id);
  if (!survey || survey.status === "draft") {
    return res.status(404).json({ error: "Survey not found" });
  }
  if (survey.status === "closed") {
    return res.status(409).json({ error: "This survey is closed" });
  }

  // Send only what is needed to fill in the form.
  res.json({
    id: survey.id,
    title: survey.title,
    description: survey.description,
    questions: survey.questions,
  });
});

// Submit answers
respondentRoutes.post("/surveys/:id/responses", async (req, res) => {
  const survey = await findSurvey(req.params.id);
  if (!survey) {
    return res.status(404).json({ error: "Survey not found" });
  }

  const body = submitBody.safeParse(req.body);
  if (!body.success) {
    return res.status(400).json({
      error: "Send { answers: [{ questionId, value }] }",
    });
  }

  try {
    const response = SurveyResponse.create(survey, body.data.answers);
    await saveResponse(response);
    res.status(201).json(response);
  } catch (error) {
    sendError(res, error);
  }
});