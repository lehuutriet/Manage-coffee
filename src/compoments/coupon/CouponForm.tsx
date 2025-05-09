import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../contexts/auth/authProvider";
import { useDataCache } from "../../contexts/auth/DataCacheProvider";
import {
  Save,
  ArrowLeft,
  Tag,
  Percent,
  DollarSign,
  Calendar,
  Clock,
  Info,
  Users,
  Loader2,
} from "lucide-react";
import toast from "react-hot-toast";

interface Coupon {
  $id?: string;
  code: string;
  type: string;
  value: number;
  minOrderValue: number;
  maxDiscount: number;
  startDate: string;
  endDate: string;
  usageLimit: number;
  usageCount: number;
  isActive: boolean;
  description: string;
  userId?: string;
}

interface CouponFormProps {
  isEditing?: boolean;
}

const CouponForm = ({ isEditing = false }: CouponFormProps) => {
  const { id } = useParams<{ id: string }>();
  const { createItem, updateItem, getSingleItem, COLLECTION_IDS } = useAuth();
  const { getCachedData, setCachedData, invalidateCache } = useDataCache();
  const navigate = useNavigate();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(isEditing);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState<Coupon>({
    code: "",
    type: "percent",
    value: 0,
    minOrderValue: 0,
    maxDiscount: 0,
    startDate: new Date().toISOString().slice(0, 16),
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 16),
    usageLimit: 100,
    usageCount: 0,
    isActive: true,
    description: "",
  });

  // Tải dữ liệu mã giảm giá nếu đang chỉnh sửa
  useEffect(() => {
    const fetchCouponData = async () => {
      if (!isEditing || !id) {
        setLoading(false);
        return;
      }

      try {
        const cachedCoupon = getCachedData(`coupon_${id}`);

        if (cachedCoupon) {
          setFormData({
            ...cachedCoupon,
            startDate: formatDateForInput(cachedCoupon.startDate),
            endDate: formatDateForInput(cachedCoupon.endDate),
          });
          setLoading(false);
          return;
        }

        const coupon = await getSingleItem(COLLECTION_IDS.coupons, id);
        if (coupon) {
          setFormData({
            ...coupon,
            startDate: formatDateForInput(coupon.startDate),
            endDate: formatDateForInput(coupon.endDate),
          });
          setCachedData(`coupon_${id}`, coupon, 15 * 60 * 1000);
        }
      } catch (error) {
        console.error("Lỗi khi tải dữ liệu mã giảm giá:", error);
        toast.error("Không thể tải thông tin mã giảm giá");
      } finally {
        setLoading(false);
      }
    };

    fetchCouponData();
  }, [id, isEditing, getSingleItem, getCachedData, setCachedData]);

  // Chuyển đổi định dạng ngày tháng cho input
  const formatDateForInput = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      // Kiểm tra xem date có phải là ngày hợp lệ không
      if (isNaN(date.getTime())) {
        return new Date().toISOString().slice(0, 16);
      }
      return date.toISOString().slice(0, 16);
    } catch (error) {
      console.error("Lỗi định dạng ngày tháng:", error);
      return new Date().toISOString().slice(0, 16);
    }
  };

  // Chuyển đổi từ định dạng input sang định dạng lưu trữ
  const formatDateForStorage = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      // Kiểm tra xem date có phải là ngày hợp lệ không
      if (isNaN(date.getTime())) {
        return new Date().toISOString();
      }
      return date.toISOString();
    } catch (error) {
      console.error("Lỗi định dạng ngày tháng cho lưu trữ:", error);
      return new Date().toISOString();
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.code.trim()) {
      newErrors.code = "Vui lòng nhập mã giảm giá";
    }

    if (!formData.value || formData.value <= 0) {
      newErrors.value = "Giá trị giảm giá phải lớn hơn 0";
    }

    if (formData.type === "percent" && formData.value > 100) {
      newErrors.value = "Giá trị phần trăm không thể vượt quá 100%";
    }

    if (!formData.startDate) {
      newErrors.startDate = "Vui lòng chọn ngày bắt đầu";
    }

    if (!formData.endDate) {
      newErrors.endDate = "Vui lòng chọn ngày kết thúc";
    }

    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        newErrors.endDate = "Ngày không hợp lệ";
      } else if (end < start) {
        newErrors.endDate = "Ngày kết thúc phải sau ngày bắt đầu";
      }
    }

    if (!formData.type) {
      newErrors.type = "Vui lòng chọn loại giảm giá";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]:
        name === "isActive"
          ? (e.target as HTMLInputElement).checked
          : name === "value" ||
            name === "minOrderValue" ||
            name === "maxDiscount" ||
            name === "usageLimit"
          ? parseInt(value)
          : value,
    });

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
      // Đảm bảo các trường string không bị null
      const code = formData.code || ""; // Đảm bảo không null
      const description = formData.description || ""; // Đảm bảo không null

      // Chuẩn bị dữ liệu gửi đi với định dạng ngày tháng đúng
      const preparedData = {
        code: code.trim().toUpperCase(),
        type: formData.type,
        value: formData.value || 0, // Đảm bảo không null
        minOrderValue: formData.minOrderValue || 0, // Đảm bảo không null
        maxDiscount: formData.maxDiscount || 0, // Đảm bảo không null
        startDate: formatDateForStorage(formData.startDate),
        endDate: formatDateForStorage(formData.endDate),
        usageLimit: formData.usageLimit || 0, // Đảm bảo không null
        usageCount: formData.usageCount || 0, // Đảm bảo không null
        isActive: Boolean(formData.isActive), // Chuyển đổi sang boolean
        description: description.trim(),
      };

      if (isEditing && id) {
        // Thực hiện cập nhật
        await updateItem(COLLECTION_IDS.coupons, id, preparedData);
        toast.success("Cập nhật mã giảm giá thành công");

        // Cập nhật cache
        invalidateCache(`coupon_${id}`);
        invalidateCache("couponsList");

        navigate(`/coupons/${id}`);
      } else {
        // Tạo mới
        const newCoupon = await createItem(
          COLLECTION_IDS.coupons,
          preparedData
        );
        toast.success("Thêm mã giảm giá mới thành công");

        // Cập nhật cache
        invalidateCache("couponsList");

        navigate(`/coupons/${newCoupon.$id}`);
      }
    } catch (error) {
      console.error("Lỗi khi lưu mã giảm giá:", error);
      toast.error("Không thể lưu mã giảm giá");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (isEditing && id) {
      navigate(`/coupons/${id}`);
    } else {
      navigate("/coupons");
    }
  };

  // Các option cho loại giảm giá
  const couponTypeOptions = [
    { value: "percent", label: "Phần trăm (%)" },
    { value: "fixed", label: "Số tiền cố định" },
    { value: "shipping", label: "Miễn phí vận chuyển" },
    { value: "bogo", label: "Mua 1 tặng 1" },
  ];

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
            {isEditing ? "Chỉnh sửa mã giảm giá" : "Thêm mã giảm giá mới"}
          </h1>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 gap-6">
              {/* Thông tin cơ bản */}
              <div className="mb-4">
                <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <Info className="h-5 w-5 mr-2 text-blue-600" />
                  Thông tin cơ bản
                </h2>
                <div className="border-b border-gray-200 pb-2 mb-4"></div>
              </div>

              {/* Mã giảm giá */}
              <div className="space-y-1">
                <label
                  htmlFor="code"
                  className="block text-sm font-medium text-gray-700"
                >
                  Mã giảm giá <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="code"
                  name="code"
                  value={formData.code}
                  onChange={handleInputChange}
                  className={`mt-1 block w-full border ${
                    errors.code ? "border-red-300" : "border-gray-300"
                  } rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                  placeholder="Nhập mã giảm giá (VD: SUMMER2025)"
                />
                {errors.code && (
                  <p className="text-red-500 text-xs mt-1">{errors.code}</p>
                )}
              </div>

              {/* Loại giảm giá */}
              <div className="space-y-1">
                <label
                  htmlFor="type"
                  className="block text-sm font-medium text-gray-700"
                >
                  Loại giảm giá <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center">
                  <Tag className="h-5 w-5 text-gray-400 mr-2" />
                  <select
                    id="type"
                    name="type"
                    value={formData.type}
                    onChange={handleInputChange}
                    className={`mt-1 block w-full border ${
                      errors.type ? "border-red-300" : "border-gray-300"
                    } rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                  >
                    {couponTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                {errors.type && (
                  <p className="text-red-500 text-xs mt-1">{errors.type}</p>
                )}
              </div>

              {/* Giá trị giảm giá */}
              <div className="space-y-1">
                <label
                  htmlFor="value"
                  className="block text-sm font-medium text-gray-700"
                >
                  Giá trị giảm giá <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center">
                  {formData.type === "percent" ? (
                    <Percent className="h-5 w-5 text-gray-400 mr-2" />
                  ) : (
                    <DollarSign className="h-5 w-5 text-gray-400 mr-2" />
                  )}
                  <input
                    type="number"
                    id="value"
                    name="value"
                    value={formData.value}
                    onChange={handleInputChange}
                    min="0"
                    max={formData.type === "percent" ? "100" : undefined}
                    className={`mt-1 block w-full border ${
                      errors.value ? "border-red-300" : "border-gray-300"
                    } rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                    placeholder={
                      formData.type === "percent"
                        ? "Nhập % giảm giá (VD: 10)"
                        : "Nhập số tiền giảm giá"
                    }
                  />
                </div>
                {errors.value && (
                  <p className="text-red-500 text-xs mt-1">{errors.value}</p>
                )}
              </div>

              {/* Giá trị đơn hàng tối thiểu */}
              <div className="space-y-1">
                <label
                  htmlFor="minOrderValue"
                  className="block text-sm font-medium text-gray-700"
                >
                  Giá trị đơn hàng tối thiểu
                </label>
                <div className="flex items-center">
                  <DollarSign className="h-5 w-5 text-gray-400 mr-2" />
                  <input
                    type="number"
                    id="minOrderValue"
                    name="minOrderValue"
                    value={formData.minOrderValue}
                    onChange={handleInputChange}
                    min="0"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0 = Không có yêu cầu tối thiểu"
                  />
                </div>
              </div>

              {/* Số tiền giảm tối đa (đối với mã giảm theo %) */}
              {formData.type === "percent" && (
                <div className="space-y-1">
                  <label
                    htmlFor="maxDiscount"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Số tiền giảm tối đa
                  </label>
                  <div className="flex items-center">
                    <DollarSign className="h-5 w-5 text-gray-400 mr-2" />
                    <input
                      type="number"
                      id="maxDiscount"
                      name="maxDiscount"
                      value={formData.maxDiscount}
                      onChange={handleInputChange}
                      min="0"
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0 = Không giới hạn"
                    />
                  </div>
                </div>
              )}

              {/* Thời gian và giới hạn sử dụng */}
              <div className="mb-4 mt-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <Calendar className="h-5 w-5 mr-2 text-blue-600" />
                  Thời gian và giới hạn sử dụng
                </h2>
                <div className="border-b border-gray-200 pb-2 mb-4"></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Thời gian bắt đầu */}
                <div className="space-y-1">
                  <label
                    htmlFor="startDate"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Thời gian bắt đầu <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center">
                    <Clock className="h-5 w-5 text-gray-400 mr-2" />
                    <input
                      type="datetime-local"
                      id="startDate"
                      name="startDate"
                      value={formData.startDate}
                      onChange={handleInputChange}
                      className={`mt-1 block w-full border ${
                        errors.startDate ? "border-red-300" : "border-gray-300"
                      } rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                    />
                  </div>
                  {errors.startDate && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.startDate}
                    </p>
                  )}
                </div>

                {/* Thời gian kết thúc */}
                <div className="space-y-1">
                  <label
                    htmlFor="endDate"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Thời gian kết thúc <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center">
                    <Clock className="h-5 w-5 text-gray-400 mr-2" />
                    <input
                      type="datetime-local"
                      id="endDate"
                      name="endDate"
                      value={formData.endDate}
                      onChange={handleInputChange}
                      className={`mt-1 block w-full border ${
                        errors.endDate ? "border-red-300" : "border-gray-300"
                      } rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                    />
                  </div>
                  {errors.endDate && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.endDate}
                    </p>
                  )}
                </div>

                {/* Giới hạn sử dụng */}
                <div className="space-y-1">
                  <label
                    htmlFor="usageLimit"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Số lần sử dụng tối đa
                  </label>
                  <div className="flex items-center">
                    <Users className="h-5 w-5 text-gray-400 mr-2" />
                    <input
                      type="number"
                      id="usageLimit"
                      name="usageLimit"
                      value={formData.usageLimit}
                      onChange={handleInputChange}
                      min="0"
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0 = Không giới hạn"
                    />
                  </div>
                </div>

                {/* Trạng thái kích hoạt */}
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Trạng thái
                  </label>
                  <div className="mt-2">
                    <label className="inline-flex items-center">
                      <input
                        type="checkbox"
                        name="isActive"
                        checked={formData.isActive}
                        onChange={handleInputChange}
                        className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50 h-5 w-5"
                      />
                      <span className="ml-2 text-gray-700">
                        Kích hoạt mã giảm giá
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Mô tả */}
              <div className="space-y-1">
                <label
                  htmlFor="description"
                  className="block text-sm font-medium text-gray-700"
                >
                  Mô tả mã giảm giá
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={4}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Nhập mô tả cho mã giảm giá..."
                />
              </div>

              {/* Thông báo giúp người dùng */}
              <div className="mt-6 bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <Info className="h-5 w-5 text-blue-400" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">
                      Lưu ý về mã giảm giá
                    </h3>
                    <div className="mt-2 text-sm text-blue-700">
                      <ul className="list-disc space-y-1 pl-5">
                        <li>
                          <strong>Mã giảm giá</strong> sẽ tự động được chuyển
                          thành chữ hoa
                        </li>
                        <li>
                          <strong>Giá trị giảm giá theo phần trăm</strong> sẽ
                          được áp dụng theo % trên tổng giá trị đơn hàng
                        </li>
                        <li>
                          <strong>Giá trị giảm giá cố định</strong> là số tiền
                          cụ thể được trừ trực tiếp vào đơn hàng
                        </li>
                        <li>
                          <strong>Số lần sử dụng</strong>: Nếu đặt giá trị là 0,
                          mã giảm giá có thể được sử dụng không giới hạn
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit buttons */}
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Đang lưu...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      {isEditing ? "Cập nhật" : "Lưu"}
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

export default CouponForm;
