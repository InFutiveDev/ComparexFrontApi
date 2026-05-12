import express from "express";

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/", (_req, res) => {
  res.json({ name: "comparex-front-api", version: "1.0.0" });
});

app.listen(PORT, () => {
  console.log(`Listening on http://localhost:${PORT}`);
});
