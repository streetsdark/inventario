import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";

export default function Layout({ children }) {
  const location = useLocation();
  const page = location.pathname.replace("/", "") || "dashboard";

  const [mode, setMode] = useState(() => {
    return localStorage.getItem("theme") === "dark";
  });

  useEffect(() => {
    const htmlElement = document.documentElement;
    if (mode) {
      htmlElement.classList.add("dark");
      htmlElement.classList.remove("light");
      localStorage.setItem("theme", "dark");
    } else {
      htmlElement.classList.add("light");
      htmlElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [mode]);

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar page={page} mode={mode} setMode={setMode} />
      <main style={{ flex: 1, width: "100%" }}>
        {children}
      </main>
    </div>
  );
}