import { useEffect, useState } from "react";
import { useAuth } from "./contexts/auth/authProvider";
import Navigation from "../src/Navigation/Navigation";
import imageEdu from "../src/image/imageEdu.jpg";
import { Book, Video, Users, ArrowRight } from "lucide-react";
import EducationalFooter from "../src/EducationalFooter/EducationalFooter";
import { useNavigate } from "react-router-dom";

const HomePage = () => {
  const { account } = useAuth();
  const [, setUserData] = useState({ name: "", email: "" });
  const [, setIsAdmin] = useState(false);
  const navigate = useNavigate();
  useEffect(() => {
    const getUserData = async () => {
      try {
        const user = await account.get();
        setIsAdmin(user.labels?.includes("Admin") || false);
        setUserData({
          name: user.name || "",
          email: user.email || "",
        });
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };
    getUserData();
  }, [account]);

  const features = [
    {
      icon: Book,
      title: "Khóa học đa dạng",
      description:
        "Khóa học từ cơ bản đến nâng cao trong nhiều lĩnh vực khác nhau",
    },
    {
      icon: Video,
      title: "Học mọi lúc mọi nơi",
      description:
        "Truy cập không giới hạn với nội dung học tập theo tiến độ của riêng bạn",
    },
    {
      icon: Users,
      title: "Tương tác trực tiếp",
      description:
        "Kết nối với giảng viên và học viên thông qua các buổi thảo luận trực tuyến",
    },
  ];

  return (
    <div className="min-h-screen bg-white overflow-hidden">
      <Navigation />

      {/* Hero Section with floating elements */}
      <div className="bg-gradient-to-br from-purple-50 via-blue-50 to-purple-50 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 md:py-24">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            {/* Image Section - Now on Left */}
            <div className="relative order-2 md:order-1">
              <div className="bg-white p-8 rounded-2xl shadow-xl transform hover:scale-110 transition-transform duration-300">
                <img
                  src={imageEdu}
                  alt="Online Learning"
                  className="w-full h-auto rounded-lg"
                />
              </div>
            </div>

            {/* Content Section - Now on Right */}
            <div className="space-y-8 order-1 md:order-2">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
                Nền tảng học tập <br />
                <span className="text-purple-600">thông minh</span> cho <br />
                tương lai
              </h1>
              <p className="text-lg text-gray-600 max-w-lg">
                Khám phá hành trình học tập với công nghệ hiện đại, giáo viên
                chất lượng và cộng đồng học tập năng động. Mở ra cánh cửa tri
                thức cho tương lai của bạn.
              </p>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => navigate("/lessonGrid")}
                  className="bg-purple-600 text-white px-8 py-3 rounded-xl transition-all duration-300 hover:bg-purple-700 hover:shadow-lg flex items-center gap-2 cursor-pointer"
                >
                  Bắt đầu học tập
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section with enhanced visuals */}
      <div className="bg-gradient-to-b from-white to-purple-50 py-20 relative">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-purple-100 rounded-full blur-2xl opacity-50"></div>
          <div className="absolute bottom-0 left-0 w-60 h-60 bg-blue-100 rounded-full blur-2xl opacity-50"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 relative">
          <div className="text-center mb-16">
            <div className="inline-block">
              <span className="bg-purple-100 text-purple-700 px-4 py-1 rounded-full text-sm font-medium mb-4 inline-block">
                Tính năng nổi bật
              </span>
            </div>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Trải nghiệm học tập hiện đại
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto text-lg">
              Khám phá nền tảng học tập thông minh với đầy đủ tính năng
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group bg-white p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-blue-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500"></div>
                <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-purple-200 transition-colors duration-300">
                  <feature.icon className="w-8 h-8 text-purple-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                  {feature.title}
                </h3>
                <p className="text-gray-600 text-lg leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Styles moved to CSS file */}
      <style>
        {`
          @keyframes float {
            0%, 100% {
              transform: translateY(0);
            }
            50% {
              transform: translateY(-20px);
            }
          }
          .animate-float {
            animation: float 6s ease-in-out infinite;
          }
          .animate-float-delayed {
            animation: float 6s ease-in-out infinite;
            animation-delay: 2s;
          }
        `}
      </style>

      <EducationalFooter />
    </div>
  );
};

export default HomePage;
