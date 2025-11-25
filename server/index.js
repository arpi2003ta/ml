import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import connectDB from "./database/db.js";
import userRoute from "./routes/user.route.js";
import courseRoute from "./routes/course.route.js";
import mediaRoute from "./routes/media.route.js";
import purchaseRoute from "./routes/purchaseCourse.route.js";
import courseProgressRoute from "./routes/courseProgress.route.js";
import chatRoute from "./routes/chat.route.js";
import { stripeWebhook } from "./controllers/coursePurchase.controller.js"; 
import questionRoute from "./routes/question.route.js";
import responseRoutes from "./routes/response.route.js";
import resultRoute from './routes/result.route.js';
import examinerRoute from './routes/examiner.route.js'
import roadmapRoute from "./routes/roadmap.route.js";
import searchRoute from "./routes/search.route.js";
import predictorRoute from "./routes/predictor.route.js"
dotenv.config();

// Database connection
connectDB();

const app = express();
const PORT = process.env.PORT || 3000;

// Create HTTP server
const server = http.createServer(app);

// Socket.io configuration
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  },
  pingTimeout: 60000,
});

// Track connected users
const userSocketMap = new Map();

io.on("connection", (socket) => {
  console.log("New client connected:", socket.id);

  // Handle user registration
  socket.on("register", (userId) => {
    userSocketMap.set(userId, socket.id);
    io.to(socket.id).emit("onlineUsers", Array.from(userSocketMap.keys()));
    socket.broadcast.emit("online", userId);
    console.log(`User ${userId} connected with socket ID ${socket.id}`);
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    for (const [userId, socketId] of userSocketMap.entries()) {
      if (socketId === socket.id) {
        userSocketMap.delete(userId);
        socket.broadcast.emit("offline", userId);
        console.log(`User ${userId} disconnected`);
        break;
      }
    }
  });

  socket.on("typing", ({ receiverId }) => {
    const socketId = userSocketMap.get(receiverId);
    if (socketId) {
      io.to(socketId).emit("typing");
    }
  });

  socket.on("stop typing", ({ receiverId }) => {
    const socketId = userSocketMap.get(receiverId);
    if (socketId) {
      io.to(socketId).emit("stop typing");
    }
  });
});

// Make io accessible in routes
app.set("io", io);
app.set("userSocketMap", userSocketMap);

app.post(
  "/api/v1/purchase/webhook",
  express.raw({ type: "application/json" }),
  stripeWebhook
);

app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  })
);

// ✅ Routes
app.use("/api/v1/media", mediaRoute);
app.use("/api/v1/user", userRoute);
app.use("/api/v1/course", courseRoute);
app.use("/api/v1/purchase", purchaseRoute);
app.use("/api/v1/progress", courseProgressRoute);
app.use("/api/v1/chat", chatRoute);
app.use("/api/v1/questions",questionRoute);
app.use("/api/v1/exam",responseRoutes);
app.use("/api/v1/result", resultRoute);
app.use("/api/v1/examiner",examinerRoute);
app.use("/api/v1/roadmap", roadmapRoute);
app.use("/api/v1/search", searchRoute);
app.use("/api/v1/predict", predictorRoute);

// ✅ Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: "Internal Server Error" });
});

server.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});