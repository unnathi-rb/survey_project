import type { Response } from "express";
import { DomainError } from "../domain/DomainError";

// The domain says WHAT went wrong (kind). This file only turns that into a status code.
//   invalid   -> 400 (the data sent is wrong)
//   not_found -> 404
//   conflict  -> 409 (wrong state, or someone else changed it first)
// Anything else is a bug or a database problem: 500, with no details for the client.
export function sendError(res: Response, error: unknown) {
  if (error instanceof DomainError) {
    if (error.kind === "not_found") {
      return res.status(404).json({ error: error.message });
    }
    if (error.kind === "invalid") {
      return res.status(400).json({ error: error.message });
    }
    return res.status(409).json({ error: error.message });
  }

  console.error(error);
  return res.status(500).json({ error: "Something went wrong. Please try again." });
}