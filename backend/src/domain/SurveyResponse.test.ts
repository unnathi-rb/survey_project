import { describe, it, expect } from "vitest";
import { Survey } from "./survey";
import { SurveyResponse } from "./SurveyResponse";

// Builds a published survey with four questions:
// a text (required), a single choice (required), a multiple choice (required), a rating (optional)
function makeSurvey() {
  const survey = new Survey("Week 1", "");

  const text = survey.addQuestion("short_text", "Your name?");
  const single = survey.addQuestion("single_choice", "Team mood?");
  const good = survey.addOption(single.id, "Good");
  survey.addOption(single.id, "Bad");
  const multi = survey.addQuestion("multiple_choice", "Tools used?");
  const slack = survey.addOption(multi.id, "Slack");
  const jira = survey.addOption(multi.id, "Jira");
  const rating = survey.addQuestion("rating", "Rate us");

  survey.updateQuestion(text.id, { required: true });
  survey.updateQuestion(single.id, { required: true });
  survey.updateQuestion(multi.id, { required: true });

  survey.publish();
  return { survey, text, single, multi, rating, good, slack, jira };
}

// A set of answers that is fully valid.
function validAnswers(s: ReturnType<typeof makeSurvey>) {
  return [
    { questionId: s.text.id, value: "Unnathi" },
    { questionId: s.single.id, value: s.good.id },
    { questionId: s.multi.id, value: [s.slack.id] },
  ];
}

describe("SurveyResponse", () => {
  it("accepts a valid response", () => {
    const s = makeSurvey();
    const response = SurveyResponse.create(s.survey, validAnswers(s));
    expect(response.answers.length).toBe(3);
    expect(response.surveyId).toBe(s.survey.id);
  });

  it("rejects a draft survey", () => {
    const survey = new Survey("Draft", "");
    survey.addQuestion("short_text", "Name?");
    expect(() => SurveyResponse.create(survey, [])).toThrow("not available yet");
  });

  it("rejects a closed survey", () => {
    const s = makeSurvey();
    s.survey.close();
    expect(() => SurveyResponse.create(s.survey, validAnswers(s))).toThrow("closed");
  });

  

  it("rejects an unknown question", () => {
    const s = makeSurvey();
    const answers = [...validAnswers(s), { questionId: "no-such-id", value: "x" }];
    expect(() => SurveyResponse.create(s.survey, answers)).toThrow("Unknown question");
  });

  it("rejects an unknown option", () => {
    const s = makeSurvey();
    const answers = validAnswers(s);
    answers[1] = { questionId: s.single.id, value: "no-such-option" };
    expect(() => SurveyResponse.create(s.survey, answers)).toThrow("not a valid option");
  });

  it("rejects two answers to the same question", () => {
    const s = makeSurvey();
    const answers = [...validAnswers(s), { questionId: s.text.id, value: "Again" }];
    expect(() => SurveyResponse.create(s.survey, answers)).toThrow("more than once");
  });

  it("rejects an answer of the wrong type", () => {
    const s = makeSurvey();
    const answers = [...validAnswers(s), { questionId: s.rating.id, value: "five" }];
    expect(() => SurveyResponse.create(s.survey, answers)).toThrow("must be a number");
  });

  it("rejects ratings of 0, 6 and 2.5", () => {
    const s = makeSurvey();
    for (const bad of [0, 6, 2.5]) {
      const answers = [...validAnswers(s), { questionId: s.rating.id, value: bad }];
      expect(() => SurveyResponse.create(s.survey, answers)).toThrow();
    }
  });

  it("accepts a rating from 1 to 5", () => {
    const s = makeSurvey();
    const answers = [...validAnswers(s), { questionId: s.rating.id, value: 4 }];
    const response = SurveyResponse.create(s.survey, answers);
    expect(response.answers.length).toBe(4);
  });

    it("lets any question be skipped", () => {
    const s = makeSurvey();
    const response = SurveyResponse.create(s.survey, []);
    expect(response.answers.length).toBe(0);
  });

  it("does not save a blank text answer", () => {
    const s = makeSurvey();
    const answers = [{ questionId: s.text.id, value: "   " }];
    const response = SurveyResponse.create(s.survey, answers);
    expect(response.answers.length).toBe(0);
  });
});