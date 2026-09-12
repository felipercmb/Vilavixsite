import React from "react";
import officialLogo from "../assets/brand/vilavix-logo.png";

/** Original VilaVix artwork, shared by the website and CRM. */
export default function Logo({ light = false, big = false, onClick }) {
  return (
    <span
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        width: big ? 218 : 156,
        maxWidth: "100%",
        padding: light ? "10px 12px" : 0,
        background: light ? "#fff" : undefined,
        borderRadius: light ? 14 : 0,
        cursor: onClick ? "pointer" : undefined,
        boxSizing: "border-box",
        flexShrink: 0,
      }}
    >
      <img
        src={officialLogo}
        alt="VilaVix Imóveis"
        width="1124"
        height="334"
        style={{ display: "block", width: "100%", height: "auto" }}
      />
    </span>
  );
}
