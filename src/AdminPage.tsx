import { useState } from "react";
import { Home, LogOut } from "lucide-react";
import { useAuth } from "./contexts/auth/authProvider";
import QuestionCreator from "./Management/QuestionCreator";
import LectureManagement from "./Management/LectureManagement";
import { useNavigate } from "react-router-dom";
import Exercise from "./Management/exercise";
import { toast } from "react-hot-toast";
import SpeakingListening from "./Management/Listening";
import GameManagement from "./Management/GameManagement";
import SignLanguageManagement from "./Management/SignLanguageManagement";
import DictionaryManagement from "./Management/DictionaryManagement";
import IllustrationsManagement from "./Management/IllustrationsManagement";
import VietnameseExercisesManagement from "./Management/VietnameseExercisesManagement";
import ImageWordMatchingManagement from "./Management/ImageWordMatchingManagement";
import UserManagement from "./Management/UserManagement";

const AdminPage = () => {
  const { account } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("users");

  const handleLogout = async () => {
    try {
      await account.deleteSession("current");
      toast.success("Đăng xuất thành công!", {
        icon: "👋",
        style: {
          borderRadius: "10px",
          background: "#333",
          color: "#fff",
        },
      });
      navigate("/");
    } catch (error) {
      toast.error("Có lỗi xảy ra khi đăng xuất");
      console.error("Error during logout:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-6">
        {/* Header Actions */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Quản lí hệ thống
            </h1>
            <p className="text-gray-600 mt-2">
              Quản lý người dùng và tài liệu hệ thống
            </p>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => navigate("/homepage")}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Home className="w-4 h-4" />
              Trang chủ
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Đăng xuất
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-8 hidden md:block overflow-x-auto">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab("users")}
              className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "users"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Người dùng
            </button>
            <button
              onClick={() => setActiveTab("files")}
              className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "files"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Tập tin
            </button>
            <button
              onClick={() => setActiveTab("questions")}
              className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "questions"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Câu hỏi
            </button>
            <button
              onClick={() => setActiveTab("lecture")}
              className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "lecture"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Bài giảng
            </button>
            <button
              onClick={() => setActiveTab("speakinglistening")}
              className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "speakinglistening"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Luyện nghe
            </button>
            <button
              onClick={() => setActiveTab("games")}
              className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "games"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Trò chơi
            </button>
            <button
              onClick={() => setActiveTab("signlanguage")}
              className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "signlanguage"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Ngôn ngữ ký hiệu
            </button>
            <button
              onClick={() => setActiveTab("dictionary")}
              className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "dictionary"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Từ điển
            </button>
            <button
              onClick={() => setActiveTab("illustrations")}
              className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "illustrations"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Hình ảnh
            </button>
            <button
              onClick={() => setActiveTab("vietnameseExercises")}
              className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "vietnameseExercises"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Tiếng Việt
            </button>
            <button
              onClick={() => setActiveTab("wordMatching")}
              className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "wordMatching"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Ghép từ
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === "users" && <UserManagement />}
        {activeTab === "files" && <Exercise />}
        {activeTab === "questions" && <QuestionCreator />}
        {activeTab === "lecture" && <LectureManagement />}
        {activeTab === "speakinglistening" && <SpeakingListening />}
        {activeTab === "games" && <GameManagement />}
        {activeTab === "signlanguage" && <SignLanguageManagement />}
        {activeTab === "dictionary" && <DictionaryManagement />}
        {activeTab === "illustrations" && <IllustrationsManagement />}
        {activeTab === "vietnameseExercises" && (
          <VietnameseExercisesManagement />
        )}
        {activeTab === "wordMatching" && <ImageWordMatchingManagement />}
      </div>
    </div>
  );
};

export default AdminPage;
