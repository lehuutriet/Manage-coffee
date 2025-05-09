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
  Calendar,
  ChevronLeft,
  ChevronRight,
  Gift,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import DeleteConfirmModal from "../products/DeleteConfirmModal";

interface Promotion {
  $id: string;
  name: string;
  type: string;
  value: number;
  minOrderValue: number;
  maxDiscount: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  description: string;
  details: string[];
  photo: string;
  photoUrl: string;
  userId?: string;
}

const PromotionManagement = () => {
  const { getAllItems, COLLECTION_IDS, deleteItem } = useAuth();
  const { setCachedData, getCachedData } = useDataCache();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Promotion | null;
    direction: "asc" | "desc";
  }>({ key: "startDate", direction: "desc" });
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [promotionToDelete, setPromotionToDelete] = useState<string | null>(
    null
  );
  const [dateFilter, setDateFilter] = useState({
    startDate: "",
    endDate: "",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [refreshKey, setRefreshKey] = useState(0);

  const navigate = useNavigate();

  // Xử lý khi click nút xóa
  const handleDeleteClick = (promotionId: string) => {
    setPromotionToDelete(promotionId);
    setIsDeleteModalOpen(true);
  };

  // Xử lý khi xác nhận xóa
  const handleDeleteConfirm = async () => {
    if (!promotionToDelete) return;

    setIsDeleting(true);
    try {
      await deleteItem(COLLECTION_IDS.promotions, promotionToDelete);

      // Cập nhật state và cache
      const updatedPromotions = promotions.filter(
        (promotion) => promotion.$id !== promotionToDelete
      );
      setPromotions(updatedPromotions);
      setCachedData("promotionsList", updatedPromotions, 5 * 60 * 1000);

      toast.success("Đã xóa khuyến mãi thành công");
    } catch (error) {
      console.error("Lỗi khi xóa khuyến mãi:", error);
      toast.error("Không thể xóa khuyến mãi");
    } finally {
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
      setPromotionToDelete(null);
    }
  };

  // Tải dữ liệu khuyến mãi sử dụng cache
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Kiểm tra cache trước
      const cachedPromotions = getCachedData("promotionsList");

      if (cachedPromotions && refreshKey === 0) {
        console.log("Sử dụng dữ liệu khuyến mãi từ cache");
        setPromotions(cachedPromotions);
        setLoading(false);

        // Vẫn tải lại dữ liệu mới từ server nhưng không chờ đợi
        refreshPromotions();
      } else {
        // Nếu không có cache hoặc đang yêu cầu làm mới, tải từ server
        await refreshPromotions();
      }
    } catch (error) {
      console.error("Lỗi khi tải dữ liệu:", error);
      toast.error("Không thể tải dữ liệu khuyến mãi");
      setLoading(false);
    }
  }, [refreshKey]);

  // Tải lại dữ liệu khuyến mãi từ server
  const refreshPromotions = async () => {
    try {
      const data = await getAllItems(COLLECTION_IDS.promotions);
      console.log("Tổng số khuyến mãi lấy được:", data.length);

      // Sắp xếp theo thời gian mới nhất
      data.sort((a, b) => {
        const dateA = new Date(a.startDate).getTime();
        const dateB = new Date(b.startDate).getTime();
        return dateB - dateA;
      });

      setPromotions(data);

      // Cập nhật cache với thời gian hết hạn 5 phút
      setCachedData("promotionsList", data, 5 * 60 * 1000);

      setLoading(false);
    } catch (error) {
      console.error("Lỗi khi làm mới danh sách khuyến mãi:", error);
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
  const requestSort = (key: keyof Promotion) => {
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

  // Xử lý chuyển hướng đến trang chi tiết
  const handleViewPromotion = (promotionId: string) => {
    // Tìm khuyến mãi cần xem
    const promotionToView = promotions.find(
      (promotion) => promotion.$id === promotionId
    );

    if (promotionToView) {
      // Cache khuyến mãi này để truy cập nhanh hơn trong trang chi tiết
      setCachedData(
        `promotion_${promotionId}`,
        promotionToView,
        15 * 60 * 1000
      ); // Cache 15 phút
    }

    navigate(`/promotions/${promotionId}`);
  };

  // Xử lý chỉnh sửa
  const handleEditPromotion = (promotionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/promotions/edit/${promotionId}`);
  };

  // Xử lý thêm mới
  const handleAddNewPromotion = () => {
    navigate("/promotions/new");
  };

  // Lọc và sắp xếp
  // Hàm lọc và sắp xếp đầy đủ
  const filteredPromotions = promotions
    .filter((promotion) => {
      // Lọc theo tìm kiếm
      const matchesSearch =
        promotion.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        false ||
        promotion.description
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        false;

      // Lọc theo loại khuyến mãi
      const matchesType = typeFilter ? promotion.type === typeFilter : true;

      // Lọc theo trạng thái
      let matchesStatus = true;
      if (statusFilter === "active") {
        matchesStatus =
          promotion.isActive &&
          !isPromotionExpired(promotion.endDate || "") &&
          !isPromotionUpcoming(promotion.startDate || "");
      } else if (statusFilter === "expired") {
        matchesStatus = isPromotionExpired(promotion.endDate || "");
      } else if (statusFilter === "upcoming") {
        matchesStatus = isPromotionUpcoming(promotion.startDate || "");
      } else if (statusFilter === "inactive") {
        matchesStatus = !promotion.isActive;
      }

      // Lọc theo ngày
      let matchesDate = true;
      if (dateFilter.startDate) {
        const promotionStartDate = new Date(promotion.startDate || "");
        const filterStartDate = new Date(dateFilter.startDate);
        matchesDate =
          !isNaN(promotionStartDate.getTime()) &&
          !isNaN(filterStartDate.getTime())
            ? promotionStartDate >= filterStartDate
            : true;
      }
      if (dateFilter.endDate && matchesDate) {
        const promotionEndDate = new Date(promotion.endDate || "");
        const filterEndDate = new Date(dateFilter.endDate);
        filterEndDate.setHours(23, 59, 59, 999);
        matchesDate =
          !isNaN(promotionEndDate.getTime()) && !isNaN(filterEndDate.getTime())
            ? promotionEndDate <= filterEndDate
            : true;
      }

      return matchesSearch && matchesType && matchesStatus && matchesDate;
    })
    .sort((a, b) => {
      // Sắp xếp kết quả
      if (!sortConfig.key) return 0;

      if (sortConfig.key === "startDate" || sortConfig.key === "endDate") {
        const dateA = a[sortConfig.key]
          ? new Date(a[sortConfig.key] as string).getTime()
          : 0;
        const dateB = b[sortConfig.key]
          ? new Date(b[sortConfig.key] as string).getTime()
          : 0;
        return sortConfig.direction === "asc" ? dateA - dateB : dateB - dateA;
      }

      const valueA = a[sortConfig.key] ?? "";
      const valueB = b[sortConfig.key] ?? "";

      // Kiểm tra kiểu dữ liệu trước khi thực hiện các phương thức
      if (typeof valueA === "string" && typeof valueB === "string") {
        return sortConfig.direction === "asc"
          ? valueA.localeCompare(valueB)
          : valueB.localeCompare(valueA);
      }

      // Chuyển đổi giá trị thành chuỗi an toàn
      const strA =
        valueA !== undefined && valueA !== null ? String(valueA) : "";
      const strB =
        valueB !== undefined && valueB !== null ? String(valueB) : "";

      if (strA === strB) return 0;

      return sortConfig.direction === "asc"
        ? strA < strB
          ? -1
          : 1
        : strA > strB
        ? -1
        : 1;
    });

  // Hàm kiểm tra khuyến mãi đã hết hạn hay chưa
  const isPromotionExpired = (endDate: string): boolean => {
    if (!endDate) return false;

    try {
      const now = new Date();
      const end = new Date(endDate);
      return !isNaN(end.getTime()) ? now > end : false;
    } catch (error) {
      console.error("Lỗi khi kiểm tra hết hạn:", error);
      return false;
    }
  };

  // Hàm kiểm tra khuyến mãi chưa bắt đầu
  const isPromotionUpcoming = (startDate: string): boolean => {
    if (!startDate) return false;

    try {
      const now = new Date();
      const start = new Date(startDate);
      return !isNaN(start.getTime()) ? now < start : false;
    } catch (error) {
      console.error("Lỗi khi kiểm tra sắp diễn ra:", error);
      return false;
    }
  };

  // Lấy trạng thái hiển thị
  const getStatusName = (promotion: Promotion): string => {
    if (!promotion || promotion.isActive === undefined) return "Không xác định";

    if (!promotion.isActive) {
      return "Không kích hoạt";
    }
    if (isPromotionExpired(promotion.endDate || "")) {
      return "Đã kết thúc";
    }
    if (isPromotionUpcoming(promotion.startDate || "")) {
      return "Sắp diễn ra";
    }
    return "Đang diễn ra";
  };

  // Lấy giá trị hiển thị
  const getValueDisplay = (promotion: Promotion): string => {
    if (!promotion || !promotion.type) return "";

    switch (promotion.type) {
      case "percent":
        return `${promotion.value || 0}%`;
      case "fixed":
        return `${(promotion.value || 0).toLocaleString()} VNĐ`;
      case "freegift":
        return "Tặng quà";
      case "buyxgety":
        return "Mua X tặng Y";
      default:
        return promotion.value !== undefined && promotion.value !== null
          ? String(promotion.value)
          : "0";
    }
  };

  // Xóa bộ lọc
  const clearFilters = () => {
    setSearchTerm("");
    setTypeFilter("");
    setStatusFilter("");
    setDateFilter({ startDate: "", endDate: "" });
  };

  // Lấy màu cho trạng thái
  const getStatusColor = (promotion: Promotion) => {
    if (!promotion.isActive) {
      return "bg-gray-100 text-gray-800";
    }
    if (isPromotionExpired(promotion.endDate)) {
      return "bg-red-100 text-red-800";
    }
    if (isPromotionUpcoming(promotion.startDate)) {
      return "bg-blue-100 text-blue-800";
    }
    return "bg-green-100 text-green-800";
  };

  // Lấy màu cho loại
  const getTypeColor = (type: string) => {
    switch (type) {
      case "percent":
        return "bg-amber-100 text-amber-800";
      case "fixed":
        return "bg-emerald-100 text-emerald-800";
      case "freegift":
        return "bg-purple-100 text-purple-800";
      case "buyxgety":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Lấy tên loại hiển thị
  const getTypeName = (type: string) => {
    switch (type) {
      case "percent":
        return "Giảm giá %";
      case "discount_product":
        return "Giảm số tiền";
      case "fixed":
        return "Giảm giá cố định";
      case "freegift":
        return "Tặng quà";
      case "buy_x_get_y":
        return "Mua 1 tặng 1";
      default:
        return type;
    }
  };

  // Phân trang
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredPromotions.slice(
    indexOfFirstItem,
    indexOfLastItem
  );
  const totalPages = Math.ceil(filteredPromotions.length / itemsPerPage);

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
              Quản lý khuyến mãi
            </h1>
            <p className="text-gray-600 mt-1">
              Quản lý tất cả chương trình khuyến mãi của cửa hàng AYAI-Coffee
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
              onClick={handleAddNewPromotion}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <PlusCircle className="w-5 h-5 mr-2" />
              Thêm khuyến mãi mới
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
                placeholder="Tìm kiếm khuyến mãi..."
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
                <option value="">Tất cả loại khuyến mãi</option>
                <option value="percent">Giảm giá %</option>
                <option value="fixed">Giảm số tiền</option>
                <option value="freegift">Tặng quà</option>
                <option value="buyxgety">Mua X tặng Y</option>
              </select>
            </div>
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Tất cả trạng thái</option>
                <option value="active">Đang diễn ra</option>
                <option value="upcoming">Sắp diễn ra</option>
                <option value="expired">Đã kết thúc</option>
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

        {/* Danh sách khuyến mãi */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : filteredPromotions.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <Gift className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">
              Không tìm thấy khuyến mãi
            </h3>
            <p className="text-gray-500">
              {searchTerm ||
              typeFilter ||
              statusFilter ||
              dateFilter.startDate ||
              dateFilter.endDate
                ? "Không có khuyến mãi nào phù hợp với bộ lọc của bạn"
                : "Chưa có khuyến mãi nào trong hệ thống."}
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
                      onClick={() => requestSort("name")}
                    >
                      Tên khuyến mãi
                      {sortConfig.key === "name" && (
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
                  {currentItems.map((promotion) => (
                    <tr
                      key={promotion.$id}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => handleViewPromotion(promotion.$id)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            {promotion.photoUrl ? (
                              <img
                                src={promotion.photoUrl}
                                alt={promotion.name}
                                className="h-10 w-10 rounded-md object-cover"
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-md bg-red-100 flex items-center justify-center">
                                <Gift className="h-6 w-6 text-red-600" />
                              </div>
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {promotion.name}
                            </div>
                            <div className="text-sm text-gray-500 truncate max-w-xs">
                              {promotion.description || "Không có mô tả"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getTypeColor(
                            promotion.type
                          )}`}
                        >
                          {getTypeName(promotion.type)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900">
                          {getValueDisplay(promotion)}
                        </div>
                        {promotion.minOrderValue > 0 && (
                          <div className="text-xs text-gray-500">
                            Đơn tối thiểu:{" "}
                            {promotion.minOrderValue.toLocaleString()} VNĐ
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {formatDate(promotion.startDate)}
                        </div>
                        <div className="text-sm text-gray-500 flex items-center">
                          <Calendar className="inline h-4 w-4 mr-1" />
                          {formatDate(promotion.endDate)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                            promotion
                          )}`}
                        >
                          {getStatusName(promotion)}
                        </span>
                      </td>
                      <td
                        className="px-6 py-4 whitespace-nowrap text-right text-sm"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={(e) => handleEditPromotion(promotion.$id, e)}
                          className="text-indigo-600 hover:text-indigo-900 mr-4"
                        >
                          <Edit className="h-5 w-5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClick(promotion.$id);
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
            {totalPages > 1 && (
              <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Hiển thị{" "}
                      <span className="font-medium">
                        {indexOfFirstItem + 1}
                      </span>{" "}
                      đến{" "}
                      <span className="font-medium">
                        {Math.min(indexOfLastItem, filteredPromotions.length)}
                      </span>{" "}
                      của{" "}
                      <span className="font-medium">
                        {filteredPromotions.length}
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
            )}
          </div>
        )}

        {/* Modal xác nhận xóa */}
        <DeleteConfirmModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={handleDeleteConfirm}
          title="Xóa khuyến mãi"
          message="Bạn có chắc chắn muốn xóa khuyến mãi này? Hành động này không thể hoàn tác."
          isDeleting={isDeleting}
        />
      </div>
    </div>
  );
};

export default PromotionManagement;
