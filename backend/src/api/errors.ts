import type { Response } from "express";
import { DomainError } from "../domain/DomainError";

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
