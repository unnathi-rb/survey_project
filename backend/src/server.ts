import "dotenv/config";
import express from "express";
import type { NextFunction, Request, Response } from "express";
import cors from "cors";
import { connectToDatabase } from "./infrastructure/db";
import { authorRoutes } from "./api/authorRoutes";
import { respondentRoutes } from "./api/respondentRoutes";

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:5173" }));
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use(authorRoutes);
app.use(respondentRoutes);

// Last safety net: bad JSON, or a database error in a route, ends up here.
// The client never sees stack traces or database details.
app.use((error: any, req: Request, res: Response, next: NextFunction) => {
  if (error?.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Request body is not valid JSON" });
  }
  console.error(error);
  res.status(500).json({ error: "Something went wrong. Please try again." });
});

const PORT = Number(process.env.PORT) || 4000;

async function start() {
  await connectToDatabase();

  app.listen(PORT, () => {
    console.log("Server running on http://localhost:" + PORT);
  });
}

start();