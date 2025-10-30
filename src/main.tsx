import React from "react";
import ReactDOM from "react-dom/client";

// importa Bootstrap (solo CSS)
import "bootstrap/dist/css/bootstrap.min.css";

// i tuoi stili
import "./index.css";

import App from "./App";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
