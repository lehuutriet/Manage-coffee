import {
  GraduationCap,
  Brain,
  Heart,
  Facebook,
  Youtube,
  Mail,
  Phone,
  MapPin,
} from "lucide-react";

const EducationalFooter = () => {
  const floatingObjects = [
    { id: 1, icon: "✏️", delay: "0s", left: "10%" },
    { id: 2, icon: "📚", delay: "2s", left: "25%" },
    { id: 3, icon: "🎨", delay: "4s", left: "45%" },
    { id: 4, icon: "🔬", delay: "1s", left: "65%" },
    { id: 5, icon: "🎵", delay: "3s", left: "80%" },
    { id: 6, icon: "🌟", delay: "5s", left: "90%" },
  ];

  return (
    <footer className="relative bg-gradient-to-br from-blue-600 to-purple-600 text-white overflow-hidden mt-60">
      {/* Floating Objects */}
      {floatingObjects.map((obj) => (
        <div
          key={obj.id}
          className="absolute text-2xl opacity-20 animate-bounce"
          style={{
            left: obj.left,
            animationDelay: obj.delay,
            animationDuration: "3s",
            top: "20%",
          }}
        >
          {obj.icon}
        </div>
      ))}

      <div className="max-w-7xl mx-auto px-4 py-16">
        {/* Top Wave Pattern */}
        <div className="absolute top-0 left-0 right-0 overflow-hidden w-full">
          <svg
            className="animate-[slide_15s_linear_infinite] w-[200%]"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 1440 320"
          >
            <path
              fill="currentColor"
              fillOpacity="0.1"
              d="M0,96L48,112C96,128,192,160,288,186.7C384,213,480,235,576,213.3C672,192,768,128,864,128C960,128,1056,192,1152,213.3C1248,235,1344,213,1392,202.7L1440,192L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
            ></path>
          </svg>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {/* VGM Education */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-8">
              <GraduationCap className="w-8 h-8 text-teal-300" />
              <h3 className="text-2xl font-bold">VGM Giáo Dục</h3>
            </div>
            <p className="text-blue-100 text-lg leading-relaxed">
              Truyền cảm hứng và định hình tương lai thông qua giáo dục đổi mới
              và học tập suốt đời.
            </p>
            <div className="flex gap-4 pt-4">
              <a href="#" className="hover:text-teal-300 transition-colors">
                <Facebook className="w-6 h-6" />
              </a>
              <a href="#" className="hover:text-teal-300 transition-colors">
                <Youtube className="w-6 h-6" />
              </a>
            </div>
          </div>

          {/* Tính Năng */}
          <div className="space-y-6">
            <h4 className="text-xl font-semibold flex items-center gap-3 mb-8">
              <Brain className="w-8 h-8 text-teal-300" />
              Tính Năng
            </h4>
            <ul className="space-y-4">
              <li className="flex items-center gap-3 group">
                <Heart className="w-5 h-5 text-teal-300 transition-transform duration-300 group-hover:scale-125" />
                <span className="text-blue-100 text-lg group-hover:text-teal-300 transition-colors">
                  Học Tập Tương Tác
                </span>
              </li>
              <li className="flex items-center gap-3 group">
                <Heart className="w-5 h-5 text-teal-300 transition-transform duration-300 group-hover:scale-125" />
                <span className="text-blue-100 text-lg group-hover:text-teal-300 transition-colors">
                  Giảng Viên Chuyên Nghiệp
                </span>
              </li>
              <li className="flex items-center gap-3 group">
                <Heart className="w-5 h-5 text-teal-300 transition-transform duration-300 group-hover:scale-125" />
                <span className="text-blue-100 text-lg group-hover:text-teal-300 transition-colors">
                  Hỗ Trợ 24/7
                </span>
              </li>
            </ul>
          </div>

          {/* Liên Hệ */}
          <div className="space-y-6">
            <h4 className="text-xl font-semibold flex items-center gap-3 mb-8">
              <Phone className="w-8 h-8 text-teal-300" />
              Liên Hệ
            </h4>
            <ul className="space-y-4">
              <li className="flex items-center gap-3 group">
                <Mail className="w-5 h-5 text-teal-300" />
                <span className="text-blue-100 text-lg hover:text-teal-300 transition-colors">
                  contact@vgm.edu.vn
                </span>
              </li>
              <li className="flex items-center gap-3 group">
                <Phone className="w-5 h-5 text-teal-300" />
                <span className="text-blue-100 text-lg hover:text-teal-300 transition-colors">
                  0123.456.789
                </span>
              </li>
              <li className="flex items-start gap-3 group">
                <MapPin className="w-5 h-5 text-teal-300 flex-shrink-0 mt-1" />
                <span className="text-blue-100 text-lg hover:text-teal-300 transition-colors">
                  123 Đường ABC, Quận XYZ, TP.HCM
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-16 pt-8 border-t border-blue-400/30 text-center text-blue-200">
          <p className="text-lg">&copy; 2025 VGM Giáo Dục.</p>
        </div>
      </div>
    </footer>
  );
};

export default EducationalFooter;
