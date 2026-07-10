import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Reader } from "./Reader";
import "./styles.css";

const root = document.getElementById("root");

if (!root) throw new Error("Reader root element is unavailable.");

createRoot(root).render(
  <StrictMode>
    <Reader />
  </StrictMode>,
);
