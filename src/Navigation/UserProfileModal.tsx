import React, { useState, useEffect, useRef } from "react";
import {
  User,
  Camera,
  ChevronLeft,
  Loader2,
  Lock,
  EyeOff,
  Eye,
} from "lucide-react";
import { useAuth } from "../contexts/auth/authProvider";
import PhoneInput from "react-phone-input-2";
import { toast } from "react-hot-toast";
import { ExecutionMethod } from "appwrite";

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { account, functions, storage } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [showPasswords, setShowPasswords] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });
  const imageforProfile = "677b9ade002576cc5ecf";
  const roleMapping: { [key: string]: string } = {
    Admin: "Quản trị viên",
    Teacher: "Giáo viên",
    Student: "Học sinh",
    Instructor: "Giảng viên",
    Parent: "Phụ huynh",
  };
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    avatarUrl: "",
    labels: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
    registration: "",
  });
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date
      .toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
      .replace(",", "");
  };
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const user = await account.get();
        setFormData((prev) => ({
          ...prev,
          name: user.name || "",
          email: user.email || "",
          phone: user.phone || "",
          avatarUrl: user.prefs?.avatarUrl || "",
          labels: user.labels ? user.labels.join(", ") : "",
          registration: user.$createdAt || "", // Thêm dòng này
        }));
        setAvatarPreview(user.prefs?.avatarUrl || null);
      } catch (error) {
        console.error("Error fetching user data:", error);
        toast.error("Không thể tải thông tin người dùng");
      }
    };

    if (isOpen) {
      fetchUserData();
    }
  }, [isOpen]);

  // Add effect to control body scrolling
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    try {
      setIsLoading(true);

      // Lấy thông tin user để kiểm tra avatar hiện tại
      const user = await account.get();
      const currentAvatarUrl = user.prefs?.avatarUrl;

      // Nếu có avatar cũ, lấy fileId từ URL
      if (currentAvatarUrl) {
        try {
          // Tách URL và lấy file ID
          const urlParts = currentAvatarUrl.split("/");
          const fileId = urlParts[urlParts.indexOf("files") + 1];
          if (fileId) {
            await storage.deleteFile(imageforProfile, fileId);
          }
        } catch (error) {
          console.error("Error deleting old avatar:", error);
        }
      }

      // Upload avatar mới
      const uploadResponse = await storage.createFile(
        imageforProfile,
        "unique()",
        file
      );

      const fileUrl = storage.getFileView(imageforProfile, uploadResponse.$id);

      await account.updatePrefs({
        avatarUrl: fileUrl,
      });

      window.dispatchEvent(new Event("userUpdated"));

      toast.success("Cập nhật avatar thành công");
    } catch (error) {
      console.error("Error updating avatar:", error);
      setAvatarPreview(null);
      toast.error("Không thể cập nhật avatar");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const user = await account.get();
      const updateData: any = { userId: user.$id };

      // Xử lý số điện thoại
      const formattedPhone = formData.phone.startsWith("+")
        ? formData.phone
        : `+${formData.phone}`;

      if (formData.name && user.name !== formData.name) {
        updateData.name = formData.name;
      }
      if (formData.email && user.email !== formData.email) {
        updateData.email = formData.email;
      }
      if (formData.phone && user.phone !== formattedPhone) {
        updateData.phone = formattedPhone;
      }
      if (activeTab === "password") {
        try {
          // Validate mật khẩu
          if (!formData.currentPassword) {
            throw new Error("Vui lòng nhập mật khẩu hiện tại");
          }
          if (!formData.newPassword) {
            throw new Error("Vui lòng nhập mật khẩu mới");
          }
          if (formData.newPassword.length < 8) {
            throw new Error("Mật khẩu mới phải có ít nhất 8 ký tự");
          }
          if (formData.newPassword !== formData.confirmPassword) {
            throw new Error("Mật khẩu mới không khớp");
          }

          // Cập nhật mật khẩu
          await account.updatePassword(
            formData.newPassword,
            formData.currentPassword
          );
          toast.success("Cập nhật mật khẩu thành công");
          onClose();
          return;
        } catch (passwordError: any) {
          if (passwordError.code === 401) {
            toast.error("Mật khẩu hiện tại không chính xác");
          } else {
            throw passwordError;
          }
          return;
        }
      }
      // Kiểm tra định dạng số điện thoại
      if (
        updateData.phone &&
        (!updateData.phone.startsWith("+") || updateData.phone.length > 15)
      ) {
        toast.error("Số điện thoại không hợp lệ");
        return;
      }

      const response = await functions.createExecution(
        "6746ea5c6eaf6e2b78ad",
        JSON.stringify(updateData),
        false,
        "/update-user",
        ExecutionMethod.PATCH,
        { "Content-Type": "application/json" }
      );

      if (response && response.responseBody) {
        const parsedBody = JSON.parse(response.responseBody);
        if (parsedBody.status === "success") {
          // Cập nhật state toàn cục
          window.dispatchEvent(new Event("userUpdated"));

          toast.success("Cập nhật thông tin thành công");
          onClose();
        } else {
          throw new Error(parsedBody.message);
        }
      }
    } catch (error: any) {
      console.error("Error updating user:", error);

      // Hiển thị lỗi dễ hiểu cho người dùng
      let errorMessage = "Không thể cập nhật thông tin";
      if (error.message.includes("Phone number")) {
        errorMessage = "Số điện thoại không hợp lệ. Vui lòng kiểm tra lại";
      }
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[9999] transition-all duration-300"
      style={{
        height: "100vh",
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      }}
    >
      <div
        className="fixed inset-0 w-full h-full"
        style={{ height: "100vh", overflowY: "auto" }}
      >
        <div className="absolute top-0 w-full bg-white shadow-lg animate-slideDown">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-all duration-200 active:scale-95"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-pink-600 bg-clip-text text-transparent">
                Thông tin cá nhân
              </h1>
            </div>
            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className="px-6 py-2.5 bg-gradient-to-r from-orange-600 to-pink-600 text-white rounded-lg
                hover:shadow-lg transition-all duration-200 disabled:opacity-50 flex items-center gap-2
                active:scale-95"
            >
              {isLoading && <Loader2 className="animate-spin" size={18} />}
              {isLoading ? "Đang lưu..." : "Lưu thay đổi"}
            </button>
          </div>
        </div>

        <div className="h-[calc(100vh-80px)] mt-[80px] w-full flex items-start justify-center p-6">
          <div className="w-full max-w-[1200px] h-[calc(100vh-120px)] bg-white rounded-2xl shadow-xl flex overflow-hidden">
            {/* Left sidebar */}
            <div className="w-72 border-r border-gray-100 h-full bg-gray-50">
              <div className="p-6 space-y-2">
                {/* Avatar Section */}
                <div className="flex flex-col items-center mb-8 pb-6 border-b border-gray-200">
                  <div className="relative group">
                    <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-lg">
                      {avatarPreview ? (
                        <img
                          src={avatarPreview}
                          alt="Profile"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-orange-600 to-pink-600 flex items-center justify-center text-white text-2xl">
                          {formData.name.charAt(0).toLowerCase()}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={handleAvatarClick}
                      className="absolute bottom-0 right-0 p-2 bg-orange-500 rounded-full text-white
                        shadow-lg hover:bg-orange-600 transition-all duration-200 group-hover:scale-110"
                    >
                      <Camera size={16} />
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="hidden"
                    />
                  </div>
                  <h3 className="mt-4 font-semibold text-gray-900">
                    {formData.name}
                  </h3>
                  <p className="text-sm text-gray-500">{formData.email}</p>
                  <p className="text-xs text-gray-500">
                    Ngày tham gia:{" "}
                    {formData.registration && formatDate(formData.registration)}
                  </p>
                </div>

                {/* Navigation Menu */}
                <button
                  onClick={() => setActiveTab("profile")}
                  className={`w-full flex items-center space-x-3 p-3 rounded-xl ${
                    activeTab === "profile"
                      ? "bg-gradient-to-r from-orange-50 to-pink-50 text-orange-600"
                      : "text-gray-600 hover:bg-gray-100"
                  } transition-colors`}
                >
                  <User className="w-5 h-5" />
                  <span className="font-medium">Thông tin cá nhân</span>
                </button>

                <button
                  onClick={() => setActiveTab("password")}
                  className={`w-full flex items-center space-x-3 p-3 rounded-xl ${
                    activeTab === "password"
                      ? "bg-gradient-to-r from-orange-50 to-pink-50 text-orange-600"
                      : "text-gray-600 hover:bg-gray-100"
                  } transition-colors`}
                >
                  <Lock className="w-5 h-5" />
                  <span>Mật Khẩu</span>
                </button>
              </div>
            </div>

            {/* Main content */}
            <div className="flex-1 overflow-y-auto px-8 py-6">
              {activeTab === "profile" ? (
                <form onSubmit={handleSubmit}>
                  <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Họ và tên <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500
                        focus:border-transparent transition-all duration-200"
                        placeholder="Nhập họ và tên"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Chức vụ
                      </label>
                      <input
                        type="text"
                        value={formData.labels
                          .split(", ")
                          .map((label) => roleMapping[label] || label)
                          .join(", ")}
                        disabled
                        className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 cursor-not-allowed"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Email
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                        className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Số điện thoại <span className="text-red-500">*</span>
                      </label>
                      <PhoneInput
                        country={"vn"}
                        value={formData.phone}
                        onChange={(phone) =>
                          setFormData({ ...formData, phone: phone })
                        }
                        inputStyle={{
                          width: "100%",
                          height: "42px",
                        }}
                        containerStyle={{
                          width: "100%",
                        }}
                      />
                    </div>
                  </div>
                </form>
              ) : (
                <div className="max-w-md space-y-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Mật khẩu hiện tại
                    </label>
                    <div className="relative">
                      <input
                        type={
                          showPasswords.currentPassword ? "text" : "password"
                        }
                        value={formData.currentPassword}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            currentPassword: e.target.value,
                          })
                        }
                        className="w-full p-3 pr-10 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500"
                        placeholder="Nhập mật khẩu hiện tại"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowPasswords({
                            ...showPasswords,
                            currentPassword: !showPasswords.currentPassword,
                          })
                        }
                        className="absolute right-3 top-1/2 transform -translate-y-1/2"
                      >
                        {showPasswords.currentPassword ? (
                          <EyeOff className="h-5 w-5 text-gray-400" />
                        ) : (
                          <Eye className="h-5 w-5 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Mật khẩu mới
                    </label>
                    <div className="relative">
                      <input
                        type={showPasswords.newPassword ? "text" : "password"}
                        value={formData.newPassword}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            newPassword: e.target.value,
                          })
                        }
                        className="w-full p-3 pr-10 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500"
                        placeholder="Nhập mật khẩu mới"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowPasswords({
                            ...showPasswords,
                            newPassword: !showPasswords.newPassword,
                          })
                        }
                        className="absolute right-3 top-1/2 transform -translate-y-1/2"
                      >
                        {showPasswords.newPassword ? (
                          <EyeOff className="h-5 w-5 text-gray-400" />
                        ) : (
                          <Eye className="h-5 w-5 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Xác nhận mật khẩu mới
                    </label>
                    <div className="relative">
                      <input
                        type={
                          showPasswords.confirmPassword ? "text" : "password"
                        }
                        value={formData.confirmPassword}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            confirmPassword: e.target.value,
                          })
                        }
                        className="w-full p-3 pr-10 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500"
                        placeholder="Nhập lại mật khẩu mới"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowPasswords({
                            ...showPasswords,
                            confirmPassword: !showPasswords.confirmPassword,
                          })
                        }
                        className="absolute right-3 top-1/2 transform -translate-y-1/2"
                      >
                        {showPasswords.confirmPassword ? (
                          <EyeOff className="h-5 w-5 text-gray-400" />
                        ) : (
                          <Eye className="h-5 w-5 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfileModal;
