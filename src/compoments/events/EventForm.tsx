import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../contexts/auth/authProvider";
import { useDataCache } from "../../contexts/auth/DataCacheProvider";
import {
  Save,
  ArrowLeft,
  Calendar,
  Clock,
  Info,
  Tag,
  AlertCircle,
  Loader2,
} from "lucide-react";
import toast from "react-hot-toast";

interface Event {
  $id?: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  type: string;
  status: string;
  userId?: string;
}

interface EventFormProps {
  isEditing?: boolean;
}

const EventForm = ({ isEditing = false }: EventFormProps) => {
  const { id } = useParams<{ id: string }>();
  const { createItem, updateItem, getSingleItem, COLLECTION_IDS } = useAuth();
  const { getCachedData, setCachedData, invalidateCache } = useDataCache();
  const navigate = useNavigate();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(isEditing);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState<Event>({
    title: "",
    description: "",
    startDate: new Date().toISOString().slice(0, 16),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 16),
    type: "promotion",
    status: "upcoming",
  });

  // Tải dữ liệu sự kiện nếu đang chỉnh sửa
  useEffect(() => {
    const fetchEventData = async () => {
      if (!isEditing || !id) {
        setLoading(false);
        return;
      }

      try {
        const cachedEvent = getCachedData(`event_${id}`);

        if (cachedEvent) {
          console.log("Sử dụng dữ liệu sự kiện từ cache");
          // Đảm bảo định dạng ngày tháng đúng cho input datetime-local
          setFormData({
            ...cachedEvent,
            startDate: formatDateForInput(cachedEvent.startDate),
            endDate: formatDateForInput(cachedEvent.endDate),
          });
          setLoading(false);
          return;
        }

        const event = await getSingleItem(COLLECTION_IDS.events, id);
        if (event) {
          setFormData({
            ...event,
            startDate: formatDateForInput(event.startDate),
            endDate: formatDateForInput(event.endDate),
          });
          setCachedData(`event_${id}`, event, 15 * 60 * 1000);
        }
      } catch (error) {
        console.error("Lỗi khi tải dữ liệu sự kiện:", error);
        toast.error("Không thể tải thông tin sự kiện");
      } finally {
        setLoading(false);
      }
    };

    fetchEventData();
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

    if (!formData.title.trim()) {
      newErrors.title = "Vui lòng nhập tên sự kiện";
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
      newErrors.type = "Vui lòng chọn loại sự kiện";
    }

    if (!formData.status) {
      newErrors.status = "Vui lòng chọn trạng thái";
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
    setFormData({ ...formData, [name]: value });

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
      // Chuẩn bị dữ liệu gửi đi với định dạng ngày tháng đúng
      const eventData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        startDate: formatDateForStorage(formData.startDate),
        endDate: formatDateForStorage(formData.endDate),
        type: formData.type,
        status: formData.status,
      };

      console.log("Dữ liệu sự kiện chuẩn bị lưu:", eventData);

      if (isEditing && id) {
        await updateItem(COLLECTION_IDS.events, id, eventData);
        toast.success("Cập nhật sự kiện thành công");

        invalidateCache(`event_${id}`);
        invalidateCache("eventsList");

        navigate(`/events/${id}`);
      } else {
        const newEvent = await createItem(COLLECTION_IDS.events, eventData);
        toast.success("Thêm sự kiện mới thành công");

        invalidateCache("eventsList");

        navigate(`/events/${newEvent.$id}`);
      }
    } catch (error) {
      console.error("Lỗi khi lưu sự kiện:", error);
      toast.error("Không thể lưu sự kiện");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (isEditing && id) {
      navigate(`/events/${id}`);
    } else {
      navigate("/events");
    }
  };

  // Các option cho loại sự kiện
  const eventTypeOptions = [
    { value: "promotion", label: "Khuyến mãi" },
    { value: "order", label: "Đơn hàng" },
    { value: "reminder", label: "Nhắc nhở" },
    { value: "other", label: "Khác" },
  ];

  // Các option cho trạng thái
  const eventStatusOptions = [
    { value: "active", label: "Đang diễn ra" },
    { value: "completed", label: "Đã kết thúc" },
    { value: "cancelled", label: "Đã hủy" },
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
            {isEditing ? "Chỉnh sửa sự kiện" : "Thêm sự kiện mới"}
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

              {/* Tên sự kiện */}
              <div className="space-y-1">
                <label
                  htmlFor="title"
                  className="block text-sm font-medium text-gray-700"
                >
                  Tên sự kiện <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  className={`mt-1 block w-full border ${
                    errors.title ? "border-red-300" : "border-gray-300"
                  } rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                  placeholder="Nhập tên sự kiện"
                />
                {errors.title && (
                  <p className="text-red-500 text-xs mt-1">{errors.title}</p>
                )}
              </div>

              {/* Mô tả */}
              <div className="space-y-1">
                <label
                  htmlFor="description"
                  className="block text-sm font-medium text-gray-700"
                >
                  Mô tả sự kiện
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={4}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Nhập mô tả cho sự kiện..."
                />
              </div>

              {/* Thời gian và loại sự kiện */}
              <div className="mb-4 mt-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <Calendar className="h-5 w-5 mr-2 text-blue-600" />
                  Thời gian và phân loại
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

                {/* Loại sự kiện */}
                <div className="space-y-1">
                  <label
                    htmlFor="type"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Loại sự kiện <span className="text-red-500">*</span>
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
                      {eventTypeOptions.map((option) => (
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

                {/* Trạng thái */}
                <div className="space-y-1">
                  <label
                    htmlFor="status"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Trạng thái <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center">
                    <AlertCircle className="h-5 w-5 text-gray-400 mr-2" />
                    <select
                      id="status"
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                      className={`mt-1 block w-full border ${
                        errors.status ? "border-red-300" : "border-gray-300"
                      } rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                    >
                      {eventStatusOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  {errors.status && (
                    <p className="text-red-500 text-xs mt-1">{errors.status}</p>
                  )}
                </div>
              </div>

              {/* Thông báo giúp người dùng */}
              <div className="mt-6 bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <Info className="h-5 w-5 text-blue-400" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">
                      Lưu ý về trạng thái sự kiện
                    </h3>
                    <div className="mt-2 text-sm text-blue-700">
                      <ul className="list-disc space-y-1 pl-5">
                        <li>
                          <strong>Sắp diễn ra:</strong> Sự kiện chưa bắt đầu
                        </li>
                        <li>
                          <strong>Đang diễn ra:</strong> Sự kiện đang diễn ra
                        </li>
                        <li>
                          <strong>Đã kết thúc:</strong> Sự kiện đã qua thời gian
                          kết thúc
                        </li>
                        <li>
                          <strong>Đã hủy:</strong> Sự kiện đã bị hủy bỏ
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

export default EventForm;
