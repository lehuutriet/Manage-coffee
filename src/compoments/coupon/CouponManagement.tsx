import { useEffect, useState, useCallback } from "react";
import { useAuth } from "../../contexts/auth/authProvider";
import { useDataCache } from "../../contexts/auth/DataCacheProvider";
import {
  Trash2,
  Search,
  FilterX,
  Home,
  PlusCircle,
  Edit,
  Clock,
  ChevronLeft,
  ChevronRight,
  Ticket,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import DeleteConfirmModal from "../products/DeleteConfirmModal";

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

const CouponManagement = () => {
  const { getAllItems, COLLECTION_IDS, deleteItem } = useAuth();
  const { setCachedData, getCachedData } = useDataCache();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Coupon | null;
    direction: "asc" | "desc";
  }>({ key: "startDate", direction: "desc" });
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [couponToDelete, setCouponToDelete] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState({
    startDate: "",
    endDate: "",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [refreshKey, setRefreshKey] = useState(0);

  const navigate = useNavigate();

  // Xử lý khi click nút xóa
  const handleDeleteClick = (couponId: string) => {
    setCouponToDelete(couponId);
    setIsDeleteModalOpen(true);
  };

  // Xử lý khi xác nhận xóa
  const handleDeleteConfirm = async () => {
    if (!couponToDelete) return;

    setIsDeleting(true);
    try {
      await deleteItem(COLLECTION_IDS.coupons, couponToDelete);

      // Cập nhật state và cache
      const updatedCoupons = coupons.filter(
        (coupon) => coupon.$id !== couponToDelete
      );
      setCoupons(updatedCoupons);
      setCachedData("couponsList", updatedCoupons, 5 * 60 * 1000);

      toast.success("Đã xóa mã giảm giá thành công");
    } catch (error) {
      console.error("Lỗi khi xóa mã giảm giá:", error);
      toast.error("Không thể xóa mã giảm giá");
    } finally {
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
      setCouponToDelete(null);
    }
  };

  // Tải dữ liệu mã giảm giá sử dụng cache
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Kiểm tra cache trước
      const cachedCoupons = getCachedData("couponsList");

      if (cachedCoupons && refreshKey === 0) {
        console.log("Sử dụng dữ liệu mã giảm giá từ cache");
        setCoupons(cachedCoupons);
        setLoading(false);

        // Vẫn tải lại dữ liệu mới từ server nhưng không chờ đợi
        refreshCoupons();
      } else {
        // Nếu không có cache hoặc đang yêu cầu làm mới, tải từ server
        await refreshCoupons();
      }
    } catch (error) {
      console.error("Lỗi khi tải dữ liệu:", error);
      toast.error("Không thể tải dữ liệu mã giảm giá");
      setLoading(false);
    }
  }, [refreshKey]);

  // Tải lại dữ liệu mã giảm giá từ server
  const refreshCoupons = async () => {
    try {
      const data = await getAllItems(COLLECTION_IDS.coupons);
      console.log("Tổng số mã giảm giá lấy được:", data.length);

      // Sắp xếp theo thời gian mới nhất
      data.sort((a, b) => {
        const dateA = new Date(a.startDate).getTime();
        const dateB = new Date(b.startDate).getTime();
        return dateB - dateA;
      });

      setCoupons(data);

      // Cập nhật cache với thời gian hết hạn 5 phút
      setCachedData("couponsList", data, 5 * 60 * 1000);

      setLoading(false);
    } catch (error) {
      console.error("Lỗi khi làm mới danh sách mã giảm giá:", error);
      if (loading) {
        setLoading(false);
      }
    }
  };

  // Gọi API khi component được tạo
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Làm mới dữ liệu
  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  // Quay lại trang chủ
  const handleBackToHome = () => {
    navigate("/homepage");
  };

  // Sắp xếp dữ liệu
  const requestSort = (key: keyof Coupon) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  // Định dạng ngày tháng
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

  // Xử lý chuyển hướng đến trang chi tiết mã giảm giá
  const handleViewCoupon = (couponId: string) => {
    // Tìm mã giảm giá cần xem
    const couponToView = coupons.find((coupon) => coupon.$id === couponId);

    if (couponToView) {
      // Cache mã giảm giá này để truy cập nhanh hơn trong trang chi tiết
      setCachedData(`coupon_${couponId}`, couponToView, 15 * 60 * 1000); // Cache 15 phút
    }

    navigate(`/coupons/${couponId}`);
  };

  // Xử lý chỉnh sửa mã giảm giá
  const handleEditCoupon = (couponId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/coupons/edit/${couponId}`);
  };

  // Xử lý thêm mã giảm giá mới
  const handleAddNewCoupon = () => {
    navigate("/coupons/new");
  };

  // Kiểm tra mã giảm giá đã hết hạn hay chưa
  const isCouponExpired = (endDate: string) => {
    const now = new Date();
    const end = new Date(endDate);
    return now > end;
  };

  // Kiểm tra mã giảm giá đã đạt giới hạn sử dụng chưa
  const isCouponUsageLimitReached = (coupon: Coupon) => {
    return coupon.usageLimit > 0 && coupon.usageCount >= coupon.usageLimit;
  };

  // Lọc và sắp xếp mã giảm giá
  const filteredCoupons = coupons
    .filter((coupon) => {
      // Lọc theo tìm kiếm
      const matchesSearch =
        coupon.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        coupon.description?.toLowerCase().includes(searchTerm.toLowerCase());

      // Lọc theo loại mã giảm giá
      const matchesType = typeFilter ? coupon.type === typeFilter : true;

      // Lọc theo trạng thái
      let matchesStatus = true;
      if (statusFilter === "active") {
        matchesStatus =
          coupon.isActive &&
          !isCouponExpired(coupon.endDate) &&
          !isCouponUsageLimitReached(coupon);
      } else if (statusFilter === "expired") {
        matchesStatus =
          isCouponExpired(coupon.endDate) || isCouponUsageLimitReached(coupon);
      } else if (statusFilter === "inactive") {
        matchesStatus = !coupon.isActive;
      }

      // Lọc theo ngày
      let matchesDate = true;
      if (dateFilter.startDate) {
        const couponStartDate = new Date(coupon.startDate);
        const filterStartDate = new Date(dateFilter.startDate);
        matchesDate = couponStartDate >= filterStartDate;
      }
      if (dateFilter.endDate && matchesDate) {
        const couponEndDate = new Date(coupon.endDate);
        const filterEndDate = new Date(dateFilter.endDate);
        filterEndDate.setHours(23, 59, 59, 999);
        matchesDate = couponEndDate <= filterEndDate;
      }

      return matchesSearch && matchesType && matchesStatus && matchesDate;
    })
    .sort((a, b) => {
      // Sắp xếp kết quả
      if (!sortConfig.key) return 0;

      if (sortConfig.key === "startDate" || sortConfig.key === "endDate") {
        const dateA = new Date(a[sortConfig.key]).getTime();
        const dateB = new Date(b[sortConfig.key]).getTime();
        return sortConfig.direction === "asc" ? dateA - dateB : dateB - dateA;
      }

      const valueA = a[sortConfig.key] ?? "";
      const valueB = b[sortConfig.key] ?? "";

      if (typeof valueA === "string" && typeof valueB === "string") {
        return sortConfig.direction === "asc"
          ? valueA.localeCompare(valueB)
          : valueB.localeCompare(valueA);
      }

      if (valueA === valueB) return 0;

      return sortConfig.direction === "asc"
        ? valueA < valueB
          ? -1
          : 1
        : valueA > valueB
        ? -1
        : 1;
    });

  // Xóa bộ lọc
  const clearFilters = () => {
    setSearchTerm("");
    setTypeFilter("");
    setStatusFilter("");
    setDateFilter({ startDate: "", endDate: "" });
  };

  // Lấy màu cho trạng thái
  const getStatusColor = (coupon: Coupon) => {
    if (!coupon.isActive) {
      return "bg-gray-100 text-gray-800";
    }
    if (isCouponExpired(coupon.endDate)) {
      return "bg-red-100 text-red-800";
    }
    if (isCouponUsageLimitReached(coupon)) {
      return "bg-orange-100 text-orange-800";
    }
    return "bg-green-100 text-green-800";
  };

  // Lấy tên trạng thái hiển thị
  const getStatusName = (coupon: Coupon) => {
    if (!coupon.isActive) {
      return "Không kích hoạt";
    }
    if (isCouponExpired(coupon.endDate)) {
      return "Đã hết hạn";
    }
    if (isCouponUsageLimitReached(coupon)) {
      return "Đã dùng hết";
    }
    return "Đang hoạt động";
  };

  // Lấy màu cho loại mã giảm giá
  const getTypeColor = (type: string) => {
    switch (type) {
      case "percent":
        return "bg-amber-100 text-amber-800";
      case "fixed":
        return "bg-emerald-100 text-emerald-800";
      case "shipping":
        return "bg-blue-100 text-blue-800";
      case "bogo":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
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

  // Lấy giá trị hiển thị
  const getValueDisplay = (coupon: Coupon) => {
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

  // Phân trang
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredCoupons.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredCoupons.length / itemsPerPage);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);
  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };
  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <button
          onClick={handleBackToHome}
          className="mb-6 flex items-center text-blue-600 hover:text-blue-800 transition-colors"
        >
          <Home className="w-5 h-5 mr-2" />
          <span>Quay lại trang chủ</span>
        </button>

        {/* Tiêu đề */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Quản lý mã giảm giá
            </h1>
            <p className="text-gray-600 mt-1">
              Quản lý tất cả mã giảm giá của cửa hàng AYAI-Coffee
            </p>
          </div>
          <div className="mt-4 md:mt-0 flex space-x-4">
            <button
              onClick={handleRefresh}
              className="flex items-center px-4 py-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
            >
              <svg
                className="w-5 h-5 mr-2"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M4 12C4 7.58172 7.58172 4 12 4C15.0736 4 17.7249 5.80151 19 8.5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M20 12C20 16.4183 16.4183 20 12 20C8.92638 20 6.27514 18.1985 5 15.5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M20 4V8H16"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M4 20V16H8"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Làm mới
            </button>
            <button
              onClick={handleAddNewCoupon}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <PlusCircle className="w-5 h-5 mr-2" />
              Thêm mã giảm giá mới
            </button>
          </div>
        </div>

        {/* Bộ lọc và tìm kiếm */}
        <div className="bg-white p-4 rounded-lg shadow-md mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Tìm kiếm mã giảm giá..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Tất cả loại mã giảm giá</option>
                <option value="percent">Phần trăm (%)</option>
                <option value="fixed">Số tiền cố định</option>
                <option value="shipping">Miễn phí vận chuyển</option>
                <option value="bogo">Mua 1 tặng 1</option>
              </select>
            </div>
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Tất cả trạng thái</option>
                <option value="active">Đang hoạt động</option>
                <option value="expired">Đã hết hạn</option>
                <option value="inactive">Không kích hoạt</option>
              </select>
            </div>
            <div>
              <input
                type="date"
                value={dateFilter.startDate}
                onChange={(e) =>
                  setDateFilter({ ...dateFilter, startDate: e.target.value })
                }
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Từ ngày"
              />
            </div>
            <div>
              <button
                onClick={clearFilters}
                className="flex items-center justify-center px-4 py-2 w-full bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
              >
                <FilterX className="w-5 h-5 mr-2" />
                Xóa bộ lọc
              </button>
            </div>
          </div>
        </div>

        {/* Danh sách mã giảm giá */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : filteredCoupons.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <Ticket className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">
              Không tìm thấy mã giảm giá
            </h3>
            <p className="text-gray-500">
              {searchTerm ||
              typeFilter ||
              statusFilter ||
              dateFilter.startDate ||
              dateFilter.endDate
                ? "Không có mã giảm giá nào phù hợp với bộ lọc của bạn"
                : "Chưa có mã giảm giá nào trong hệ thống."}
            </p>
          </div>
        ) : (
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => requestSort("code")}
                    >
                      Mã giảm giá
                      {sortConfig.key === "code" && (
                        <span>
                          {sortConfig.direction === "asc" ? " ↑" : " ↓"}
                        </span>
                      )}
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => requestSort("type")}
                    >
                      Loại
                      {sortConfig.key === "type" && (
                        <span>
                          {sortConfig.direction === "asc" ? " ↑" : " ↓"}
                        </span>
                      )}
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => requestSort("value")}
                    >
                      Giá trị
                      {sortConfig.key === "value" && (
                        <span>
                          {sortConfig.direction === "asc" ? " ↑" : " ↓"}
                        </span>
                      )}
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => requestSort("endDate")}
                    >
                      Thời gian
                      {sortConfig.key === "endDate" && (
                        <span>
                          {sortConfig.direction === "asc" ? " ↑" : " ↓"}
                        </span>
                      )}
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Trạng thái
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentItems.map((coupon) => (
                    <tr
                      key={coupon.$id}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => handleViewCoupon(coupon.$id)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-md bg-blue-100 flex items-center justify-center">
                              <Ticket className="h-6 w-6 text-blue-600" />
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {coupon.code}
                            </div>
                            <div className="text-sm text-gray-500 truncate max-w-xs">
                              {coupon.description || "Không có mô tả"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getTypeColor(
                            coupon.type
                          )}`}
                        >
                          {getTypeName(coupon.type)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900">
                          {getValueDisplay(coupon)}
                        </div>
                        {coupon.minOrderValue > 0 && (
                          <div className="text-xs text-gray-500">
                            Đơn tối thiểu:{" "}
                            {coupon.minOrderValue.toLocaleString()} VNĐ
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          Đến: {formatDate(coupon.endDate)}
                        </div>
                        <div className="text-sm text-gray-500 flex items-center">
                          <Clock className="inline h-4 w-4 mr-1" />
                          {coupon.usageLimit > 0 ? (
                            <span>
                              Đã dùng: {coupon.usageCount}/{coupon.usageLimit}
                            </span>
                          ) : (
                            <span>Không giới hạn lượt dùng</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                            coupon
                          )}`}
                        >
                          {getStatusName(coupon)}
                        </span>
                      </td>
                      <td
                        className="px-6 py-4 whitespace-nowrap text-right text-sm"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={(e) => handleEditCoupon(coupon.$id, e)}
                          className="text-indigo-600 hover:text-indigo-900 mr-4"
                        >
                          <Edit className="h-5 w-5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClick(coupon.$id);
                          }}
                          className="text-red-600 hover:text-red-900"
                          disabled={isDeleting}
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Phân trang */}
            <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Hiển thị{" "}
                    <span className="font-medium">{indexOfFirstItem + 1}</span>{" "}
                    đến{" "}
                    <span className="font-medium">
                      {Math.min(indexOfLastItem, filteredCoupons.length)}
                    </span>{" "}
                    của{" "}
                    <span className="font-medium">
                      {filteredCoupons.length}
                    </span>{" "}
                    kết quả
                  </p>
                </div>
                <div>
                  <nav
                    className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
                    aria-label="Phân trang"
                  >
                    <button
                      onClick={prevPage}
                      disabled={currentPage === 1}
                      className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${
                        currentPage === 1
                          ? "text-gray-300 cursor-not-allowed"
                          : "text-gray-500 hover:bg-gray-50"
                      }`}
                    >
                      <span className="sr-only">Trước</span>
                      <ChevronLeft className="h-5 w-5" />
                    </button>

                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                      (number) => (
                        <button
                          key={number}
                          onClick={() => paginate(number)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            currentPage === number
                              ? "z-10 bg-blue-50 border-blue-500 text-blue-600"
                              : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
                          }`}
                        >
                          {number}
                        </button>
                      )
                    )}

                    <button
                      onClick={nextPage}
                      disabled={currentPage === totalPages}
                      className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${
                        currentPage === totalPages
                          ? "text-gray-300 cursor-not-allowed"
                          : "text-gray-500 hover:bg-gray-50"
                      }`}
                    >
                      <span className="sr-only">Sau</span>
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </nav>
                </div>
              </div>

              {/* Phiên bản di động */}
              <div className="flex sm:hidden justify-between w-full">
                <button
                  onClick={prevPage}
                  disabled={currentPage === 1}
                  className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                    currentPage === 1
                      ? "text-gray-300 bg-gray-100"
                      : "text-gray-700 bg-white hover:bg-gray-50"
                  }`}
                >
                  Trước
                </button>
                <span className="text-sm text-gray-700">
                  Trang {currentPage} / {totalPages}
                </span>
                <button
                  onClick={nextPage}
                  disabled={currentPage === totalPages}
                  className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                    currentPage === totalPages
                      ? "text-gray-300 bg-gray-100"
                      : "text-gray-700 bg-white hover:bg-gray-50"
                  }`}
                >
                  Sau
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal xác nhận xóa */}
        <DeleteConfirmModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={handleDeleteConfirm}
          title="Xóa mã giảm giá"
          message="Bạn có chắc chắn muốn xóa mã giảm giá này? Hành động này không thể hoàn tác."
          isDeleting={isDeleting}
        />
      </div>
    </div>
  );
};

export default CouponManagement;
