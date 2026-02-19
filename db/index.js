// db/index.js
import { neon } from "@neondatabase/serverless";

// Called fresh each time so env var is read at request time, not import time
export function getDB() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set!");
  }
  return neon(process.env.DATABASE_URL);
}
