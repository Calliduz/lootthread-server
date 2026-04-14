import express, { Express, Request, Response } from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import connectDB from "./config/db";

// Route imports
import productRoutes from "./routes/productRoutes";
import orderRoutes from "./routes/orderRoutes";
import quizRoutes from "./routes/quizRoutes";
import artistRoutes from "./routes/artistRoutes";

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 5000;

// Connect to Database
connectDB();

// Middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/quiz", quizRoutes);
app.use("/api/artists", artistRoutes);

app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({ status: "healthy", timestamp: new Date().toISOString() });
});

app.get("/", (req: Request, res: Response) => {
  res.send("LootThread API is running...");
});

// Error handling middleware (basic)
app.use((err: Error, req: Request, res: Response, next: any) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode).json({
    message: err.message,
    stack: process.env.NODE_ENV === "production" ? null : err.stack,
  });
});

app.listen(port, () => {
  console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
});
