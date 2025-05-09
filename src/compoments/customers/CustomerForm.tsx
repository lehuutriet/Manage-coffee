import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../contexts/auth/authProvider";
import { useDataCache } from "../../contexts/auth/DataCacheProvider";
import {
  Save,
  ArrowLeft,
  User,
  Mail,
  Calendar,
  DollarSign,
  Award,
  Clipboard,
  AlertCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
interface CustomerFormProps {
  isEditing?: boolean;
}

const CustomerForm = ({ isEditing = false }: CustomerFormProps) => {
  const { id } = useParams<{ id: string }>();
  const { createItem, updateItem, getSingleItem, COLLECTION_IDS } = useAuth();
  const { getCachedData, setCachedData, invalidateCache } = useDataCache();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    notes: "",
    points: 0,
    totalSpent: 0,
    joinDate: new Date().toISOString().split("T")[0],
    lastVisit: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(isEditing);

  useEffect(() => {
    const fetchCustomerData = async () => {
      if (!isEditing || !id) {
        setLoading(false);
        return;
      }

      try {
        // Kiểm tra cache trước
        const cachedCustomer = getCachedData(`customer_${id}`);

        if (cachedCustomer) {
          console.log("Sử dụng dữ liệu customer từ cache");
          // Loại bỏ các thuộc tính hệ thống
          const {
            $id,
            $databaseId,
            $collectionId,
            $createdAt,
            $updatedAt,
            $permissions,
            ...cleanData
          } = cachedCustomer;
          setFormData({
            ...cleanData,
            joinDate: cleanData.joinDate
              ? new Date(cleanData.joinDate).toISOString().split("T")[0]
              : "",
            lastVisit: cleanData.lastVisit
              ? new Date(cleanData.lastVisit).toISOString().split("T")[0]
              : "",
          });
          setLoading(false);
          return;
        }

        // Nếu không có cache, tải từ server
        const customer = await getSingleItem(COLLECTION_IDS.customers, id);
        if (customer) {
          // Loại bỏ các thuộc tính hệ thống
          const {
            $id,
            $databaseId,
            $collectionId,
            $createdAt,
            $updatedAt,
            $permissions,
            ...cleanData
          } = customer;
          setFormData({
            ...cleanData,
            joinDate: cleanData.joinDate
              ? new Date(cleanData.joinDate).toISOString().split("T")[0]
              : "",
            lastVisit: cleanData.lastVisit
              ? new Date(cleanData.lastVisit).toISOString().split("T")[0]
              : "",
          });
          // Cập nhật cache
          setCachedData(`customer_${id}`, customer, 15 * 60 * 1000);
        }
      } catch (error) {
        console.error("Lỗi khi tải dữ liệu khách hàng:", error);
        toast.error("Không thể tải thông tin khách hàng");
      } finally {
        setLoading(false);
      }
    };

    fetchCustomerData();
  }, [id, isEditing, getSingleItem]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Vui lòng nhập tên khách hàng";
    }

    if (formData.phone && !/^\+?[0-9]{10,14}$/.test(formData.phone)) {
      newErrors.phone = "Số điện thoại không hợp lệ";
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Email không hợp lệ";
    }

    if (formData.points && isNaN(Number(formData.points))) {
      newErrors.points = "Điểm tích lũy phải là số";
    }

    if (formData.totalSpent && isNaN(Number(formData.totalSpent))) {
      newErrors.totalSpent = "Tổng chi tiêu phải là số";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });

    // Xóa lỗi khi người dùng sửa
    if (errors[name]) {
      setErrors({ ...errors, [name]: "" });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const isValid = validateForm();
    if (!isValid) {
      toast.error("Vui lòng kiểm tra lại thông tin nhập");
      return;
    }

    setIsSubmitting(true);

    try {
      const customerData = {
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        notes: formData.notes,
        points: Number(formData.points),
        totalSpent: Number(formData.totalSpent),
        joinDate: formData.joinDate
          ? new Date(formData.joinDate).toISOString()
          : new Date().toISOString(),
        lastVisit: formData.lastVisit
          ? new Date(formData.lastVisit).toISOString()
          : "",
      };

      if (isEditing && id) {
        await updateItem(COLLECTION_IDS.customers, id, customerData);
        toast.success("Cập nhật khách hàng thành công");

        // Cập nhật cache
        invalidateCache(`customer_${id}`);
        invalidateCache("customersList");

        navigate(`/customers/${id}`);
      } else {
        const newCustomer = await createItem(
          COLLECTION_IDS.customers,
          customerData
        );
        toast.success("Thêm khách hàng mới thành công");

        // Cập nhật cache
        invalidateCache("customersList");

        navigate(`/customers/${newCustomer.$id}`);
      }
    } catch (error) {
      console.error("Lỗi khi lưu khách hàng:", error);
      toast.error("Không thể lưu thông tin khách hàng");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (isEditing && id) {
      navigate(`/customers/${id}`);
    } else {
      navigate("/customers");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={handleCancel}
            className="flex items-center text-blue-600 hover:text-blue-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            <span>Quay lại</span>
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEditing
              ? "Chỉnh sửa thông tin khách hàng"
              : "Thêm khách hàng mới"}
          </h1>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Thông tin chung */}
              <div className="md:col-span-2 mb-4">
                <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <User className="h-5 w-5 mr-2 text-blue-600" />
                  Thông tin cơ bản
                </h2>
                <div className="border-b border-gray-200 pb-2 mb-4"></div>
              </div>

              {/* Tên khách hàng */}
              <div className="space-y-1">
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-gray-700"
                >
                  Tên khách hàng <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className={`mt-1 block w-full border ${
                    errors.name ? "border-red-300" : "border-gray-300"
                  } rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                  placeholder="Nhập tên khách hàng"
                />
                {errors.name && (
                  <p className="text-red-500 text-xs mt-1">{errors.name}</p>
                )}
              </div>

              {/* Số điện thoại */}
              <div className="space-y-1">
                <label
                  htmlFor="phone"
                  className="block text-sm font-medium text-gray-700"
                >
                  Số điện thoại
                </label>
                <PhoneInput
                  country={"vn"}
                  value={formData.phone}
                  onChange={(phone) => {
                    setFormData({ ...formData, phone });
                    if (errors.phone) {
                      setErrors({ ...errors, phone: "" });
                    }
                  }}
                  inputStyle={{
                    width: "100%",
                    height: "38px",
                    border: errors.phone
                      ? "1px solid #fca5a5"
                      : "1px solid #d1d5db",
                    borderRadius: "6px",
                    marginTop: "4px",
                  }}
                  containerStyle={{
                    width: "100%",
                  }}
                  placeholder="Nhập số điện thoại"
                />
                {errors.phone && (
                  <p className="text-red-500 text-xs mt-1">{errors.phone}</p>
                )}
              </div>
              {/* Email */}
              <div className="space-y-1">
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700"
                >
                  Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={`mt-1 block w-full border ${
                      errors.email ? "border-red-300" : "border-gray-300"
                    } rounded-md shadow-sm py-2 pl-10 pr-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                    placeholder="Nhập email"
                  />
                </div>
                {errors.email && (
                  <p className="text-red-500 text-xs mt-1">{errors.email}</p>
                )}
              </div>

              {/* Ngày tham gia */}
              <div className="space-y-1">
                <label
                  htmlFor="joinDate"
                  className="block text-sm font-medium text-gray-700"
                >
                  Ngày tham gia
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Calendar className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="date"
                    id="joinDate"
                    name="joinDate"
                    value={formData.joinDate}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 pl-10 pr-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Thông tin điểm và chi tiêu */}
              <div className="md:col-span-2 mt-6 mb-4">
                <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <DollarSign className="h-5 w-5 mr-2 text-green-600" />
                  Thông tin tích lũy
                </h2>
                <div className="border-b border-gray-200 pb-2 mb-4"></div>
              </div>

              {/* Điểm tích lũy */}
              <div className="space-y-1">
                <label
                  htmlFor="points"
                  className="block text-sm font-medium text-gray-700"
                >
                  Điểm tích lũy
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Award className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="number"
                    id="points"
                    name="points"
                    value={formData.points}
                    onChange={handleInputChange}
                    className={`mt-1 block w-full border ${
                      errors.points ? "border-red-300" : "border-gray-300"
                    } rounded-md shadow-sm py-2 pl-10 pr-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                    placeholder="0"
                    min="0"
                  />
                </div>
                {errors.points && (
                  <p className="text-red-500 text-xs mt-1">{errors.points}</p>
                )}
              </div>

              {/* Tổng chi tiêu */}
              <div className="space-y-1">
                <label
                  htmlFor="totalSpent"
                  className="block text-sm font-medium text-gray-700"
                >
                  Tổng chi tiêu (VNĐ)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <DollarSign className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="number"
                    id="totalSpent"
                    name="totalSpent"
                    value={formData.totalSpent}
                    onChange={handleInputChange}
                    className={`mt-1 block w-full border ${
                      errors.totalSpent ? "border-red-300" : "border-gray-300"
                    } rounded-md shadow-sm py-2 pl-10 pr-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                    placeholder="0"
                    min="0"
                  />
                </div>
                {errors.totalSpent && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.totalSpent}
                  </p>
                )}
              </div>

              {/* Lần cuối ghé thăm */}
              <div className="space-y-1">
                <label
                  htmlFor="lastVisit"
                  className="block text-sm font-medium text-gray-700"
                >
                  Lần cuối ghé thăm
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Calendar className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="date"
                    id="lastVisit"
                    name="lastVisit"
                    value={formData.lastVisit}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 pl-10 pr-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Ghi chú*/}
              <div className="md:col-span-2 mt-6 mb-4">
                <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <Clipboard className="h-5 w-5 mr-2 text-gray-600" />
                  Ghi chú bổ sung
                </h2>
                <div className="border-b border-gray-200 pb-2 mb-4"></div>
              </div>

              {/* Ghi chú */}
              <div className="md:col-span-2 space-y-1">
                <label
                  htmlFor="notes"
                  className="block text-sm font-medium text-gray-700"
                >
                  Ghi chú
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  rows={4}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Nhập ghi chú về khách hàng..."
                />
              </div>

              {/* Lưu ý */}
              {Object.keys(errors).length > 0 && (
                <div className="md:col-span-2 mt-4 p-4 bg-red-50 rounded-md flex items-start">
                  <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
                  <div>
                    <h3 className="text-sm font-medium text-red-800">
                      Vui lòng sửa các lỗi sau
                    </h3>
                    <ul className="mt-2 text-sm text-red-700 list-disc list-inside">
                      {Object.values(errors).map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Nút submit */}
              <div className="md:col-span-2 flex justify-end mt-6 space-x-3">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
                      Đang lưu...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      {isEditing ? "Cập nhật" : "Thêm mới"}
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CustomerForm;
