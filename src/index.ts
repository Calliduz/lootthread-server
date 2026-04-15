import express, { Express, Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import connectDB from "./config/db";

// Route imports
import authRoutes       from "./routes/authRoutes";
import productRoutes    from "./routes/productRoutes";
import orderRoutes      from "./routes/orderRoutes";
import quizRoutes       from "./routes/quizRoutes";
import artistRoutes     from "./routes/artistRoutes";
import collectionRoutes from "./routes/collectionRoutes";
import cmsRoutes        from "./routes/cmsRoutes";

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 5000;

// Connect to Database
connectDB();

// ── Middleware ───────────────────────────────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Routes ───────────────────────────────────────────────────────────────────
app.use("/api/auth",        authRoutes);
app.use("/api/products",    productRoutes);
app.use("/api/orders",      orderRoutes);
app.use("/api/quiz",        quizRoutes);
app.use("/api/artists",     artistRoutes);
app.use("/api/collections", collectionRoutes);
app.use("/api/cms",         cmsRoutes);

// ── Health / Root ─────────────────────────────────────────────────────────────
app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "healthy", timestamp: new Date().toISOString() });
});

app.get("/", (_req: Request, res: Response) => {
  res.send("LootThread API is running...");
});

// ── Global Error Handler ──────────────────────────────────────────────────────
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode).json({
    message: err.message,
    stack: process.env.NODE_ENV === "production" ? null : err.stack,
  });
});

app.listen(port, () => {
  console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
});
