import "dotenv/config";
import express from "express";
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

const PORT = Number(process.env.PORT) || 4000;

async function start() {
  await connectToDatabase();

  app.listen(PORT, () => {
    console.log("Server running on http://localhost:" + PORT);
  });
}

start();