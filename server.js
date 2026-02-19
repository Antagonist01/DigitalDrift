// server.js — Vercel-compatible Express app

// Load .env locally; on Vercel env vars are injected automatically
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import bodyParser from "body-parser";
import path from "path";
import { fileURLToPath } from "url";
import { getDB } from "./db/index.js";

const app = express();
const port = process.env.PORT || 3000;

// __dirname polyfill for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// ── View engine ────────────────────────────────────────────────────────────────
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// ── Static files ───────────────────────────────────────────────────────────────
app.use("/styles", express.static(path.join(__dirname, "public/styles")));
app.use(express.static(path.join(__dirname, "public")));

// ── Middleware ─────────────────────────────────────────────────────────────────
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// ── Health check ───────────────────────────────────────────────────────────────
app.get("/healthz", (_req, res) => res.status(200).send("ok"));

// ── Date formatter ─────────────────────────────────────────────────────────────
function fmtDate(d) {
  return new Date(d).toLocaleDateString("en-IN", {
    year: "numeric", month: "long", day: "numeric",
  });
}

// ── ROUTES ─────────────────────────────────────────────────────────────────────

app.get("/", async (_req, res) => {
  try {
    const sql = getDB();
    const posts = await sql`SELECT * FROM posts ORDER BY date DESC`;
    res.render("index", { posts, fmtDate });
  } catch (err) {
    console.error("GET / error:", err.message);
    res.status(500).render("error", { message: err.message });
  }
});

app.get("/new", (_req, res) => {
  res.render("modify", { heading: "New Post", submit: "Publish Post", post: null });
});

app.get("/edit/:id", async (req, res) => {
  try {
    const sql = getDB();
    const [post] = await sql`SELECT * FROM posts WHERE id = ${req.params.id}`;
    if (!post) return res.status(404).render("error", { message: "Post not found." });
    res.render("modify", { heading: "Edit Post", submit: "Update Post", post });
  } catch (err) {
    console.error("GET /edit error:", err.message);
    res.status(500).render("error", { message: err.message });
  }
});

app.post("/posts", async (req, res) => {
  const { title, content, author } = req.body;
  try {
    const sql = getDB();
    await sql`INSERT INTO posts (title, content, author) VALUES (${title}, ${content}, ${author})`;
    res.redirect("/");
  } catch (err) {
    console.error("POST /posts error:", err.message);
    res.status(500).render("error", { message: err.message });
  }
});

app.post("/posts/:id", async (req, res) => {
  const { title, content, author } = req.body;
  try {
    const sql = getDB();
    await sql`
      UPDATE posts
      SET
        title   = COALESCE(NULLIF(${title},   ''), title),
        content = COALESCE(NULLIF(${content}, ''), content),
        author  = COALESCE(NULLIF(${author},  ''), author)
      WHERE id = ${req.params.id}
    `;
    res.redirect("/");
  } catch (err) {
    console.error("POST /posts/:id error:", err.message);
    res.status(500).render("error", { message: err.message });
  }
});

app.get("/posts/delete/:id", async (req, res) => {
  try {
    const sql = getDB();
    await sql`DELETE FROM posts WHERE id = ${req.params.id}`;
    res.redirect("/");
  } catch (err) {
    console.error("DELETE error:", err.message);
    res.status(500).render("error", { message: err.message });
  }
});

// ── Start locally ──────────────────────────────────────────────────────────────
if (process.env.VERCEL !== "1") {
  app.listen(port, () =>
    console.log(`🚀  App running at http://localhost:${port}`)
  );
}

export default app;
