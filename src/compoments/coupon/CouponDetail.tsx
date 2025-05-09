import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/auth/authProvider";
import { useDataCache } from "../../contexts/auth/DataCacheProvider";
import {
  Home,
  Percent,
  Edit,
  AlertCircle,
  ArrowLeft,
  Tag,
  DollarSign,
  Users,
  Check,
  X,
  Ticket,
} from "lucide-react";
import toast from "react-hot-toast";

interface Coupon {
  $id: string;
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

const CouponDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { getSingleItem, COLLECTION_IDS, updateItem } = useAuth();
  const { getCachedData, setCachedData, invalidateCache } = useDataCache();
  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCouponDetail = async () => {
      if (!id) return;

      setLoading(true);
      try {
        // Kiểm tra cache trước
        const cachedCoupon = getCachedData(`coupon_${id}`);

        if (cachedCoupon) {
          console.log("Sử dụng dữ liệu mã giảm giá từ cache");
          setCoupon(cachedCoupon);
          setLoading(false);
        }

        // Luôn tải dữ liệu mới từ server
        const data = await getSingleItem(COLLECTION_IDS.coupons, id);
        console.log("Chi tiết mã giảm giá từ server:", data);

        // Nếu có dữ liệu mới từ server và khác với cache, cập nhật state và cache
        if (
          data &&
          (!cachedCoupon ||
            JSON.stringify(data) !== JSON.stringify(cachedCoupon))
        ) {
          setCoupon(data);
          setCachedData(`coupon_${id}`, data, 15 * 60 * 1000); // Cache 15 phút
        }

        setLoading(false);
      } catch (error) {
        console.error("Lỗi khi tải chi tiết mã giảm giá:", error);
        toast.error("Không thể tải thông tin mã giảm giá");
        setLoading(false);
      }
    };

    fetchCouponDetail();
  }, [id, getSingleItem, getCachedData, setCachedData]);

  const handleBackToList = () => {
    navigate("/coupons");
  };

  const handleEditCoupon = () => {
    navigate(`/coupons/edit/${id}`);
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

  // Hiển thị giá trị của mã giảm giá
  const displayCouponValue = (coupon: Coupon) => {
    switch (coupon.type) {
      case "percent":
        return `${coupon.value}%`;
      case "fixed":
        return `${coupon.value.toLocaleString()} VNĐ`;
      case "shipping":
        return "Miễn phí vận chuyển";
      case "bogo":
        return "Mua 1 tặng 1";
      default:
        return coupon.value.toString();
    }
  };

  // Kiểm tra trạng thái mã giảm giá
  const getCouponStatus = (coupon: Coupon) => {
    if (!coupon.isActive) return "inactive";

    const now = new Date();
    const startDate = new Date(coupon.startDate);
    const endDate = new Date(coupon.endDate);

    if (now < startDate) return "upcoming";
    if (now > endDate) return "expired";

    if (coupon.usageLimit > 0 && coupon.usageCount >= coupon.usageLimit)
      return "depleted";

    return "active";
  };

  // Lấy màu cho trạng thái
  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 border-green-200";
      case "upcoming":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "expired":
        return "bg-red-100 text-red-800 border-red-200";
      case "depleted":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "inactive":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  // Lấy tên trạng thái hiển thị
  const getStatusName = (status: string) => {
    switch (status) {
      case "active":
        return "Đang hoạt động";
      case "upcoming":
        return "Sắp diễn ra";
      case "expired":
        return "Đã hết hạn";
      case "depleted":
        return "Đã dùng hết";
      case "inactive":
        return "Không kích hoạt";
      default:
        return status;
    }
  };

  // Lấy màu cho loại mã giảm giá
  const getTypeColor = (type: string) => {
    switch (type) {
      case "percent":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "fixed":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "shipping":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "bogo":
        return "bg-purple-100 text-purple-800 border-purple-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  // Lấy tên loại mã giảm giá hiển thị
  const getTypeName = (type: string) => {
    switch (type) {
      case "percent":
        return "Phần trăm (%)";
      case "fixed":
        return "Số tiền cố định";
      case "shipping":
        return "Miễn phí vận chuyển";
      case "bogo":
        return "Mua 1 tặng 1";
      default:
        return type;
    }
  };

  // Tính thời gian còn lại hoặc đã qua
  const getRemainingTime = (coupon: Coupon) => {
    const now = new Date();
    const startDate = new Date(coupon.startDate);
    const endDate = new Date(coupon.endDate);

    // Nếu chưa đến thời gian bắt đầu
    if (now < startDate) {
      const diff = startDate.getTime() - now.getTime();
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor(
        (diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
      );

      if (days > 0) {
        return `Bắt đầu sau ${days} ngày ${hours} giờ`;
      } else {
        return `Bắt đầu sau ${hours} giờ`;
      }
    }

    // Nếu đã hết hạn
    if (now > endDate) {
      const diff = now.getTime() - endDate.getTime();
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));

      if (days > 0) {
        return `Đã hết hạn ${days} ngày trước`;
      } else {
        return `Đã hết hạn trong ngày hôm nay`;
      }
    }

    // Nếu đang hoạt động
    const diff = endDate.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) {
      return `Còn ${days} ngày ${hours} giờ`;
    } else {
      return `Còn ${hours} giờ`;
    }
  };

  // Xử lý kích hoạt/vô hiệu hóa mã giảm giá
  const handleToggleActive = async () => {
    if (!coupon) return;

    try {
      const newStatus = !coupon.isActive;
      await updateItem(COLLECTION_IDS.coupons, coupon.$id, {
        isActive: newStatus,
      });

      // Cập nhật state và cache
      setCoupon({
        ...coupon,
        isActive: newStatus,
      });

      setCachedData(
        `coupon_${coupon.$id}`,
        {
          ...coupon,
          isActive: newStatus,
        },
        15 * 60 * 1000
      );

      invalidateCache("couponsList");

      toast.success(
        newStatus ? "Đã kích hoạt mã giảm giá" : "Đã vô hiệu hóa mã giảm giá"
      );
    } catch (error) {
      console.error("Lỗi khi cập nhật trạng thái mã giảm giá:", error);
      toast.error("Không thể cập nhật trạng thái mã giảm giá");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!coupon) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <AlertCircle className="mx-auto h-16 w-16 text-red-500 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Không tìm thấy mã giảm giá
            </h2>
            <p className="text-gray-500 mb-4">
              Mã giảm giá này không tồn tại hoặc đã bị xóa.
            </p>
            <button
              onClick={handleBackToList}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Home className="w-5 h-5 mr-2" />
              Quay lại danh sách mã giảm giá
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Xác định trạng thái hiện tại của mã giảm giá
  const currentStatus = getCouponStatus(coupon);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex justify-between mb-6">
          <button
            onClick={handleBackToList}
            className="flex items-center text-blue-600 hover:text-blue-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            <span>Quay lại danh sách mã giảm giá</span>
          </button>
          <button
            onClick={handleEditCoupon}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Edit className="w-5 h-5 mr-2" />
            <span>Chỉnh sửa</span>
          </button>
        </div>

        {/* Coupon Header */}
        <div className="bg-white shadow rounded-lg mb-6 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-12">
            <div className="flex flex-col md:flex-row items-center justify-between">
              <div className="flex flex-col md:flex-row items-center">
                <div className="h-24 w-24 rounded-full bg-white flex items-center justify-center mb-4 md:mb-0 md:mr-6">
                  <Ticket className="h-14 w-14 text-blue-600" />
                </div>
                <div className="text-white text-center md:text-left">
                  <h1 className="text-3xl font-bold">Mã: {coupon.code}</h1>
                  <div className="mt-2 flex flex-col md:flex-row md:items-center space-y-1 md:space-y-0 md:space-x-4">
                    <span
                      className={`px-3 py-1 rounded-full ${getTypeColor(
                        coupon.type
                      )}`}
                    >
                      {getTypeName(coupon.type)}
                    </span>
                    <span className="flex items-center justify-center md:justify-start">
                      {coupon.type === "percent" ? (
                        <Percent className="h-4 w-4 mr-1" />
                      ) : (
                        <DollarSign className="h-4 w-4 mr-1" />
                      )}
                      {displayCouponValue(coupon)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-6 md:mt-0">
                <span
                  className={`px-4 py-2 rounded-lg border ${getStatusColor(
                    currentStatus
                  )}`}
                >
                  {getStatusName(currentStatus)}
                </span>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-500 mb-1">
                    Thời gian còn lại
                  </div>
                  <span className="text-lg font-medium text-gray-900">
                    {getRemainingTime(coupon)}
                  </span>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-1">Trạng thái</div>
                  <button
                    onClick={handleToggleActive}
                    className={`flex items-center px-4 py-2 rounded-lg ${
                      coupon.isActive
                        ? "bg-green-100 text-green-700 hover:bg-green-200"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    } transition-colors`}
                  >
                    {coupon.isActive ? (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Đang kích hoạt
                      </>
                    ) : (
                      <>
                        <X className="w-4 h-4 mr-2" />
                        Đã vô hiệu hóa
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {coupon.description && (
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                  <Tag className="h-5 w-5 mr-2 text-blue-600" />
                  Mô tả mã giảm giá
                </h2>
                <div className="prose max-w-none bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-700 whitespace-pre-line">
                    {coupon.description}
                  </p>
                </div>
              </div>
            )}

            <div className="border-t border-gray-200 pt-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Tag className="h-5 w-5 mr-2 text-blue-600" />
                Thông tin chi tiết
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-500 mb-1">
                    Giá trị giảm giá
                  </div>
                  <div className="text-lg font-medium text-gray-900">
                    {displayCouponValue(coupon)}
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-500 mb-1">
                    Loại mã giảm giá
                  </div>
                  <div className="text-lg font-medium text-gray-900">
                    {getTypeName(coupon.type)}
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-500 mb-1">
                    Thời gian bắt đầu
                  </div>
                  <div className="text-lg font-medium text-gray-900">
                    {formatDate(coupon.startDate)}
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-500 mb-1">
                    Thời gian kết thúc
                  </div>
                  <div className="text-lg font-medium text-gray-900">
                    {formatDate(coupon.endDate)}
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-500 mb-1">Lượt sử dụng</div>
                  <div className="text-lg font-medium text-gray-900">
                    {coupon.usageLimit > 0 ? (
                      <span>
                        {coupon.usageCount} / {coupon.usageLimit}
                      </span>
                    ) : (
                      <span>{coupon.usageCount} (Không giới hạn)</span>
                    )}
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-500 mb-1">
                    Đơn hàng tối thiểu
                  </div>
                  <div className="text-lg font-medium text-gray-900">
                    {coupon.minOrderValue > 0
                      ? `${coupon.minOrderValue.toLocaleString()} VNĐ`
                      : "Không giới hạn"}
                  </div>
                </div>
                {coupon.type === "percent" && coupon.maxDiscount > 0 && (
                  <div className="bg-gray-50 p-4 rounded-lg md:col-span-2">
                    <div className="text-sm text-gray-500 mb-1">
                      Giảm tối đa
                    </div>
                    <div className="text-lg font-medium text-gray-900">
                      {coupon.maxDiscount.toLocaleString()} VNĐ
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Phần thông tin cách sử dụng */}
            <div className="mt-8 border-t border-gray-200 pt-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Users className="h-5 w-5 mr-2 text-blue-600" />
                Hướng dẫn sử dụng
              </h2>
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-md font-medium text-blue-800 mb-2">
                  Cách sử dụng mã giảm giá
                </h3>
                <ol className="list-decimal pl-5 text-blue-700 space-y-2">
                  <li>
                    Nhập mã <strong>{coupon.code}</strong> tại trang thanh toán
                  </li>
                  <li>
                    Mã giảm giá sẽ được áp dụng tự động vào đơn hàng của bạn
                  </li>
                  {coupon.minOrderValue > 0 && (
                    <li>
                      Đơn hàng phải có giá trị tối thiểu{" "}
                      {coupon.minOrderValue.toLocaleString()} VNĐ
                    </li>
                  )}
                  {coupon.usageLimit > 0 && (
                    <li>
                      Mã giảm giá có giới hạn {coupon.usageLimit} lần sử dụng
                    </li>
                  )}
                  <li>
                    Mã giảm giá có hiệu lực đến {formatDate(coupon.endDate)}
                  </li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CouponDetail;
