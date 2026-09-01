import { createRoot } from "react-dom/client";
import { StudioMount } from "../src/StudioMount";
import "../src/styles/clotho-editor.css";
import "./standalone.css";

const root = document.getElementById("root");
if (!root) throw new Error("에디터를 표시할 요소를 찾지 못했습니다.");

createRoot(root).render(<StudioMount />);
