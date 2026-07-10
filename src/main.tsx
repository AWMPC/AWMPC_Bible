import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AwmpcBibleApp } from "./AwmpcBibleApp";
import "./styles.css";

const root = document.getElementById("root");

if (!root) throw new Error("AWMPC Bible root element is unavailable.");

createRoot(root).render(
  <StrictMode>
    <AwmpcBibleApp />
  </StrictMode>,
);
