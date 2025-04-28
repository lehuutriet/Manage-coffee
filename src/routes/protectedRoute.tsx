import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/auth/authProvider";
import toast from "react-hot-toast";

interface ProtectedRouteProps {
  children: JSX.Element;
  requiredRole?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
}) => {
  const { isAuthenticated, checkAuthStatus, userRole } = useAuth();
  const navigate = useNavigate();

  // Trong protectedRoute.tsx
  useEffect(() => {
    const verifyAuth = async () => {
      try {
        if (navigator.onLine) {
          await checkAuthStatus();
        } else {
          // Nếu offline và có session trong localStorage thì vẫn cho phép truy cập
          const hasSession = localStorage.getItem("sessionKey");
          if (!hasSession) {
            navigate("/", { replace: true });
          }
        }
      } catch (error: unknown) {
        // Lưu đường dẫn hiện tại
        localStorage.setItem("lastPath", window.location.pathname);

        // Kiểm tra nếu là lỗi server sập
        if (error instanceof Error && error.message === "Failed to fetch") {
          toast.error("Server đang gặp sự cố, vui lòng thử lại sau");
          return; // Không làm gì thêm khi server sập
        }

        // Chỉ chuyển hướng khi thực sự không có session
        const hasSession = localStorage.getItem("sessionKey");
        if (!hasSession) {
          navigate("/", { replace: true });
        }
      }
    };
    verifyAuth();
  }, [checkAuthStatus, navigate]);

  if (!isAuthenticated) {
    navigate("/", { replace: true });
    return null;
  }

  if (requiredRole && userRole !== requiredRole) {
    navigate("/unauthorized", { replace: true });
    return null;
  }

  return children;
};

export default ProtectedRoute;
