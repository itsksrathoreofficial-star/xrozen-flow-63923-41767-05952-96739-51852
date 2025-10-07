import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./lib/consoleFilter"; // Import console filter to hide GoTrue logs
import "./lib/auth-utils"; // Import auth utilities to clear expired tokens

createRoot(document.getElementById("root")!).render(<App />);
