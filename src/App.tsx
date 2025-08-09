import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Link, NavLink } from "react-router-dom";
import EducationCenter from "./pages/EducationCenter";
import Favorites from "./pages/Favorites";
import VideoNotes from "./pages/VideoNotes";
import Topics from "./pages/Topics";

export default function App() {
  const [isDark, setIsDark] = useState(() => {
    const savedTheme = localStorage.getItem("theme");
    return savedTheme === "dark";
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [followedTopics, setFollowedTopics] = useState<string[]>([]);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDark]);

  const handleToggleModal = (isOpen: boolean) => {
    setIsModalOpen(isOpen);
  };
  
  const handleFollowTopic = (topic: string) => {
    setFollowedTopics((prevTopics) => {
      if (prevTopics.includes(topic)) {
        return prevTopics;
      }
      return [...prevTopics, topic];
    });
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) => {
    const activeClasses = isDark ? 'bg-zinc-700 text-white shadow' : 'bg-white text-zinc-900 shadow';
    const inactiveClasses = isDark ? 'text-zinc-400 hover:text-white' : 'text-gray-500 hover:text-zinc-900';
    
    return `px-4 py-2 text-sm font-semibold rounded-full transition-colors duration-200 ${isActive ? activeClasses : inactiveClasses}`;
  };

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-white dark:bg-zinc-900 transition-colors duration-300">
        
        {!isModalOpen && (
          <header className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
            {/* Sol Taraf: Başlık */}
            <Link to="/" className="text-2xl font-bold tracking-tight dark:text-white">
              Education Center
            </Link>
            
            {/* Sağ Taraf: Butonlar ve Menü */}
            <div className="flex items-center space-x-4">
              
              {/* Buton Grubu */}
              <div className={`p-1 rounded-full flex space-x-1 ${isDark ? 'bg-zinc-800' : 'bg-gray-100'}`}>
                <NavLink to="/" end className={navLinkClass}>
                  Videolar
                </NavLink>
                <NavLink to="/favorites" className={navLinkClass}>
                  Beğendiklerim
                </NavLink>
                <NavLink to="/video-notes" className={navLinkClass}>
                  Video Notlarım
                </NavLink>
                <NavLink to="/topics" className={navLinkClass}>
                  Takip Ettiğim Konular
                </NavLink>
              </div>
              
              {/* Tema butonları */}
              <div className={`flex rounded-full p-1 shadow-md ${isDark ? 'bg-zinc-800' : 'bg-gray-100'}`}>
                <button
                  onClick={() => setIsDark(false)}
                  className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors duration-300
                  ${!isDark 
                    ? 'bg-white text-yellow-500' 
                    : 'text-zinc-400 hover:text-white'}`}
                  title="Aydınlık Temaya Geç"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <circle cx="12" cy="12" r="5" />
                    <line x1="12" y1="1" x2="12" y2="3" />
                    <line x1="12" y1="21" x2="12" y2="23" />
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                    <line x1="1" y1="12" x2="3" y2="12" />
                    <line x1="21" y1="12" x2="23" y2="12" />
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                  </svg>
                </button>
                <button
                  onClick={() => setIsDark(true)}
                  className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors duration-300
                  ${isDark 
                    ? 'bg-zinc-700 text-yellow-300' 
                    : 'text-zinc-500 hover:text-zinc-900'}`}
                  title="Koyu Temaya Geç"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
                  </svg>
                </button>
              </div>
            </div>
          </header>
        )}

        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <Routes>
            <Route path="/" element={<EducationCenter onModalToggle={handleToggleModal} onFollowTopic={handleFollowTopic} followedTopics={followedTopics} />} />
            <Route path="/favorites" element={<Favorites onModalToggle={handleToggleModal} />} />
            <Route path="/video-notes" element={<VideoNotes onModalToggle={handleToggleModal} />} />
            <Route path="/topics" element={<Topics onModalToggle={handleToggleModal} followedTopics={followedTopics} />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}