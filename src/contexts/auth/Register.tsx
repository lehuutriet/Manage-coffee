import React, { useState } from "react";
import { useAuth } from "./authProvider";
import { useNavigate } from "react-router-dom";
import IconEdu from "../../image/IconEdu.jpg";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import { ExecutionMethod } from "appwrite";
import { toast } from "react-hot-toast";

const Register: React.FC = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { functions } = useAuth();
  const functionId = "6746ea5c6eaf6e2b78ad";

  const validateForm = () => {
    if (!formData.name.trim()) {
      setError("Vui lòng nhập họ và tên");
      return false;
    }
    if (!formData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      setError("Email không hợp lệ");
      return false;
    }
    if (!formData.phone.match(/^\+?[0-9]{10,12}$/)) {
      setError("Số điện thoại không hợp lệ");
      return false;
    }
    if (!formData.password || formData.password.length < 8) {
      setError("Mật khẩu phải có ít nhất 8 ký tự");
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError("Mật khẩu nhập lại không khớp");
      return false;
    }
    return true;
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    setError("");

    try {
      const payload = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone.startsWith("+")
          ? formData.phone
          : `+${formData.phone}`,
        password: formData.password,
        labels: ["Student"],
      };

      const response = await functions.createExecution(
        functionId,
        JSON.stringify(payload),
        false,
        "/add-users",
        ExecutionMethod.POST
      );

      if (!response?.responseBody) {
        throw new Error("Không nhận được phản hồi từ server");
      }

      const result = JSON.parse(response.responseBody);

      if (result.status === "error") {
        throw new Error(result.message || "Không thể đăng ký tài khoản");
      }

      // Sau khi đăng ký thành công
      toast.success("Đăng ký thành công! Vui lòng đăng nhập để tiếp tục.");

      // Clear form
      setFormData({
        name: "",
        email: "",
        phone: "",
        password: "",
        confirmPassword: "", // Thêm dòng này
      });

      // Chuyển về trang đăng nhập sau 2 giây
      setTimeout(() => {
        navigate("/");
      }, 2000);
    } catch (error: any) {
      console.error("Lỗi đăng ký:", error);
      setError(error.message || "Không thể đăng ký tài khoản");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Section - Image with Overlay */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-500/50 to-blue-700/50"></div>
        <img
          src="https://images.unsplash.com/photo-1524178232363-1fb2b075b655?ixlib=rb-4.0.3"
          alt="Education Background"
          className="w-full h-full object-cover"
        />
        <div className="absolute bottom-0 left-0 right-0 p-12 text-white z-20 animate-fade-up">
          <h2 className="text-5xl font-bold mb-6 leading-tight">
            Bắt đầu hành trình
            <br />
            học tập của bạn
          </h2>
          <p className="text-xl text-gray-200">
            Khám phá kiến thức mới cùng cộng đồng của chúng tôi
          </p>
        </div>
      </div>

      {/* Right Section - Registration Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="w-full max-w-md space-y-6">
          <div className="bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-gray-100/50">
            <div className="flex justify-between items-center mb-8">
              <button
                onClick={() => navigate("/")}
                className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-all duration-200"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <img
                src={IconEdu}
                alt="Logo"
                className="w-16 h-16 rounded-xl shadow-lg transform hover:scale-105 transition-transform duration-200"
              />
              <div className="w-8"></div>
            </div>

            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Tạo tài khoản mới
              </h2>
              <p className="text-gray-600">
                Tham gia cộng đồng học tập của chúng tôi
              </p>
            </div>

            {error && (
              <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-md animate-shake">
                <p className="text-red-700">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 block">
                  Họ và tên
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                  placeholder="Nhập họ và tên của bạn"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 block">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                  placeholder="example@email.com"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 block">
                  Số điện thoại
                </label>
                <PhoneInput
                  country={"vn"}
                  value={formData.phone}
                  onChange={(phone) =>
                    setFormData({ ...formData, phone: `+${phone}` })
                  }
                  inputStyle={{
                    width: "100%",
                    height: "48px",
                    fontSize: "16px",
                    borderRadius: "0.5rem",
                  }}
                  containerClass="hover:opacity-80 transition-opacity duration-200"
                />
              </div>

              {/* Trường mật khẩu hiện tại */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Mật khẩu
                </label>
                <div className="relative mt-1">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Tạo mật khẩu"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>

              {/* Thêm trường nhập lại mật khẩu */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Nhập lại mật khẩu
                </label>
                <div className="relative mt-1">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={formData.confirmPassword}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        confirmPassword: e.target.value,
                      })
                    }
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Nhập lại mật khẩu"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-medium hover:from-blue-700 hover:to-blue-800 focus:ring-4 focus:ring-blue-200 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <svg
                      className="animate-spin h-5 w-5 mr-3"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Đang xử lý...
                  </div>
                ) : (
                  "Đăng ký ngay"
                )}
              </button>

              <div className="text-center mt-6">
                <span className="text-gray-600">Đã có tài khoản? </span>
                <button
                  type="button"
                  onClick={() => navigate("/")}
                  className="font-medium text-blue-600 hover:text-blue-700 transition-colors duration-200"
                >
                  Đăng nhập
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
