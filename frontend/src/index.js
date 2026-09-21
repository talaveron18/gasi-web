import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import App from "@/App";

window.addEventListener("error",(event)=>{
  if(
    event.error instanceof DOMException &&
    event.error.name === "DataCloneError" &&
    event.message?.includes("PerformanceServerTiming")
  ){
    event.stopImmediatePropagation();
    event.preventDefault();
  }
},true);

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
