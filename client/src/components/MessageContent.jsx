import React, { useState, useEffect } from "react";
import {
  FileOutlined,
  PlayCircleOutlined,
  LoadingOutlined,
} from "@ant-design/icons";
import axios from "axios";
import { Spin } from "antd";

const MessageContent = ({ message, user }) => {
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = message.content?.match(urlRegex);

    if (urls && urls.length > 0) {
      setLoading(true);
      setError(null);
      axios
        .get(
          `http://localhost:8080/api/v1/chat/get-link-preview?url=${urls[0]}`
        )
        .then(({ data }) => {
          setPreview(data.data);
        })
        .catch((err) => {
          console.error(err);
          setError("Failed to load link preview");
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [message.content]);

  const isSender = message.sender._id === user._id;

  switch (message.messageType) {
    case "image":
      return (
        <img
          src={message.fileUrl}
          alt={message.content}
          style={{ maxWidth: "100%", borderRadius: "8px" }}
        />
      );
    case "video":
      return (
        <div style={{ position: "relative" }}>
          <video
            src={message.fileUrl}
            style={{ maxWidth: "100%", borderRadius: "8px" }}
          />
          <PlayCircleOutlined
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              fontSize: "48px",
              color: "white",
            }}
            onClick={() => {
              const video = document.querySelector(
                `video[src="${message.fileUrl}"]`
              );
              if (video) {
                video.play();
              }
            }}
          />
        </div>
      );
    case "audio":
      return (
        <audio
          src={message.fileUrl}
          controls
          style={{
            filter: isSender ? "invert(1)" : "invert(0)",
          }}
        />
      );
    case "file":
      return (
        <a
          href={message.fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: "inherit",
            display: "flex",
            alignItems: "center",
          }}
        >
          <FileOutlined style={{ marginRight: "8px" }} />
          {message.content}
        </a>
      );
    default:
      if (loading) {
        return (
          <Spin indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />} />
        );
      }
      if (error) {
        return <div>{error}</div>;
      }
      if (preview) {
        return (
          <a
            href={preview.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "inherit", textDecoration: "none" }}
          >
            {preview.images.length > 0 && (
              <img
                src={preview.images[0]}
                alt={preview.title}
                style={{ maxWidth: "100%", borderRadius: "8px" }}
              />
            )}
            <div style={{ padding: "8px" }}>
              <div style={{ fontWeight: "bold" }}>{preview.title}</div>
              <div>{preview.description}</div>
            </div>
          </a>
        );
      }
      return <div style={{ wordBreak: "break-word" }}>{message.content}</div>;
  }
};

export default MessageContent;