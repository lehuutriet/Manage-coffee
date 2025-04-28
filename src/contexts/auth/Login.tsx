import React, { useEffect, useState } from "react";
import { useAuth } from "./authProvider";
import IconEdu from "../../image/IconEdu.jpg";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react"; // Import Eye icons

const Login: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false); // Add state for password visibility
  const [showTransition, setShowTransition] = useState(false); // Add state for transition effect
  const navigate = useNavigate();
  const { account } = useAuth();

  useEffect(() => {
    const storedEmail = localStorage.getItem("rememberedEmail");
    const storedPassword = localStorage.getItem("rememberedPassword");
    if (storedEmail && storedPassword) {
      setEmail(storedEmail);
      setPassword(storedPassword);
      setRememberMe(true);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (!navigator.onLine) {
        throw new Error("Không có kết nối internet. Vui lòng thử lại sau.");
      }

      // Kiểm tra và xóa session hiện tại nếu có
      try {
        const currentSession = await account.getSession("current");
        if (currentSession) {
          await account.deleteSession("current");
        }
      } catch (error) {
        // Bỏ qua lỗi nếu không có session
      }

      const session = await account.createEmailPasswordSession(email, password);
      const sessionKey = session.$id;
      localStorage.setItem("sessionKey", sessionKey);
      const user = await account.get();
      setSuccess("Đăng nhập thành công!");
      setError("");

      if (rememberMe) {
        localStorage.setItem("rememberedEmail", email);
        localStorage.setItem("rememberedPassword", password);
      } else {
        localStorage.removeItem("rememberedEmail");
        localStorage.removeItem("rememberedPassword");
      }

      setShowTransition(true);
      setTimeout(() => {
        if (user.labels && user.labels.includes("Admin")) {
          navigate("/admin");
        } else {
          navigate("/homepage");
        }
      }, 2000);
    } catch (err: any) {
      if (err.message) {
        setError(`Đăng nhập thất bại: ${err.message}`);
      } else {
        setError("Đăng nhập thất bại. Vui lòng kiểm tra thông tin đăng nhập.");
      }
      setSuccess("");
    }
    setIsSubmitting(false);
  };

  // Toggle password visibility
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleSignUp = (e: React.MouseEvent) => {
    e.preventDefault(); // Ngăn chặn hành vi mặc định
    navigate("/register");
  };

  return (
    <>
      {showTransition && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-blue-600">
          <div className="text-center">
            <div className="animate-bounce mb-4">
              <svg
                className="w-20 h-20 text-white mx-auto"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Đăng nhập thành công
            </h2>
            <p className="text-white">
              Đang chuyển hướng bạn đến trang tổng quan...
            </p>
          </div>
        </div>
      )}

      <div className="min-h-screen flex">
        {/* Left Section - Image */}
        <div className="hidden lg:flex lg:w-1/2 bg-blue-600 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-blue-500/50 to-blue-700/50"></div>
          <img
            src="https://images.unsplash.com/photo-1524178232363-1fb2b075b655?ixlib=rb-4.0.3"
            alt="Education Background"
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-0 left-0 right-0 p-12 text-white">
            <h2 className="text-4xl font-bold mb-4">Chào mừng bạn!</h2>
            <p className="text-lg">Hãy bắt đầu hành trình học tập của bạn.</p>
          </div>
        </div>

        {/* Right Section - Login Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gradient-to-br from-gray-50 to-gray-100">
          <div className="w-full max-w-md space-y-8 backdrop-blur-sm bg-white/80 p-8 rounded-2xl shadow-xl border border-gray-100">
            <div className="text-center">
              <div className="relative inline-block">
                <img
                  src={IconEdu}
                  alt="Icon Education"
                  className="mx-auto w-20 h-20 rounded-2xl shadow-lg transform transition-transform hover:scale-105 duration-300"
                />
                <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-blue-500 rounded-full border-2 border-white flex items-center justify-center">
                  <svg
                    className="w-3 h-3 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
              </div>
              <h1 className="mt-6 text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
                Chào mừng trở lại!
              </h1>
              <p className="mt-2 text-gray-500">
                Vui lòng đăng nhập vào tài khoản của bạn
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md animate-shake">
                <p className="text-red-700">{error}</p>
              </div>
            )}

            {success && (
              <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-md animate-fadeIn">
                <p className="text-green-700">{success}</p>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-6 mt-8">
              <div className="group">
                <label className="block text-sm font-medium text-gray-700 mb-1 transition-colors group-focus-within:text-blue-600">
                  Email address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg
                      className="h-5 w-5 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"
                      />
                    </svg>
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="block w-full pl-10 pr-3 py-3 appearance-none rounded-lg border border-gray-300 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="Enter your email"
                  />
                </div>
              </div>

              <div className="group">
                <label className="block text-sm font-medium text-gray-700 mb-1 transition-colors group-focus-within:text-blue-600">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg
                      className="h-5 w-5 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                      />
                    </svg>
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="block w-full pl-10 pr-10 py-3 appearance-none rounded-lg border border-gray-300 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={togglePasswordVisibility}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 hover:text-blue-500 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="rememberMe"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <label
                    htmlFor="rememberMe"
                    className="ml-2 text-sm text-gray-600 cursor-pointer hover:text-gray-800"
                  >
                    Remember me
                  </label>
                </div>
                <Link
                  to="/forgot-password"
                  className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline transition-all duration-200"
                >
                  Quên Mật Khẩu?
                </Link>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex justify-center py-3 px-4 rounded-lg text-white bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 font-medium transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {isSubmitting ? (
                  <span className="flex items-center">
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
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
                    Đang đăng nhập...
                  </span>
                ) : (
                  "Đăng nhập"
                )}
              </button>

              <div className="mt-6 text-center text-sm">
                <span className="text-gray-500">Không có tài khoản? </span>
                <button
                  type="button"
                  onClick={handleSignUp}
                  className="font-medium text-blue-600 hover:text-blue-500 hover:underline transition-all duration-200"
                >
                  Đăng ký ngay
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default Login;
