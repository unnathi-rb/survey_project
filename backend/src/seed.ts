import "dotenv/config";
import mongoose from "mongoose";
import { connectToDatabase } from "./infrastructure/db";
import { Survey } from "./domain/survey";
import { SurveyResponse } from "./domain/SurveyResponse";
import { saveSurvey, saveResponse } from "./infrastructure/repositories";
import { SurveyModel, ResponseModel } from "./infrastructure/models";

// Builds a survey with four questions and remembers their ids.
function buildSurvey(title: string) {
  const survey = new Survey(title, "Demo survey for testing");

  const name = survey.addQuestion("short_text", "What is your name?");

  const mood = survey.addQuestion("single_choice", "How is the team?");
  const great = survey.addOption(mood.id, "Great");
  const okay = survey.addOption(mood.id, "Okay");
  const bad = survey.addOption(mood.id, "Bad");

  const tools = survey.addQuestion("multiple_choice", "Which tools do you use?");
  const slack = survey.addOption(tools.id, "Slack");
  const jira = survey.addOption(tools.id, "Jira");
  const git = survey.addOption(tools.id, "Git");

  const rating = survey.addQuestion("rating", "Rate your first week");
  survey.updateQuestion(name.id, { required: true });
  survey.updateQuestion(mood.id, { required: true });
  survey.updateQuestion(tools.id, { required: true });
  return {
    survey,
    name,
    mood,
    tools,
    rating,
    moodIds: [great.id, okay.id, bad.id],
    toolIds: [slack.id, jira.id, git.id],
  };
}

type Built = ReturnType<typeof buildSurvey>;

function buildResponse(built: Built, i: number) {
  const answers = [
    { questionId: built.name.id, value: "Person " + (i + 1) },
    { questionId: built.mood.id, value: built.moodIds[i % 3]! }, // Added !
    {
      questionId: built.tools.id,
      value: [built.toolIds[i % 3]!, built.toolIds[(i + 1) % 3]!], // Added !
    },
    { questionId: built.rating.id, value: (i % 5) + 1 },
  ];

  const submissionDate = new Date(Date.now() - i * 1000); // spread over time
  return SurveyResponse.create(built.survey, answers, submissionDate);
}

async function seed() {
  await connectToDatabase();

  // Start clean, so running the seed twice does not double the data.
  await SurveyModel.deleteMany({});
  await ResponseModel.deleteMany({});

  // 30 normal surveys: a third draft, a third published, a third closed.
  for (let i = 1; i <= 30; i++) {
    const built = buildSurvey("Demo survey " + i);
    built.survey.createdAt = new Date(Date.now() - i * 60000);

    const group = i % 3; // 0 = draft, 1 = published, 2 = closed

    if (group !== 0) {
      built.survey.publish();
      for (let r = 0; r < 3; r++) {
        await saveResponse(buildResponse(built, r));
      }
    }
    if (group === 2) {
      built.survey.close();
    }

    await saveSurvey(built.survey);
  }

  // One published survey with many responses, for testing pages.
  const big = buildSurvey("Big survey with many responses");
  big.survey.publish();
  for (let r = 0; r < 27; r++) {
    await saveResponse(buildResponse(big, r));
  }
  await saveSurvey(big.survey);

  console.log("Seeded 31 surveys. The big survey has 27 responses.");
  console.log("Big survey id: " + big.survey.id);

  await mongoose.disconnect();
}

seed();