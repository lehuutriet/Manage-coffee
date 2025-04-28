import { useEffect, useState, useRef } from "react";
import { X, Menu, User, LogOut, Settings, BookOpen } from "lucide-react";
import { useAuth } from "../contexts/auth/authProvider";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "react-hot-toast";
import UserProfileModal from "./UserProfileModal";
import NotificationComponent from "./Notification";
import { motion } from "framer-motion";
import LogoApp from "../image/IconEdu.jpg";

const Navigation = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const { account } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const navbarHeight = useRef(0);
  const [userData, setUserData] = useState({
    name: "",
    email: "",
    avatarUrl: "",
  });
  const [isAdmin, setIsAdmin] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [lastFetch, setLastFetch] = useState<number>(0);
  const FETCH_COOLDOWN = 60000; // 1 minute cooldown
  const navRef = useRef<HTMLDivElement>(null);

  // Handle scroll với throttle để tránh gọi quá nhiều lần
  useEffect(() => {
    const handleScroll = () => {
      // Chỉ cập nhật state khi thực sự cần thiết
      const shouldBeScrolled = window.scrollY > 10;
      if (isScrolled !== shouldBeScrolled) {
        setIsScrolled(shouldBeScrolled);
      }
    };

    // Lưu chiều cao navbar ban đầu
    if (navRef.current) {
      navbarHeight.current = navRef.current.offsetHeight;
    }

    // Sử dụng passive: true để cải thiện hiệu suất
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [isScrolled]);

  // Xử lý click bên ngoài dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (
        !target.closest(".profile-dropdown") &&
        !target.closest(".profile-button")
      ) {
        setIsProfileDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Update getCachedUserData to include session check
  const getCachedUserData = () => {
    const currentSession = localStorage.getItem("currentSession");
    const cached = localStorage.getItem("userData");
    if (cached && currentSession) {
      const data = JSON.parse(cached);
      if (data.sessionId === currentSession) {
        return data;
      }
    }
    return null;
  };

  // Update getUserData to include session ID
  const getUserData = async () => {
    const now = Date.now();
    if (now - lastFetch < FETCH_COOLDOWN) {
      const cached = getCachedUserData();
      if (cached) {
        setIsAdmin(cached.isAdmin || false);
        setUserData(cached);
        return;
      }
    }

    try {
      const session = await account.getSession("current");
      const user = await account.get();
      const userData = {
        name: user.name || "",
        email: user.email || "",
        avatarUrl: user.prefs?.avatarUrl || "",
        isAdmin: user.labels?.includes("Admin") || false,
        sessionId: session.$id,
      };

      localStorage.setItem("currentSession", session.$id);
      localStorage.setItem("userData", JSON.stringify(userData));

      setIsAdmin(userData.isAdmin);
      setUserData(userData);
      setLastFetch(now);
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  };

  useEffect(() => {
    const cached = getCachedUserData();
    if (cached) {
      setIsAdmin(cached.isAdmin || false);
      setUserData(cached);
    } else {
      getUserData();
    }

    const handleUserUpdate = () => {
      localStorage.removeItem("userData");
      setLastFetch(0);
      getUserData();
    };
    window.addEventListener("userUpdated", handleUserUpdate);

    return () => {
      window.removeEventListener("userUpdated", handleUserUpdate);
    };
  }, [account]);

  const handleNavigation = (path: string) => {
    window.scrollTo(0, 0);
    navigate(path);
    setIsMobileMenuOpen(false);
    setIsProfileDropdownOpen(false);
  };

  const handleAdminNav = () => {
    navigate("/admin");
    setIsMobileMenuOpen(false);
    setIsProfileDropdownOpen(false);
  };

  const handleLogout = async () => {
    try {
      await account.deleteSession("current");
      localStorage.removeItem("userData");
      localStorage.removeItem("currentSession");
      setUserData({
        name: "",
        email: "",
        avatarUrl: "",
      });
      setIsAdmin(false);

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

  const isActiveLink = (path: string) => {
    if (path === "#") return false;
    return location.pathname.startsWith(path);
  };

  const toggleProfileDropdown = () => {
    setIsProfileDropdownOpen(!isProfileDropdownOpen);
  };

  const menuItems = [
    { text: "Trang chủ", path: "/homepage" },
    { text: "Bài học", path: "/lessonGrid" },
    { text: "Câu chuyện", path: "/story" },
    { text: "Đề kiểm tra", path: "/exam" },
    { text: "Ngôn ngữ kí hiệu", path: "/sign-language" },
    { text: "Từ điển", path: "/Dictionary" },
    { text: "Thảo luận", path: "/discussion" },
    { text: "Góp ý", path: "/feedback" },
  ];

  // Sử dụng một div cố định để giữ không gian khi navbar trở thành fixed
  const navbarPlaceholder = isScrolled ? (
    <div style={{ height: `${navbarHeight.current}px` }} />
  ) : null;

  return (
    <>
      {navbarPlaceholder}
      <div className="relative">
        {/* Thanh điều hướng */}
        <nav
          ref={navRef}
          className={`
            w-full
            ${
              isScrolled
                ? "fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-md shadow-md"
                : "relative bg-white/80 backdrop-blur-sm"
            } 
            px-4 sm:px-6 py-3
            transition-property-[background-color,box-shadow]
            transition-duration-300
            ease-in-out
            z-50
          `}
          style={{ willChange: "transform" }}
        >
          <div className="max-w-[1440px] mx-auto flex items-center justify-between">
            {/* Logo */}
            <div
              className="flex items-center cursor-pointer"
              onClick={() => handleNavigation("/homepage")}
            >
              <div className="relative group overflow-hidden rounded-xl">
                <img
                  src={LogoApp}
                  alt="VGM Education Logo"
                  className="h-10 w-auto sm:h-12 rounded-xl shadow-sm transition-all duration-300 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-indigo-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </div>
              <div className="ml-3 hidden sm:block">
                <span className="text-base sm:text-lg font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                  VGM Education
                </span>
              </div>
            </div>

            {/* Navigation Links - Desktop */}
            <div className="hidden lg:flex items-center space-x-1">
              {menuItems.map((item, index) => (
                <motion.button
                  key={index}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleNavigation(item.path)}
                  className={`
                    relative px-3 py-2 rounded-lg text-sm font-medium
                    ${
                      isActiveLink(item.path)
                        ? "text-white bg-gradient-to-r from-purple-600 to-indigo-600 shadow-sm"
                        : "text-gray-700 hover:bg-gray-100"
                    }
                    transition-all duration-200
                  `}
                >
                  {item.text}
                </motion.button>
              ))}
            </div>

            {/* Buttons & Profile - Right Side */}
            <div className="flex items-center space-x-2 sm:space-x-3">
              {/* Buttons for medium+ screens */}
              <div className="hidden md:flex items-center space-x-2">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleNavigation("/classroomManagement")}
                  className="px-3 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg text-sm font-medium shadow-sm hover:shadow-md transition-all duration-200"
                >
                  <span className="flex items-center space-x-1">
                    <BookOpen className="w-4 h-4 mr-1" />
                    <span>Lớp học</span>
                  </span>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleNavigation("/online-classroom")}
                  className="px-3 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg text-sm font-medium shadow-sm hover:shadow-md transition-all duration-200"
                >
                  <span className="flex items-center space-x-1">
                    <i className="ri-video-line mr-1"></i>
                    <span>Học online</span>
                  </span>
                </motion.button>
              </div>

              {/* Notification Button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <NotificationComponent />
              </motion.button>

              {/* Profile Button */}
              <div className="relative">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={toggleProfileDropdown}
                  className="profile-button flex items-center space-x-2 p-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg overflow-hidden shadow-sm">
                    {userData.avatarUrl ? (
                      <img
                        src={userData.avatarUrl}
                        alt={userData.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white font-medium">
                        {userData.name[0] || "U"}
                      </div>
                    )}
                  </div>
                  <span className="text-sm font-medium text-gray-700 hidden sm:block">
                    {userData.name || "User"}
                  </span>
                </motion.button>

                {/* Profile Dropdown - Sử dụng Portal để tránh vấn đề với CSS */}
                {isProfileDropdownOpen && (
                  <div
                    className="profile-dropdown absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-100 z-50 overflow-hidden"
                    style={{ transform: "translateZ(0)" }}
                  >
                    <div className="p-4 border-b border-gray-100">
                      <p className="font-medium text-gray-900 truncate">
                        {userData.name}
                      </p>
                      <p className="text-sm text-gray-500 truncate">
                        {userData.email}
                      </p>
                    </div>

                    <div className="py-1">
                      <button
                        onClick={() => {
                          setIsProfileModalOpen(true);
                          setIsProfileDropdownOpen(false);
                        }}
                        className="w-full flex items-center px-4 py-2.5 text-gray-700 hover:bg-purple-50 transition-colors"
                      >
                        <User className="w-4 h-4 text-gray-500 mr-3" />
                        <span className="text-sm">Thông tin cá nhân</span>
                      </button>

                      <button
                        onClick={() => handleNavigation("/favorite-words")}
                        className="w-full flex items-center px-4 py-2.5 text-gray-700 hover:bg-purple-50 transition-colors"
                      >
                        <i className="ri-heart-line text-gray-500 mr-3"></i>
                        <span className="text-sm">Từ yêu thích</span>
                      </button>

                      {/* Mobile-only buttons */}
                      <div className="block md:hidden border-t border-gray-100 mt-1 pt-1">
                        <button
                          onClick={() =>
                            handleNavigation("/classroomManagement")
                          }
                          className="w-full flex items-center px-4 py-2.5 text-gray-700 hover:bg-purple-50 transition-colors"
                        >
                          <BookOpen className="w-4 h-4 text-gray-500 mr-3" />
                          <span className="text-sm">Lớp học</span>
                        </button>

                        <button
                          onClick={() => handleNavigation("/online-classroom")}
                          className="w-full flex items-center px-4 py-2.5 text-gray-700 hover:bg-purple-50 transition-colors"
                        >
                          <i className="ri-video-line text-gray-500 mr-3"></i>
                          <span className="text-sm">Phòng học online</span>
                        </button>
                      </div>

                      {isAdmin && (
                        <button
                          onClick={handleAdminNav}
                          className="w-full flex items-center px-4 py-2.5 text-gray-700 hover:bg-purple-50 transition-colors"
                        >
                          <Settings className="w-4 h-4 text-gray-500 mr-3" />
                          <span className="text-sm">Quản trị viên</span>
                        </button>
                      )}
                    </div>

                    <div className="py-1 border-t border-gray-100">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center px-4 py-2.5 text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <LogOut className="w-4 h-4 mr-3" />
                        <span className="text-sm font-medium">Đăng xuất</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Mobile Menu Button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 lg:hidden"
                aria-label="Toggle menu"
              >
                {isMobileMenuOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Menu className="w-5 h-5" />
                )}
              </motion.button>
            </div>
          </div>
        </nav>

        {/* Mobile Menu - Fixed position với style tĩnh */}
        {isMobileMenuOpen && (
          <div
            className="lg:hidden fixed inset-x-0 bg-white z-40 shadow-lg overflow-hidden"
            style={{
              top: isScrolled
                ? `${navbarHeight.current}px`
                : `${navbarHeight.current}px`,
              maxHeight: `calc(100vh - ${navbarHeight.current}px)`,
              overflowY: "auto",
            }}
          >
            <div className="px-4 py-2">
              <div className="grid grid-cols-2 gap-2 mb-4">
                {menuItems.slice(0, 4).map((item, index) => (
                  <button
                    key={index}
                    onClick={() => handleNavigation(item.path)}
                    className={`
                      p-3 rounded-lg text-center transition-colors
                      ${
                        isActiveLink(item.path)
                          ? "bg-purple-100 text-purple-700 font-medium"
                          : "bg-gray-50 text-gray-700"
                      }
                    `}
                  >
                    {item.text}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2">
                {menuItems.slice(4).map((item, index) => (
                  <button
                    key={index + 4}
                    onClick={() => handleNavigation(item.path)}
                    className={`
                      p-3 rounded-lg text-center transition-colors
                      ${
                        isActiveLink(item.path)
                          ? "bg-purple-100 text-purple-700 font-medium"
                          : "bg-gray-50 text-gray-700"
                      }
                    `}
                  >
                    {item.text}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Profile Modal */}
        {isProfileModalOpen && (
          <UserProfileModal
            isOpen={isProfileModalOpen}
            onClose={() => setIsProfileModalOpen(false)}
          />
        )}
      </div>
    </>
  );
};

export default Navigation;
