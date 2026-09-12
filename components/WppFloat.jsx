import React from "react";
import { MessageCircle } from "lucide-react";
import { whatsappLink } from "./publicUtils.js";
export default function WppFloat() {
  return (
    <a
      className="public-wpp-float"
      href={whatsappLink()}
      target="_blank"
      rel="noreferrer"
      aria-label="Converse com a VilaVix no WhatsApp"
    >
      <MessageCircle size={23} />
      <span>Vamos conversar</span>
    </a>
  );
}
