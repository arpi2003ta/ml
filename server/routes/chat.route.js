import express from "express";
import  isAuthenticated  from "../middlewares/isAuthenticated.js";
import {
  sendMessage,
  getChats,
  getMessages,
  markAsRead,
  sendFileMessage,
  getLinkPreview,
} from "../controllers/chat.controller.js";
import singleUpload from "../middlewares/multer.middleware.js";

const router = express.Router();

router.post("/send", isAuthenticated, sendMessage);
router.post("/send-file", isAuthenticated, singleUpload, sendFileMessage);
router.get("/chats", isAuthenticated, getChats);
router.get("/messages/:chatId", isAuthenticated, getMessages);
router.post("/mark-read", isAuthenticated, markAsRead);
router.get("/get-link-preview", isAuthenticated, getLinkPreview);

export default router;