import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/auth/authProvider";
import { useDataCache } from "../../contexts/auth/DataCacheProvider";
import {
  Home,
  Calendar,
  Clock,
  Edit,
  AlertCircle,
  ArrowLeft,
  Tag,
  FileText,
  Globe,
} from "lucide-react";
import toast from "react-hot-toast";

interface Event {
  $id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  type: string;
  status: string;
  userId?: string;
}

const EventDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { getSingleItem, COLLECTION_IDS } = useAuth();
  const { getCachedData, setCachedData } = useDataCache();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchEventDetail = async () => {
      if (!id) return;

      setLoading(true);
      try {
        // Kiểm tra cache trước
        const cachedEvent = getCachedData(`event_${id}`);

        if (cachedEvent) {
          console.log("Sử dụng dữ liệu sự kiện từ cache");
          setEvent(cachedEvent);
          setLoading(false);
        }

        // Luôn tải dữ liệu mới từ server
        const data = await getSingleItem(COLLECTION_IDS.events, id);
        console.log("Chi tiết sự kiện từ server:", data);

        // Nếu có dữ liệu mới từ server và khác với cache, cập nhật state và cache
        if (
          data &&
          (!cachedEvent || JSON.stringify(data) !== JSON.stringify(cachedEvent))
        ) {
          setEvent(data);
          setCachedData(`event_${id}`, data, 15 * 60 * 1000); // Cache 15 phút
        }

        setLoading(false);
      } catch (error) {
        console.error("Lỗi khi tải chi tiết sự kiện:", error);
        toast.error("Không thể tải thông tin sự kiện");
        setLoading(false);
      }
    };

    fetchEventDetail();
  }, [id, getSingleItem, getCachedData, setCachedData]);

  const handleBackToList = () => {
    navigate("/events");
  };

  const handleEditEvent = () => {
    navigate(`/events/edit/${id}`);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Kiểm tra sự kiện đang diễn ra hay đã kết thúc
  const getEventStatus = (
    startDate: string,
    endDate: string,
    status: string
  ) => {
    if (status === "cancelled") return "cancelled";

    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (now < start) return "upcoming";
    if (now >= start && now <= end) return "active";
    return "completed";
  };

  // Lấy màu cho trạng thái
  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 border-green-200";
      case "upcoming":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "completed":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "cancelled":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  // Lấy tên trạng thái hiển thị
  const getStatusName = (status: string) => {
    switch (status) {
      case "active":
        return "Đang diễn ra";
      case "upcoming":
        return "Sắp diễn ra";
      case "completed":
        return "Đã kết thúc";
      case "cancelled":
        return "Đã hủy";
      default:
        return status;
    }
  };

  // Lấy màu cho loại sự kiện
  const getTypeColor = (type: string) => {
    switch (type) {
      case "promotion":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "holiday":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "workshop":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "special":
        return "bg-purple-100 text-purple-800 border-purple-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  // Lấy tên loại sự kiện hiển thị
  const getTypeName = (type: string) => {
    switch (type) {
      case "promotion":
        return "Khuyến mãi";
      case "holiday":
        return "Ngày lễ";
      case "workshop":
        return "Hội thảo";
      case "special":
        return "Đặc biệt";
      default:
        return type;
    }
  };

  // Tính thời gian còn lại hoặc đã qua
  const getTimeRemaining = (
    startDate: string,
    endDate: string,
    status: string
  ) => {
    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Nếu đã hủy
    if (status === "cancelled") {
      return "Sự kiện đã bị hủy";
    }

    // Nếu sự kiện sắp diễn ra
    if (now < start) {
      const diff = start.getTime() - now.getTime();
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor(
        (diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
      );
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) {
        return `Còn ${days} ngày ${hours} giờ nữa sẽ bắt đầu`;
      } else if (hours > 0) {
        return `Còn ${hours} giờ ${minutes} phút nữa sẽ bắt đầu`;
      } else {
        return `Còn ${minutes} phút nữa sẽ bắt đầu`;
      }
    }

    // Nếu sự kiện đang diễn ra
    if (now >= start && now <= end) {
      const diff = end.getTime() - now.getTime();
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor(
        (diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
      );
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) {
        return `Còn ${days} ngày ${hours} giờ nữa kết thúc`;
      } else if (hours > 0) {
        return `Còn ${hours} giờ ${minutes} phút nữa kết thúc`;
      } else {
        return `Còn ${minutes} phút nữa kết thúc`;
      }
    }

    // Nếu sự kiện đã kết thúc
    const diff = now.getTime() - end.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) {
      return `Đã kết thúc ${days} ngày trước`;
    } else if (hours > 0) {
      return `Đã kết thúc ${hours} giờ trước`;
    } else {
      return `Đã kết thúc cách đây ít phút`;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <AlertCircle className="mx-auto h-16 w-16 text-red-500 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Không tìm thấy sự kiện
            </h2>
            <p className="text-gray-500 mb-4">
              Sự kiện này không tồn tại hoặc đã bị xóa.
            </p>
            <button
              onClick={handleBackToList}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Home className="w-5 h-5 mr-2" />
              Quay lại danh sách sự kiện
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Xác định trạng thái hiện tại của sự kiện
  const currentStatus = getEventStatus(
    event.startDate,
    event.endDate,
    event.status
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex justify-between mb-6">
          <button
            onClick={handleBackToList}
            className="flex items-center text-blue-600 hover:text-blue-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            <span>Quay lại danh sách sự kiện</span>
          </button>
          <button
            onClick={handleEditEvent}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Edit className="w-5 h-5 mr-2" />
            <span>Chỉnh sửa</span>
          </button>
        </div>

        {/* Event Header */}
        <div className="bg-white shadow rounded-lg mb-6 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-12">
            <div className="text-white text-center">
              <h1 className="text-3xl font-bold mb-2">{event.title}</h1>
              <div className="flex flex-col md:flex-row justify-center items-center space-y-2 md:space-y-0 md:space-x-6 mt-4">
                <span className="flex items-center">
                  <Calendar className="h-5 w-5 mr-2" />
                  {formatDate(event.startDate)}
                </span>
                <span className="flex items-center">
                  <Clock className="h-5 w-5 mr-2" />
                  {formatDate(event.endDate)}
                </span>
                <span
                  className={`px-3 py-1 rounded-full ${getTypeColor(
                    event.type
                  )}`}
                >
                  {getTypeName(event.type)}
                </span>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-500 mb-1">Trạng thái</div>
                  <span
                    className={`px-3 py-1 rounded-full ${getStatusColor(
                      currentStatus
                    )}`}
                  >
                    {getStatusName(currentStatus)}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500 mb-1">
                    Thời gian còn lại
                  </div>
                  <span className="text-gray-900 font-medium">
                    {getTimeRemaining(
                      event.startDate,
                      event.endDate,
                      event.status
                    )}
                  </span>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <FileText className="h-5 w-5 mr-2 text-blue-600" />
                Mô tả sự kiện
              </h2>
              <div className="prose max-w-none">
                <p className="text-gray-700 whitespace-pre-line">
                  {event.description || "Không có mô tả cho sự kiện này."}
                </p>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Tag className="h-5 w-5 mr-2 text-blue-600" />
                Thông tin chi tiết
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-500 mb-1">Bắt đầu</div>
                  <div className="text-gray-900 font-medium">
                    {formatDate(event.startDate)}
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-500 mb-1">Kết thúc</div>
                  <div className="text-gray-900 font-medium">
                    {formatDate(event.endDate)}
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-500 mb-1">Loại sự kiện</div>
                  <div className="text-gray-900 font-medium">
                    {getTypeName(event.type)}
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-500 mb-1">Trạng thái</div>
                  <div className="text-gray-900 font-medium">
                    {getStatusName(currentStatus)}
                  </div>
                </div>
              </div>
            </div>

            {/* Thêm nút chia sẻ ở cuối */}
            <div className="mt-8 border-t border-gray-200 pt-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Globe className="h-5 w-5 mr-2 text-blue-600" />
                Chia sẻ sự kiện
              </h2>
              <div className="flex space-x-4">
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  Chia sẻ qua Facebook
                </button>
                <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                  Chia sẻ qua WhatsApp
                </button>
                <button className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors">
                  Sao chép liên kết
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventDetail;
