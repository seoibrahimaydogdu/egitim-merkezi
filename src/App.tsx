import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Link, NavLink } from "react-router-dom";
import EducationCenter from "./pages/EducationCenter";
import Favorites from "./pages/Favorites";

export default function App() {
  const [isDark, setIsDark] = useState(() => {
    const savedTheme = localStorage.getItem("theme");
    return savedTheme === "dark";
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDark]);

  const toggleTheme = () => {
    setIsDark(!isDark);
  };

  return (
    <BrowserRouter>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 bg-red-500">
        {/* Top Nav */}
        <div className="flex items-center justify-between mb-6">
          <Link to="/" className="text-xl font-semibold dark:text-white">Education Center</Link>
          <div className="flex items-center gap-4">
            <nav className="flex items-center gap-4">
              <NavLink
                to="/"
                end
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-lg ${
                    isActive
                      ? "bg-zinc-900 text-white dark:bg-zinc-700"
                      : "hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  }`
                }
              >
                Videolar
              </NavLink>
              <NavLink
                to="/favorites"
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-lg ${
                    isActive
                      ? "bg-zinc-900 text-white dark:bg-zinc-700"
                      : "hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  }`
                }
              >
                Beğendiklerim
              </NavLink>
            </nav>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800"
              aria-label="Toggle theme"
            >
              {isDark ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-zinc-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    d="M17.293 13.529a7.5 7.5 0 01-10.825-10.825 5.5 5.5 0 107.545 7.545.999.999 0 01-.65.275 1.5 1.5 0 10-.625.594.999.999 0 01-.275.65 7.502 7.502 0 01-.422-.422c-.676-.676-1.594-1.127-2.613-1.258a1.5 1.5 0 10-.594.625.999.999 0 01-.275.65 7.502 7.502 0 01-.422-.422c-.676-.676-1.594-1.127-2.613-1.258z"
                    clipRule="evenodd"
                    fillRule="evenodd"
                  />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-zinc-600"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4.364 1.636a1 1 0 010 1.414l-.707.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zm-7.728 0a1 1 0 011.414 0L7.757 4.343a1 1 0 11-1.414 1.414L4.929 4.929a1 1 0 010-1.414zm-.858 10.486a1 1 0 011.414 0l.707.707a1 1 0 11-1.414 1.414l-.707-.707a1 1 0 010-1.414zM3 10a1 1 0 011-1h1a1 1 0 110 2H4a1 1 0 01-1-1zm14 0a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zm-7.728 6.636a1 1 0 010-1.414l.707-.707a1 1 0 111.414 1.414l-.707.707a1 1 0 01-1.414 0zM4.929 15.071a1 1 0 011.414 0l.707.707a1 1 0 11-1.414 1.414l-.707-.707a1 1 0 010-1.414zM10 15a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* 7. madde test kutusu */}
        <div className="bg-black text-white p-4 rounded-xl mb-4">
          Tailwind çalışıyor mu?
        </div>

        <Routes>
          <Route path="/" element={<EducationCenter />} />
          <Route path="/favorites" element={<Favorites />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
