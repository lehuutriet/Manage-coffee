import { useEffect, useState } from "react";
import Navigation from "../Navigation/Navigation";
import {
  Book,
  Home,
  BookOpenText,
  Menu,
  X,
  Gamepad,
  Image,
  AlignLeft,
} from "lucide-react";

import PronunciationLesson from "./PronunciationLesson";
import LearningContent from "./LearningContent";
import LessonDetail from "./LessonList";
import GameArea from "../Game/GameArea";
import Illustrations from "./Illustrations";
import VietnameseExercises from "./VietnameseExercises";

interface SidebarMenuItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}

const SidebarMenuItem: React.FC<SidebarMenuItemProps> = ({
  icon,
  label,
  active = false,
  onClick,
}) => (
  <div
    onClick={onClick}
    className={`
     flex items-center gap-4 px-6 py-4 rounded-xl cursor-pointer
     transition-all duration-300 ease-in-out group
     hover:scale-105 relative
     ${
       active
         ? "bg-gradient-to-r from-purple-100 to-purple-50 text-purple-600 shadow-sm"
         : "hover:bg-gray-50 text-gray-700 hover:text-purple-600"
     }
   `}
  >
    <div
      className={`
       w-12 h-12 rounded-xl flex items-center justify-center
       transition-all duration-300
       transform group-hover:rotate-6
       ${
         active
           ? "bg-gradient-to-br from-purple-600 to-indigo-600 text-white shadow-lg"
           : "bg-gray-100 text-gray-600 group-hover:bg-purple-100 group-hover:text-purple-600"
       }
     `}
    >
      {icon}
    </div>
    <span className="font-medium text-lg tracking-wide">{label}</span>

    {/* Hover effect line */}
    <div
      className="absolute bottom-0 left-1/2 w-0 h-0.5 bg-purple-600 
                   transition-all duration-300 group-hover:w-full group-hover:left-0"
    />
  </div>
);

const LessonGrid = () => {
  const [activeTab, setActiveTab] = useState("learning");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProgressOpen, setIsProgressOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Add debouncing to scroll handler
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const handleScroll = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setIsScrolled(window.scrollY > 0);
      }, 10);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      clearTimeout(timeoutId);
    };
  }, []);

  const renderContent = () => {
    switch (activeTab) {
      case "pronunciation":
        return <PronunciationLesson />;
      case "learning":
        return <LearningContent />;
      case "lessonViewer":
        return <LessonDetail />;
      case "game":
        return <GameArea />;
      case "illustrations":
        return <Illustrations />;
      case "vietnameseExercises":
        return <VietnameseExercises />;

      default:
        return <div className="text-center p-8">Tính năng đang phát triển</div>;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white">
      <Navigation />

      <div className="flex relative">
        {" "}
        {/* Add relative positioning here */}
        {/* Mobile Menu Button */}
        {!isSidebarOpen && (
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="fixed top-[73px] left-4 z-50 md:hidden bg-white p-2 
                    rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 
                    hover:bg-purple-50 hover:text-purple-600"
          >
            <Menu className="w-6 h-6 text-gray-700" />
          </button>
        )}
        {/* Sidebar */}
        <div
          className={`
            fixed top-[73px] h-[calc(100vh-73px)] 
            w-[300px]
            border-r border-gray-100
            px-4 py-6 
            transition-all duration-300 ease-in-out
            ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
            md:translate-x-0
            flex flex-col gap-3
            z-40
            ${
              isScrolled
                ? "bg-white/80 backdrop-blur-md shadow-lg"
                : "bg-transparent"
            }
          `}
        >
          {/* Logo area */}

          <div className="flex-1 space-y-2">
            <SidebarMenuItem
              icon={<Home className="w-6 h-6" />}
              label="BÀI TẬP"
              active={activeTab === "learning"}
              onClick={() => {
                setActiveTab("learning");
                setIsSidebarOpen(false);
              }}
            />
            <SidebarMenuItem
              icon={<Book className="w-6 h-6" />}
              label="PHÁT ÂM"
              active={activeTab === "pronunciation"}
              onClick={() => {
                setActiveTab("pronunciation");
                setIsSidebarOpen(false);
              }}
            />
            <SidebarMenuItem
              icon={<BookOpenText className="w-6 h-6" />}
              label="BÀI GIẢNG"
              active={activeTab === "lessonViewer"}
              onClick={() => {
                setActiveTab("lessonViewer");
                setIsSidebarOpen(false);
              }}
            />
            <SidebarMenuItem
              icon={<Gamepad className="w-6 h-6" />}
              label="TRÒ CHƠI"
              active={activeTab === "game"}
              onClick={() => {
                setActiveTab("game");
                setIsSidebarOpen(false);
              }}
            />

            <SidebarMenuItem
              icon={<Image className="w-6 h-6" />}
              label="HÌNH ẢNH "
              active={activeTab === "illustrations"}
              onClick={() => {
                setActiveTab("illustrations");
                setIsSidebarOpen(false);
              }}
            />
            <SidebarMenuItem
              icon={<AlignLeft className="w-6 h-6" />}
              label="TIẾNG VIỆT"
              active={activeTab === "vietnameseExercises"}
              onClick={() => {
                setActiveTab("vietnameseExercises");
                setIsSidebarOpen(false);
              }}
            />
          </div>

          {/* Mobile Close Button */}
          {isSidebarOpen && (
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="md:hidden mx-auto p-3 rounded-xl bg-gray-100 
                      hover:bg-purple-100 hover:text-purple-600
                      transition-all duration-300"
            >
              <X className="w-6 h-6 text-gray-700" />
            </button>
          )}
        </div>
        {/* Add margin to main content to prevent overlap with fixed sidebar */}
        <div className="flex-1 min-w-0 md:ml-[300px]">
          <div className="w-full">{renderContent()}</div>
        </div>
        {/* Overlay for mobile */}
        {(isSidebarOpen || isProgressOpen) && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-30 md:hidden"
            onClick={() => {
              setIsSidebarOpen(false);
              setIsProgressOpen(false);
            }}
          />
        )}
      </div>
    </div>
  );
};

export default LessonGrid;
