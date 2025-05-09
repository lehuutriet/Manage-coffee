import { useEffect, useState, useCallback } from "react";
import { useAuth } from "../../contexts/auth/authProvider";
import { useDataCache } from "../../contexts/auth/DataCacheProvider";
import {
  Trash2,
  Search,
  ShoppingBag,
  FilterX,
  Home,
  FileText,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import toast from "react-hot-toast";
import DeleteConfirmModal from "../products/DeleteConfirmModal";

interface Order {
  $id: string;
  status: string;
  total: number;
  subtotal: number;
  discount: number;
  date: string;
  customerName: string;
  customerPhone: string;
  table: string;
  wasPaid: boolean;
  note?: string;
  userId?: string;
  order: string[];
  couponCode?: string;
  couponDiscount?: number;
  promotionName?: string;
  promotionDiscount?: number;
}

const OrdersManagement = () => {
  const { getAllItems, COLLECTION_IDS, deleteItem } = useAuth();
  const { setCachedData, getCachedData } = useDataCache();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Order | null;
    direction: "asc" | "desc";
  }>({ key: "date", direction: "desc" });
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState({
    startDate: "",
    endDate: "",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [refreshKey, setRefreshKey] = useState(0); // Để kích hoạt refresh

  const navigate = useNavigate();

  // Xử lý khi click nút xóa
  const handleDeleteClick = (orderId: string) => {
    setOrderToDelete(orderId);
    setIsDeleteModalOpen(true);
  };

  // Xử lý khi xác nhận xóa
  const handleDeleteConfirm = async () => {
    if (!orderToDelete) return;

    setIsDeleting(true);
    try {
      await deleteItem(COLLECTION_IDS.orders, orderToDelete);

      // Cập nhật state và cache
      const updatedOrders = orders.filter(
        (order) => order.$id !== orderToDelete
      );
      setOrders(updatedOrders);
      setCachedData("ordersList", updatedOrders, 5 * 60 * 1000);

      toast.success("Đã xóa đơn hàng thành công");
    } catch (error) {
      console.error("Lỗi khi xóa đơn hàng:", error);
      toast.error("Không thể xóa đơn hàng");
    } finally {
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
      setOrderToDelete(null);
    }
  };

  // Lấy dữ liệu đơn hàng sử dụng cache
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Kiểm tra cache trước
      const cachedOrders = getCachedData("ordersList");

      if (cachedOrders && refreshKey === 0) {
        console.log("Sử dụng dữ liệu orders từ cache");
        setOrders(cachedOrders);
        setLoading(false);

        // Vẫn tải lại dữ liệu mới từ server nhưng không chờ đợi
        refreshOrders();
      } else {
        // Nếu không có cache hoặc đang yêu cầu làm mới, tải từ server
        await refreshOrders();
      }
    } catch (error) {
      console.error("Lỗi khi tải dữ liệu:", error);
      toast.error("Không thể tải dữ liệu đơn hàng");
      setLoading(false);
    }
  }, [refreshKey]);

  // Tải lại dữ liệu đơn hàng từ server
  const refreshOrders = async () => {
    try {
      const data = await getAllItems(COLLECTION_IDS.orders);
      console.log("Tổng số đơn hàng lấy được:", data.length);

      // Sắp xếp theo thời gian mới nhất
      data.sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return dateB - dateA;
      });

      setOrders(data);

      // Cập nhật cache với thời gian hết hạn 5 phút
      setCachedData("ordersList", data, 5 * 60 * 1000);

      setLoading(false);
    } catch (error) {
      console.error("Lỗi khi làm mới danh sách đơn hàng:", error);
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
  const requestSort = (key: keyof Order) => {
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

  // Xử lý chuyển hướng đến trang chi tiết đơn hàng
  const handleViewOrder = (orderId: string) => {
    // Tìm đơn hàng cần xem
    const orderToView = orders.find((order) => order.$id === orderId);

    if (orderToView) {
      // Cache đơn hàng này để truy cập nhanh hơn trong trang chi tiết
      setCachedData(`order_${orderId}`, orderToView, 15 * 60 * 1000); // Cache 15 phút
    }

    navigate(`/orders/${orderId}`);
  };

  // Lọc và sắp xếp đơn hàng
  const filteredOrders = orders
    .filter((order) => {
      // Lọc theo tìm kiếm
      const matchesSearch =
        order.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customerPhone?.includes(searchTerm) ||
        order.$id.includes(searchTerm);

      // Lọc theo trạng thái
      const matchesStatus = statusFilter ? order.status === statusFilter : true;

      // Lọc theo ngày
      let matchesDate = true;
      if (dateFilter.startDate) {
        const orderDate = new Date(order.date);
        const startDate = new Date(dateFilter.startDate);
        matchesDate = orderDate >= startDate;
      }
      if (dateFilter.endDate && matchesDate) {
        const orderDate = new Date(order.date);
        const endDate = new Date(dateFilter.endDate);
        endDate.setHours(23, 59, 59, 999);
        matchesDate = orderDate <= endDate;
      }

      return matchesSearch && matchesStatus && matchesDate;
    })
    .sort((a, b) => {
      // Sắp xếp kết quả
      if (!sortConfig.key) return 0;

      if (sortConfig.key === "date") {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
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
    setStatusFilter("");
    setDateFilter({ startDate: "", endDate: "" });
  };

  // Lấy màu cho trạng thái
  const getStatusColor = (status: string) => {
    switch (status) {
      case "Completed":
        return "bg-green-100 text-green-800";
      case "Processing":
        return "bg-blue-100 text-blue-800";
      case "Cancelled":
        return "bg-red-100 text-red-800";
      case "Pending":
        return "bg-yellow-100 text-yellow-800";
      case "transfer":
        return "bg-purple-100 text-purple-800";
      case "cash":
        return "bg-emerald-100 text-emerald-800";
      case "returned":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Phân trang
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredOrders.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);

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
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Quản lý đơn hàng
            </h1>
            <p className="text-gray-600 mt-1">
              Quản lý tất cả đơn hàng của cửa hàng AYAI-Coffee
            </p>
          </div>
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
                placeholder="Tìm kiếm đơn hàng..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Tất cả trạng thái</option>
                <option value="Pending">Chờ xác nhận</option>
                <option value="Processing">Đang xử lý</option>
                <option value="Completed">Hoàn thành</option>
                <option value="Cancelled">Đã hủy</option>
                <option value="transfer">Chuyển khoản</option>
                <option value="cash">Tiền mặt</option>
                <option value="returned">Đã hoàn trả</option>
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
              <input
                type="date"
                value={dateFilter.endDate}
                onChange={(e) =>
                  setDateFilter({ ...dateFilter, endDate: e.target.value })
                }
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Đến ngày"
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

        {/* Danh sách đơn hàng */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <ShoppingBag className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">
              Không tìm thấy đơn hàng
            </h3>
            <p className="text-gray-500">
              {searchTerm ||
              statusFilter ||
              dateFilter.startDate ||
              dateFilter.endDate
                ? "Không có đơn hàng nào phù hợp với bộ lọc của bạn"
                : "Chưa có đơn hàng nào trong hệ thống."}
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
                      onClick={() => requestSort("$id")}
                    >
                      Mã đơn hàng
                      {sortConfig.key === "$id" && (
                        <span>
                          {sortConfig.direction === "asc" ? " ↑" : " ↓"}
                        </span>
                      )}
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => requestSort("date")}
                    >
                      Ngày tạo
                      {sortConfig.key === "date" && (
                        <span>
                          {sortConfig.direction === "asc" ? " ↑" : " ↓"}
                        </span>
                      )}
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => requestSort("customerName")}
                    >
                      Khách hàng
                      {sortConfig.key === "customerName" && (
                        <span>
                          {sortConfig.direction === "asc" ? " ↑" : " ↓"}
                        </span>
                      )}
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => requestSort("total")}
                    >
                      Tổng tiền
                      {sortConfig.key === "total" && (
                        <span>
                          {sortConfig.direction === "asc" ? " ↑" : " ↓"}
                        </span>
                      )}
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => requestSort("status")}
                    >
                      Trạng thái
                      {sortConfig.key === "status" && (
                        <span>
                          {sortConfig.direction === "asc" ? " ↑" : " ↓"}
                        </span>
                      )}
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
                  {currentItems.map((order) => (
                    <tr
                      key={order.$id}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => handleViewOrder(order.$id)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center bg-blue-100 rounded-md">
                            <FileText className="h-6 w-6 text-blue-600" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              #{order.$id.substring(0, 8)}
                            </div>
                            <div className="text-sm text-gray-500">
                              {order.table ? `Bàn: ${order.table}` : "Mang đi"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {formatDate(order.date)}
                        </div>
                        <div className="text-sm text-gray-500">
                          <Calendar className="inline h-4 w-4 mr-1" />
                          {new Date(order.date).toLocaleDateString("vi-VN")}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {order.customerName || "Khách vãng lai"}
                        </div>
                        <div className="text-sm text-gray-500">
                          {order.customerPhone || "Không có SĐT"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900">
                          {order.total?.toLocaleString()} VNĐ
                        </div>
                        {order.discount > 0 && (
                          <div className="text-sm text-green-600">
                            Giảm: {order.discount?.toLocaleString()} VNĐ
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                            order.status
                          )}`}
                        >
                          {order.status === "Completed"
                            ? "Hoàn thành"
                            : order.status === "Processing"
                            ? "Đang xử lý"
                            : order.status === "Cancelled"
                            ? "Đã hủy"
                            : order.status === "Pending"
                            ? "Chờ xác nhận"
                            : order.status === "transfer"
                            ? "Chuyển khoản"
                            : order.status === "cash"
                            ? "Tiền mặt"
                            : order.status === "returned"
                            ? "Đã hoàn trả"
                            : order.status}
                        </span>
                      </td>
                      <td
                        className="px-6 py-4 whitespace-nowrap text-right text-sm"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClick(order.$id);
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
                      {Math.min(indexOfLastItem, filteredOrders.length)}
                    </span>{" "}
                    của{" "}
                    <span className="font-medium">{filteredOrders.length}</span>{" "}
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
          title="Xóa đơn hàng"
          message="Bạn có chắc chắn muốn xóa đơn hàng này? Hành động này không thể hoàn tác."
          isDeleting={isDeleting}
        />
      </div>
    </div>
  );
};

export default OrdersManagement;
