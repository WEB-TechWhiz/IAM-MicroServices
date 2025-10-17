import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

// Middleware configuration
app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}));

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());


  

// Import routes
import userRouter from "./Routes/user.routs.js";
import userRole from "./Routes/role.routs.js";
import policy from "./Routes/role.routs.js"
// import roleRouter from "./routes/role.routes.js";

// Routes declaration
app.use("/api/v1/users", userRouter);
app.use("/api/v1/role", userRole);
app.use("/api/v1/", policy);
// app.use("/api/v1/roles", roleRouter);

export { app };