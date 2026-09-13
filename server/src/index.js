import "express-async-errors";
import express from "express";
import cookieParser from "cookie-parser";
import { waitForDb } from "./db.js";
import authRoutes from "./routes/auth.js";
import entriesRoutes from "./routes/entries.js";
import searchRoutes from "./routes/search.js";
import dataRoutes from "./routes/data.js";
import adminRoutes from "./routes/admin.js";

const app = express();
app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/entries", entriesRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/data", dataRoutes);
app.use("/api/admin", adminRoutes);

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

const PORT = process.env.PORT || 3000;

waitForDb()
  .then(() => {
    app.listen(PORT, () => console.log(`Server listening on ${PORT}`));
  })
  .catch((err) => {
    console.error("Could not connect to database", err);
    process.exit(1);
  });
