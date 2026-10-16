import type { Survey } from "../domain/survey";
import type { SurveyResponse } from "../domain/SurveyResponse";

// The summary for one question.
export type QuestionResult = {
  questionId: string;
  label: string;
  type: string;
  answeredCount: number;
  optionCounts?: { optionId: string; text: string; count: number }[];
  average?: number | null;
  textAnswers?: string[];
  distribution?: { rating: number; count: number }[];
};

// Builds the summary from ALL responses of a survey (not just one page).
export function buildResults(survey: Survey, list: SurveyResponse[]) {
  const questions: QuestionResult[] = [];

  for (const question of survey.questions) {
    // Collect every answer given to this question.
    const values: unknown[] = [];
    for (const response of list) {
      for (const answer of response.answers) {
        if (answer.questionId === question.id) {
          values.push(answer.value);
        }
      }
    }

    const result: QuestionResult = {
      questionId: question.id,
      label: question.label,
      type: question.type,
      answeredCount: values.length,
    };

    if (question.type === "single_choice" || question.type === "multiple_choice") {
      result.optionCounts = question.options.map((option) => {
        let count = 0;
        for (const value of values) {
          const picked = Array.isArray(value) ? value : [value];
          if (picked.includes(option.id)) count++;
        }
        return { optionId: option.id, text: option.text, count: count };
      });
    } else if (question.type === "rating") {
      const numbers = values.filter((v): v is number => typeof v === "number");

      result.distribution = [1, 2, 3, 4, 5].map((n) => ({
        rating: n,
        count: numbers.filter((v) => v === n).length,
      }));

      if (numbers.length === 0) {
        result.average = null;
      } else {
        const sum = numbers.reduce((total, n) => total + n, 0);
        result.average = Math.round((sum / numbers.length) * 100) / 100;
      }
    } else {
      result.textAnswers = values.filter((v): v is string => typeof v === "string");
    }

    questions.push(result);
  }

  return { totalResponses: list.length, questions: questions };
}