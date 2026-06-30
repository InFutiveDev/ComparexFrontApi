import cors from "cors";
import express from "express";
import { apiRouter } from "./routes/index.js";
import { connectToMongo } from "./mongo.js";

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(",") || [
      "http://localhost:3000",
      "http://localhost:3001",
    ],
    credentials: true,
  }),
);
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api", apiRouter);

app.get("/", (_req, res) => {
  res.json({ name: "comparex-front-api", version: "1.0.0" });
});

await connectToMongo();

app.listen(PORT, () => {
  console.log(`Listening on http://localhost:${PORT}`);
});
