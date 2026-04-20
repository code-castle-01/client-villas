import React from "react";
import { createRoot } from "react-dom/client";
import dayjs from "dayjs";
import weekday from "dayjs/plugin/weekday";
import localeData from "dayjs/plugin/localeData";
import weekOfYear from "dayjs/plugin/weekOfYear";
import weekYear from "dayjs/plugin/weekYear";
import customParseFormat from "dayjs/plugin/customParseFormat";
import "dayjs/locale/es";

import App from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { initPwaRegistration } from "./pwa/register";
import { initPwaInstallPromptCapture } from "./pwa/usePwaInstallPrompt";

dayjs.extend(weekday);
dayjs.extend(localeData);
dayjs.extend(weekOfYear);
dayjs.extend(weekYear);
dayjs.extend(customParseFormat);
dayjs.locale("es");

initPwaInstallPromptCapture();

const container = document.getElementById("root") as HTMLElement;
const root = createRoot(container);

root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);

initPwaRegistration();
