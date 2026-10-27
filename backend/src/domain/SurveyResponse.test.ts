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

    it("counts a repeated checkbox choice only once", () => {
    const s = makeSurvey();
    const answers = validAnswers(s).map((a) =>
      a.questionId === s.multi.id ? { ...a, value: [s.slack.id, s.slack.id, s.jira.id] } : a,
    );
    const response = SurveyResponse.create(s.survey, answers);
    const saved = response.answers.find((a) => a.questionId === s.multi.id);
    expect(saved?.value).toEqual([s.slack.id, s.jira.id]);
  });

  it("does not accept an empty list for a required checkbox question", () => {
    const s = makeSurvey();
    const answers = validAnswers(s).map((a) =>
      a.questionId === s.multi.id ? { ...a, value: [] as string[] } : a,
    );
    expect(() => SurveyResponse.create(s.survey, answers)).toThrow("required");
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

  it("lets an optional question be skipped", () => {
    const s = makeSurvey();
    // the rating is optional, so answering only the required questions is fine
    const response = SurveyResponse.create(s.survey, validAnswers(s));
    expect(response.answers.length).toBe(3);
  });

  it("does not accept an empty submission when questions are required", () => {
    const s = makeSurvey();
    expect(() => SurveyResponse.create(s.survey, [])).toThrow("required");
  });

  it("does not accept a blank answer to a required text question", () => {
    const s = makeSurvey();
    const answers = validAnswers(s).map((a) =>
      a.questionId === s.text.id ? { ...a, value: "   " } : a,
    );
    expect(() => SurveyResponse.create(s.survey, answers)).toThrow("required");
  });
});

describe("SurveyResponse word limit", () => {
  // A published survey with one short text question that allows 3 words.
  function makeLimitedSurvey(required = false) {
    const survey = new Survey("Limits", "");
    const q = survey.addQuestion("short_text", "In a few words?");
    survey.updateQuestion(q.id, { maxWords: 3, required: required });
    survey.publish();
    return { survey, q };
  }

  it("accepts an answer at the limit", () => {
    const { survey, q } = makeLimitedSurvey();
    const response = SurveyResponse.create(survey, [
      { questionId: q.id, value: "one two three" },
    ]);
    expect(response.answers.length).toBe(1);
  });

  it("rejects an answer over the limit", () => {
    const { survey, q } = makeLimitedSurvey();
    expect(() =>
      SurveyResponse.create(survey, [{ questionId: q.id, value: "one two three four" }]),
    ).toThrow("at most 3 words (you wrote 4)");
  });

  it("extra spaces and new lines do not count as words", () => {
    const { survey, q } = makeLimitedSurvey();
    const response = SurveyResponse.create(survey, [
      { questionId: q.id, value: "  one \n two   three  " },
    ]);
    expect(response.answers[0]!.value).toBe("one \n two   three");
  });

  it("a question without a limit accepts long answers", () => {
    const survey = new Survey("No limit", "");
    const q = survey.addQuestion("long_text", "Tell us more");
    survey.publish();
    const long = Array(300).fill("word").join(" ");
    const response = SurveyResponse.create(survey, [{ questionId: q.id, value: long }]);
    expect(response.answers.length).toBe(1);
  });
});
describe("SurveyResponse optional answers", () => {
  function makeOptionalSurvey() {
    const survey = new Survey("Optional", "");
    const text = survey.addQuestion("short_text", "Name?");
    const rating = survey.addQuestion("rating", "Rate us");
    const single = survey.addQuestion("single_choice", "Pick");
    survey.addOption(single.id, "A");
    survey.addOption(single.id, "B");
    const multi = survey.addQuestion("multiple_choice", "Tick");
    survey.addOption(multi.id, "X");
    survey.addOption(multi.id, "Y");
    survey.publish();
    return { survey, text, rating, single, multi };
  }

  it("rejects an empty array for optional text, rating and single choice", () => {
    const s = makeOptionalSurvey();
    for (const q of [s.text, s.rating, s.single]) {
      expect(() =>
        SurveyResponse.create(s.survey, [{ questionId: q.id, value: [] }]),
      ).toThrow();
    }
  });

  it("treats an empty list as skipped for an optional checkbox question", () => {
    const s = makeOptionalSurvey();
    const response = SurveyResponse.create(s.survey, [{ questionId: s.multi.id, value: [] }]);
    expect(response.answers.length).toBe(0);
  });

  it("treats a blank string as skipped for text, but not for a rating", () => {
    const s = makeOptionalSurvey();
    const response = SurveyResponse.create(s.survey, [{ questionId: s.text.id, value: "  " }]);
    expect(response.answers.length).toBe(0);
    expect(() =>
      SurveyResponse.create(s.survey, [{ questionId: s.rating.id, value: "" }]),
    ).toThrow();
  });

  describe("error kinds and reporting", () => {
    it("reports every problem in one message, as an 'invalid' error", () => {
      const s = makeSurvey();
      try {
        SurveyResponse.create(s.survey, [
          { questionId: s.text.id, value: 5 },
          { questionId: s.rating.id, value: 7 },
        ]);
        throw new Error("should have thrown");
      } catch (error: any) {
        expect(error.name).toBe("DomainError");
        expect(error.kind).toBe("invalid");
        expect(error.message).toContain("answer must be text");
        expect(error.message).toContain("Rating must be between 1 and 5");
        expect(error.message).toContain("is required");
      }
    });

    it("uses the Rating rule: 2.5 is not allowed", () => {
      const s = makeSurvey();
      const answers = [...validAnswers(s), { questionId: s.rating.id, value: 2.5 }];
      expect(() => SurveyResponse.create(s.survey, answers)).toThrow("whole number");
    });

    it("draft and closed surveys are 'conflict' errors (409), not 'invalid'", () => {
      const s = makeSurvey();
      s.survey.close();
      try {
        SurveyResponse.create(s.survey, validAnswers(s));
        throw new Error("should have thrown");
      } catch (error: any) {
        expect(error.kind).toBe("conflict");
      }
    });
  });
});