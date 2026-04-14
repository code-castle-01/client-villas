import React from "react";
import { Button, Tooltip } from "antd";
import { MessageOutlined } from "@ant-design/icons";

interface WhatsAppShareButtonProps {
  message: string;
  size?: "small" | "middle" | "large";
  shape?: "default" | "circle" | "round";
  tooltip?: string;
}

export const WhatsAppShareButton: React.FC<WhatsAppShareButtonProps> = ({
  message,
  size = "small",
  shape = "circle",
  tooltip = "Compartir por WhatsApp",
}) => {
  const handleShare = () => {
    const shareUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(shareUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <Tooltip title={tooltip}>
      <Button
        size={size}
        shape={shape}
        onClick={handleShare}
        icon={<MessageOutlined />}
        style={{
          color: "#25D366",
          borderColor: "#25D366",
        }}
      />
    </Tooltip>
  );
};

export default WhatsAppShareButton;
