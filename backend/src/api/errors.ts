import type { Response } from "express";

// Turns an error from the domain into a proper answer.
export function sendError(res: Response, error: unknown) {
  const message = error instanceof Error ? error.message : "Something went wrong";

  if (message.includes("not found")) {
    return res.status(404).json({ error: message });
  }
  if (message.startsWith("Invalid response")) {
    return res.status(400).json({ error: message });
  }
  return res.status(409).json({ error: message });
}