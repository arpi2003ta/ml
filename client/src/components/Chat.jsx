import MessageContent from "./MessageContent";
import React, { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { useSelector } from "react-redux";
import { Button, List, Avatar, Input, Badge, Modal, Spin } from "antd";
import {
  MessageOutlined,
  UserOutlined,
  CloseOutlined,
  ArrowLeftOutlined,
  SendOutlined,
  PaperClipOutlined,
  SmileOutlined,
  AudioOutlined,
} from "@ant-design/icons";
import axios from "axios";
import moment from "moment";
import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";
import { useReactMediaRecorder } from "react-media-recorder";

const Chat = ({ courseId, instructorId, triggerButton }) => {
  const [visible, setVisible] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [socket, setSocket] = useState(null);
  const [isMobileView, setIsMobileView] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [isOnline, setIsOnline] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const { status, startRecording, stopRecording, mediaBlobUrl, clearBlobUrl } =
    useReactMediaRecorder({ audio: true });
  const { user } = useSelector((state) => state.auth);

  const handleEmojiClick = (emoji) => {
    setInputMessage((prev) => prev + emoji.native);
  };

  const getCourseTitle = (course) => {
    if (!course) return "";
    return course.courseTitle || course.title || "";
  };

  const API_BASE_URL =
    import.meta.env.VITE_API_URL || "http://localhost:8080/api/v1";

  // Check for mobile view
  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (user) {
      const newSocket = io(
        import.meta.env.VITE_API_URL || "http://localhost:8080",
        {
          withCredentials: true,
          query: { userId: user._id },
        }
      );

      newSocket.on("connect", () => {
        console.log("Connected to socket server");
        newSocket.emit("register", user._id);
      });

      newSocket.on("newMessage", (message) => {
        if (activeChat && activeChat._id === message.chat) {
          setMessages((prev) => [...prev, message]);
          markMessagesAsRead([message._id]);
        } else {
          updateUnreadCount(message.chat);
        }
      });

      newSocket.on("typing", () => setIsTyping(true));
      newSocket.on("stop typing", () => setIsTyping(false));

      newSocket.on("onlineUsers", (users) => {
        setOnlineUsers(users);
      });

      newSocket.on("online", (userId) => {
        setOnlineUsers((prev) => [...prev, userId]);
      });

      newSocket.on("offline", (userId) => {
        setOnlineUsers((prev) => prev.filter((id) => id !== userId));
      });

      setSocket(newSocket);

      return () => {
        newSocket.disconnect();
      };
    }
  }, [user, activeChat]);

  useEffect(() => {
    if (socket && activeChat) {
      const receiverId =
        user.role === "student"
          ? activeChat.instructor._id
          : activeChat.student._id;

      if (inputMessage) {
        socket.emit("typing", { receiverId });
      }

      const timer = setTimeout(() => {
        socket.emit("stop typing", { receiverId });
      }, 3000);

      return () => {
        clearTimeout(timer);
        socket.emit("stop typing", { receiverId });
      };
    }
  }, [inputMessage, socket, activeChat, user.role]);
  
  useEffect(() => {
    if (activeChat) {
      const otherUser =
        user.role === "student" ? activeChat.instructor : activeChat.student;
      setIsOnline(onlineUsers.includes(otherUser._id));
    }
  }, [activeChat, onlineUsers, user.role]);

  useEffect(() => {
    if (visible && user) {
      fetchChats();
    }
  }, [visible, user]);

  useEffect(() => {
    if (activeChat) {
      fetchMessages(activeChat._id);
    }
  }, [activeChat]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(event.target)
      ) {
        setShowEmojiPicker(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [emojiPickerRef]);

  const fetchChats = async () => {
    try {
      const { data } = await axios.get(`${API_BASE_URL}/chat/chats`, {
        withCredentials: true,
      });
      setChats(data.data);

      const counts = {};
      data.data.forEach((chat) => {
        counts[chat._id] =
          chat.lastMessage &&
          !chat.lastMessage.read &&
          chat.lastMessage.receiver._id === user._id
            ? 1
            : 0;
      });
      setUnreadCounts(counts);
    } catch (error) {
      console.error("Failed to fetch chats:", error);
    }
  };

  const fetchMessages = async (chatId) => {
    try {
      const { data } = await axios.get(
        `${API_BASE_URL}/chat/messages/${chatId}`,
        {
          withCredentials: true,
        }
      );
      setMessages(data.data);

      const unreadMessages = data.data
        .filter((msg) => !msg.read && msg.receiver._id === user._id)
        .map((msg) => msg._id);

      if (unreadMessages.length > 0) {
        await axios.post(
          `${API_BASE_URL}/chat/mark-read`,
          { messageIds: unreadMessages },
          {
            withCredentials: true,
          }
        );
        updateUnreadCount(chatId, -unreadMessages.length);
      }
    } catch (error) {
      console.error("Failed to fetch messages:", error);
    }
  };

  const markMessagesAsRead = async (messageIds) => {
    try {
      await axios.post(
        `${API_BASE_URL}/chat/mark-read`,
        { messageIds },
        {
          withCredentials: true,
        }
      );
    } catch (error) {
      console.error("Failed to mark messages as read:", error);
    }
  };

  const updateUnreadCount = (chatId, change = 1) => {
    setUnreadCounts((prev) => ({
      ...prev,
      [chatId]: (prev[chatId] || 0) + change,
    }));
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !activeChat) return;

    try {
      const { data } = await axios.post(
        `${API_BASE_URL}/chat/send`,
        {
          courseId: activeChat.course._id,
          receiverId:
            user.role === "student"
              ? activeChat.instructor._id
              : activeChat.student._id,
          content: inputMessage,
        },
        { withCredentials: true }
      );

      setMessages((prev) => [
        ...prev,
        {
          ...data.data,
          sender: user,
          receiver:
            user.role === "student"
              ? activeChat.instructor
              : activeChat.student,
        },
      ]);
      setInputMessage("");
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  const handleFileSend = async (file) => {
    console.log("Sending file:", file);
    if (!file || !activeChat) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("courseId", activeChat.course._id);
    formData.append(
      "receiverId",
      user.role === "student"
        ? activeChat.instructor._id
        : activeChat.student._id
    );

    try {
      const { data } = await axios.post(
        `${API_BASE_URL}/chat/send-file`,
        formData,
        {
          withCredentials: true,
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      console.log("File sent successfully:", data);
      setMessages((prev) => [...prev, data.data]);
    } catch (error) {
      console.error("Failed to send file:", error);
    } finally {
      setUploading(false);
      setSelectedFile(null);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleSendAudio = async () => {
    if (mediaBlobUrl) {
      const blob = await fetch(mediaBlobUrl).then((r) => r.blob());
      const file = new File([blob], "audio.wav", {
        type: "audio/wav",
        lastModified: Date.now(),
      });
      handleFileSend(file);
      clearBlobUrl();
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const startNewChat = async () => {
    try {
      const { data } = await axios.post(
        `${API_BASE_URL}/chat/send`,
        {
          courseId,
          receiverId: instructorId,
          content: "Hello, I would like to start a chat regarding the course.",
        },
        { withCredentials: true }
      );

      setInputMessage("");
      fetchChats();
      setActiveChat(data.chat);
    } catch (error) {
      console.error("Failed to start new chat:", error);
    }
  };

  const totalUnreadCount = Object.values(unreadCounts).reduce(
    (a, b) => a + b,
    0
  );

  return (
    <>
      {triggerButton ? (
        React.cloneElement(triggerButton, {
          onClick: () => {
            setVisible(true);
            if (courseId) {
              const existingChat = chats.find((c) => c.course._id === courseId);
              if (existingChat) {
                setActiveChat(existingChat);
              }
            }
          },
        })
      ) : (
        <Badge count={totalUnreadCount} offset={[-5, 5]} size="small">
          <Button
            type="text"
            icon={<MessageOutlined />}
            onClick={() => setVisible(true)}
            style={{
              display: "flex",
              alignItems: "center",
              color: "#2c3e50",
              fontWeight: 500,
            }}
          >
            Messages
          </Button>
        </Badge>
      )}

      <Modal
        title={
          <div style={{ display: "flex", alignItems: "center" }}>
            {isMobileView && activeChat && (
              <Button
                type="text"
                icon={<ArrowLeftOutlined />}
                onClick={() => setActiveChat(null)}
                style={{ marginRight: 8 }}
              />
            )}
            {activeChat ? (
              <div style={{ display: "flex", alignItems: "center" }}>
                <Avatar
                  src={
                    user.role === "student"
                      ? activeChat.instructor?.photoUrl ||
                        "https://github.com/shadcn.png"
                      : activeChat.student?.photoUrl ||
                        "https://github.com/shadcn.png"
                  }
                  icon={<UserOutlined />}
                  style={{ backgroundColor: "#1890ff" }}
                />
                <div style={{ marginLeft: 12 }}>
                  <div style={{ fontWeight: 500, color: "#2c3e50" }}>
                    {user.role === "student"
                      ? activeChat.instructor?.name
                      : activeChat.student?.name}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", color: "#7f8c8d", fontSize: 12 }}>
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        backgroundColor: isOnline ? "#2ecc71" : "#95a5a6",
                        marginRight: 4,
                      }}
                    />
                    {isOnline ? "Online" : "Offline"}
                  </div>
                  {activeChat.course && (
                    <div style={{ color: "#7f8c8d", fontSize: 12 }}>
                      {getCourseTitle(activeChat.course)}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <span style={{ fontWeight: 500, color: "#2c3e50" }}>
                Messages
              </span>
            )}
          </div>
        }
        open={visible}
        onCancel={() => setVisible(false)}
        footer={null}
        width={isMobileView ? "90%" : 800}
        styles={{ body: { padding: 0 } }}  
        closable={false}
        closeIcon={<CloseOutlined style={{ color: "#7f8c8d" }} />}
        style={{ top: 20 }}
        className="chat-modal"
      >
        <div
          style={{
            display: "flex",
            height: isMobileView ? "70vh" : "60vh",
            flexDirection: isMobileView && activeChat ? "column" : "row",
          }}
        >
          {(!isMobileView || !activeChat) && (
            <div
              style={{
                width: isMobileView ? "100%" : 250,
                borderRight: "1px solid #ecf0f1",
                overflowY: "auto",
                backgroundColor: "#f8f9fa",
              }}
            >
              <div
                style={{
                  padding: 16,
                  borderBottom: "1px solid #ecf0f1",
                  backgroundColor: "#fff",
                }}
              >
                <Input.Search
                  placeholder="Search chats..."
                  style={{ width: "100%" }}
                />
              </div>
              <List
                dataSource={chats}
                renderItem={(chat) => {
                  const hasUnread = unreadCounts[chat._id] > 0;
                  return (
                    <List.Item
                      key={chat._id}
                      onClick={() => setActiveChat(chat)}
                      style={{
                        cursor: "pointer",
                        padding: 12,
                        backgroundColor:
                          activeChat?._id === chat._id
                            ? "#e8f4fd"
                            : hasUnread
                            ? "#f0f8ff"
                            : "#fff",
                        borderBottom: "1px solid #ecf0f1",
                        transition: "background-color 0.3s",
                      }}
                    >
                      <List.Item.Meta
                        avatar={
                          <Badge dot={hasUnread} color="#1890ff">
                            <Avatar
                              src={
                                user.role === "student"
                                  ? chat.instructor?.photoUrl ||
                                    "https://github.com/shadcn.png"
                                  : chat.student?.photoUrl ||
                                    "https://github.com/shadcn.png"
                              }
                              icon={<UserOutlined />}
                              style={{ backgroundColor: "#1890ff" }}
                            />
                          </Badge>
                        }
                        title={
                          <div
                            style={{
                              fontWeight: hasUnread ? 700 : 500,
                              color: "#2c3e50",
                            }}
                          >
                            {user.role === "student"
                              ? chat.instructor?.name
                              : chat.student?.name}
                          </div>
                        }
                        description={
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                            }}
                          >
                            <span
                              style={{
                                color: "#7f8c8d",
                                fontSize: 12,
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                maxWidth: "70%",
                                fontWeight: hasUnread ? "bold" : "normal",
                              }}
                            >
                              {chat.lastMessage?.content || "No messages yet"}
                            </span>
                            <span style={{ color: "#bdc3c7", fontSize: 12 }}>
                              {moment(chat.lastMessage?.timestamp).format(
                                "h:mm A"
                              )}
                            </span>
                          </div>
                        }
                      />
                    </List.Item>
                  );
                }}
              />
              {user?.role === "student" && courseId && (
                <div style={{ padding: 16 }}>
                  <Button
                    type="primary"
                    block
                    onClick={startNewChat}
                    style={{
                      backgroundColor: "#1890ff",
                      borderColor: "#1890ff",
                    }}
                  >
                    New Chat
                  </Button>
                </div>
              )}
            </div>
          )}

          {(!isMobileView || activeChat) && (
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                backgroundColor: "#fff",
              }}
            >
              {activeChat ? (
                <>
                  <div
                    style={{
                      flex: 1,
                      overflowY: "auto",
                      padding: 16,
                      backgroundImage:
                        "linear-gradient(to bottom, #f8f9fa 0%, #fff 100%)",
                    }}
                  >
                    {messages.map((message) => (
                      <div
                        key={message._id}
                        style={{
                          display: "flex",
                          justifyContent:
                            message.sender._id === user._id
                              ? "flex-end"
                              : "flex-start",
                          marginBottom: 16,
                        }}
                      >
                        <div
                          style={{
                            maxWidth: "80%",
                            borderRadius: 12,
                            padding: "10px 14px",
                            backgroundColor:
                              message.sender._id === user._id
                                ? "#1890ff"
                                : "#ecf0f1",
                            color:
                              message.sender._id === user._id
                                ? "white"
                                : "#2c3e50",
                            boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
                            position: "relative",
                          }}
                        >
                          <MessageContent message={message} user={user} />
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "flex-end",
                              alignItems: "center",
                              marginTop: 4,
                              fontSize: 11,
                              color:
                                message.sender._id === user._id
                                  ? "rgba(255,255,255,0.7)"
                                  : "rgba(0,0,0,0.45)",
                            }}
                          >
                            {moment(message.timestamp).format("h:mm A")}
                            {message.sender._id === user._id && (
                              <span style={{ marginLeft: 4 }}>
                                {message.read ? (
                                  <span style={{ color: "#70c1ff" }}>✓✓</span>
                                ) : (
                                  <span>✓</span>
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                  {isTyping && (
                    <div style={{ padding: "0 16px", color: "#7f8c8d" }}>
                      is typing...
                    </div>
                  )}
                  <div
                    style={{
                      padding: 16,
                      borderTop: "1px solid #ecf0f1",
                      backgroundColor: "#fff",
                    }}
                  >
                    {selectedFile && (
                      <div>
                        {selectedFile.type.startsWith("image/") ? (
                          <img
                            src={URL.createObjectURL(selectedFile)}
                            alt="Preview"
                            style={{
                              maxWidth: "100px",
                              maxHeight: "100px",
                              marginBottom: "10px",
                            }}
                          />
                        ) : (
                          <p>Selected file: {selectedFile.name}</p>
                        )}
                        <Button onClick={() => handleFileSend(selectedFile)}>
                          Send File
                        </Button>
                        <Button onClick={() => setSelectedFile(null)}>
                          Cancel
                        </Button>
                      </div>
                    )}
                    {mediaBlobUrl && (
                      <div>
                        <audio src={mediaBlobUrl} controls />
                        <Button onClick={handleSendAudio}>Send Audio</Button>
                        <Button onClick={clearBlobUrl}>Cancel</Button>
                      </div>
                    )}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        style={{ display: "none" }}
                      />
                      <Button
                        icon={<PaperClipOutlined />}
                        onClick={() => fileInputRef.current.click()}
                        disabled={uploading}
                      />
                      {uploading && <Spin />}
                      <div ref={emojiPickerRef}>
                        <Button
                          icon={<SmileOutlined />}
                          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        />
                        {showEmojiPicker && (
                          <div
                            style={{
                              position: "absolute",
                              bottom: "80px",
                              right: "20px",
                              zIndex: 1000,
                            }}
                          >
                            <Picker
                              data={data}
                              onEmojiSelect={handleEmojiClick}
                            />
                          </div>
                        )}
                      </div>
                      <Button
                        icon={<AudioOutlined />}
                        onClick={
                          status === "recording" ? stopRecording : startRecording
                        }
                        danger={status === "recording"}
                      />
                      <Input.TextArea
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        placeholder="Type a message..."
                        autoSize={{ minRows: 1, maxRows: 4 }}
                        onPressEnter={(e) => {
                          if (!e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                        style={{
                          borderRadius: 20,
                          padding: "8px 16px",
                          flex: 1,
                        }}
                      />
                      <Button
                        type="primary"
                        shape="circle"
                        icon={<SendOutlined />}
                        onClick={handleSendMessage}
                        disabled={!inputMessage.trim()}
                        style={{
                          backgroundColor: "#1890ff",
                          borderColor: "#1890ff",
                          width: 40,
                          height: 40,
                        }}
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexDirection: "column",
                    padding: 24,
                    textAlign: "center",
                    backgroundColor: "#f8f9fa",
                  }}
                >
                  <div
                    style={{
                      fontSize: 18,
                      color: "#7f8c8d",
                      marginBottom: 16,
                    }}
                  >
                    {user?.role === "student" && courseId
                      ? "Start a new conversation with your instructor"
                      : "Select a chat to view messages"}
                  </div>
                  {user?.role === "student" && courseId && (
                    <Button
                      type="primary"
                      onClick={startNewChat}
                      style={{
                        backgroundColor: "#1890ff",
                        borderColor: "#1890ff",
                      }}
                    >
                      Start New Chat
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>
    </>
  );
};

export default Chat;