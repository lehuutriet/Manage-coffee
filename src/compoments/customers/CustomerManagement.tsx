import { useEffect, useState, useCallback } from "react";
import { useAuth } from "../../contexts/auth/authProvider";
import { useDataCache } from "../../contexts/auth/DataCacheProvider";
import {
  Trash2,
  Search,
  Users,
  FilterX,
  Home,
  User,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Edit,
  UserPlus,
  Phone,
  Mail,
  DollarSign,
  Clock,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import toast from "react-hot-toast";
import DeleteConfirmModal from "../products/DeleteConfirmModal";

interface Customer {
  $id: string;
  userId: string;
  name: string;
  phone: string;
  email: string;
  notes: string;
  joinDate: string;
  points: number;
  totalSpent: number;
  lastVisit: string;
}

const CustomerManagement = () => {
  const { getAllItems, COLLECTION_IDS, deleteItem } = useAuth();
  const { setCachedData, getCachedData } = useDataCache();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Customer | null;
    direction: "asc" | "desc";
  }>({ key: "lastVisit", direction: "desc" });
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState({
    startDate: "",
    endDate: "",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [refreshKey, setRefreshKey] = useState(0);

  const navigate = useNavigate();

  // Xử lý khi click nút xóa
  const handleDeleteClick = (customerId: string) => {
    setCustomerToDelete(customerId);
    setIsDeleteModalOpen(true);
  };

  // Xử lý khi xác nhận xóa
  const handleDeleteConfirm = async () => {
    if (!customerToDelete) return;

    setIsDeleting(true);
    try {
      await deleteItem(COLLECTION_IDS.customers, customerToDelete);

      // Cập nhật state và cache
      const updatedCustomers = customers.filter(
        (customer) => customer.$id !== customerToDelete
      );
      setCustomers(updatedCustomers);
      setCachedData("customersList", updatedCustomers, 5 * 60 * 1000);

      toast.success("Đã xóa khách hàng thành công");
    } catch (error) {
      console.error("Lỗi khi xóa khách hàng:", error);
      toast.error("Không thể xóa khách hàng");
    } finally {
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
      setCustomerToDelete(null);
    }
  };

  // Lấy dữ liệu khách hàng sử dụng cache
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Kiểm tra cache trước
      const cachedCustomers = getCachedData("customersList");

      if (cachedCustomers && refreshKey === 0) {
        console.log("Sử dụng dữ liệu customers từ cache");
        setCustomers(cachedCustomers);
        setLoading(false);

        // Vẫn tải lại dữ liệu mới từ server nhưng không chờ đợi
        refreshCustomers();
      } else {
        // Nếu không có cache hoặc đang yêu cầu làm mới, tải từ server
        await refreshCustomers();
      }
    } catch (error) {
      console.error("Lỗi khi tải dữ liệu:", error);
      toast.error("Không thể tải dữ liệu khách hàng");
      setLoading(false);
    }
  }, [refreshKey]);

  // Tải lại dữ liệu khách hàng từ server
  const refreshCustomers = async () => {
    try {
      const data = await getAllItems(COLLECTION_IDS.customers);
      console.log("Tổng số khách hàng lấy được:", data.length);

      // Sắp xếp theo thời gian gần đây nhất
      data.sort((a, b) => {
        const dateA = new Date(a.lastVisit || a.joinDate).getTime();
        const dateB = new Date(b.lastVisit || b.joinDate).getTime();
        return dateB - dateA;
      });

      setCustomers(data);

      // Cập nhật cache với thời gian hết hạn 5 phút
      setCachedData("customersList", data, 5 * 60 * 1000);

      setLoading(false);
    } catch (error) {
      console.error("Lỗi khi làm mới danh sách khách hàng:", error);
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
  const requestSort = (key: keyof Customer) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  // Định dạng ngày tháng
  const formatDate = (dateString: string) => {
    if (!dateString) return "Chưa cập nhật";
    const date = new Date(dateString);
    return date.toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Xử lý chuyển hướng đến trang chi tiết khách hàng
  const handleViewCustomer = (customerId: string) => {
    // Tìm khách hàng cần xem
    const customerToView = customers.find(
      (customer) => customer.$id === customerId
    );

    if (customerToView) {
      // Cache khách hàng này để truy cập nhanh hơn trong trang chi tiết
      setCachedData(`customer_${customerId}`, customerToView, 15 * 60 * 1000); // Cache 15 phút
    }

    navigate(`/customers/${customerId}`);
  };

  // Xử lý chuyển hướng đến trang chỉnh sửa khách hàng
  const handleEditCustomer = (customerId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    navigate(`/customers/edit/${customerId}`);
  };

  // Xử lý chuyển hướng đến trang thêm khách hàng mới
  const handleAddNewCustomer = () => {
    navigate("/customers/new");
  };

  // Lọc và sắp xếp khách hàng
  const filteredCustomers = customers
    .filter((customer) => {
      // Lọc theo tìm kiếm
      const matchesSearch =
        customer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.phone?.includes(searchTerm) ||
        customer.email?.toLowerCase().includes(searchTerm.toLowerCase());

      // Lọc theo ngày
      let matchesDate = true;
      if (dateFilter.startDate) {
        const customerDate = new Date(customer.joinDate);
        const startDate = new Date(dateFilter.startDate);
        matchesDate = customerDate >= startDate;
      }
      if (dateFilter.endDate && matchesDate) {
        const customerDate = new Date(customer.joinDate);
        const endDate = new Date(dateFilter.endDate);
        endDate.setHours(23, 59, 59, 999);
        matchesDate = customerDate <= endDate;
      }

      return matchesSearch && matchesDate;
    })
    .sort((a, b) => {
      // Sắp xếp kết quả
      if (!sortConfig.key) return 0;

      if (sortConfig.key === "joinDate" || sortConfig.key === "lastVisit") {
        const dateA = new Date(a[sortConfig.key] || "").getTime() || 0;
        const dateB = new Date(b[sortConfig.key] || "").getTime() || 0;
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
        ? (valueA as any) < (valueB as any)
          ? -1
          : 1
        : (valueA as any) > (valueB as any)
        ? -1
        : 1;
    });

  // Xóa bộ lọc
  const clearFilters = () => {
    setSearchTerm("");
    setDateFilter({ startDate: "", endDate: "" });
  };

  // Phân trang
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredCustomers.slice(
    indexOfFirstItem,
    indexOfLastItem
  );
  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);

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
              Quản lý khách hàng
            </h1>
            <p className="text-gray-600 mt-1">
              Quản lý tất cả khách hàng của cửa hàng AYAI-Coffee
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
              onClick={handleAddNewCustomer}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <UserPlus className="w-5 h-5 mr-2" />
              Thêm khách hàng mới
            </button>
          </div>
        </div>

        {/* Bộ lọc và tìm kiếm */}
        <div className="bg-white p-4 rounded-lg shadow-md mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Tìm kiếm khách hàng..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
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

        {/* Danh sách khách hàng */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <Users className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">
              Không tìm thấy khách hàng
            </h3>
            <p className="text-gray-500">
              {searchTerm || dateFilter.startDate || dateFilter.endDate
                ? "Không có khách hàng nào phù hợp với bộ lọc của bạn"
                : "Chưa có khách hàng nào trong hệ thống."}
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
                      Khách hàng
                      {sortConfig.key === "name" && (
                        <span>
                          {sortConfig.direction === "asc" ? " ↑" : " ↓"}
                        </span>
                      )}
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => requestSort("joinDate")}
                    >
                      Ngày tham gia
                      {sortConfig.key === "joinDate" && (
                        <span>
                          {sortConfig.direction === "asc" ? " ↑" : " ↓"}
                        </span>
                      )}
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => requestSort("totalSpent")}
                    >
                      Chi tiêu
                      {sortConfig.key === "totalSpent" && (
                        <span>
                          {sortConfig.direction === "asc" ? " ↑" : " ↓"}
                        </span>
                      )}
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => requestSort("points")}
                    >
                      Điểm tích lũy
                      {sortConfig.key === "points" && (
                        <span>
                          {sortConfig.direction === "asc" ? " ↑" : " ↓"}
                        </span>
                      )}
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => requestSort("lastVisit")}
                    >
                      Lần cuối ghé thăm
                      {sortConfig.key === "lastVisit" && (
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
                  {currentItems.map((customer) => (
                    <tr
                      key={customer.$id}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => handleViewCustomer(customer.$id)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center bg-purple-100 rounded-full">
                            <User className="h-6 w-6 text-purple-600" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {customer.name}
                            </div>
                            <div className="flex flex-col text-xs text-gray-500">
                              <span className="flex items-center">
                                <Phone className="h-3 w-3 mr-1" />
                                {customer.phone || "Chưa cập nhật"}
                              </span>
                              <span className="flex items-center">
                                <Mail className="h-3 w-3 mr-1" />
                                {customer.email || "Chưa cập nhật"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {formatDate(customer.joinDate)}
                        </div>
                        <div className="text-xs text-gray-500">
                          <Calendar className="inline h-3 w-3 mr-1" />
                          {new Date(customer.joinDate).toLocaleDateString(
                            "vi-VN"
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm font-semibold text-gray-900">
                          <DollarSign className="h-4 w-4 text-green-500 mr-1" />
                          {customer.totalSpent?.toLocaleString() || 0} VNĐ
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {customer.points || 0} điểm
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-900">
                          <Clock className="h-4 w-4 text-gray-400 mr-1" />
                          {formatDate(customer.lastVisit)}
                        </div>
                      </td>
                      <td
                        className="px-6 py-4 whitespace-nowrap text-right text-sm"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditCustomer(customer.$id, e);
                          }}
                          className="text-indigo-600 hover:text-indigo-900 mr-4"
                        >
                          <Edit className="h-5 w-5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClick(customer.$id);
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
                      {Math.min(indexOfLastItem, filteredCustomers.length)}
                    </span>{" "}
                    của{" "}
                    <span className="font-medium">
                      {filteredCustomers.length}
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
          title="Xóa khách hàng"
          message="Bạn có chắc chắn muốn xóa khách hàng này? Hành động này không thể hoàn tác."
          isDeleting={isDeleting}
        />
      </div>
    </div>
  );
};

export default CustomerManagement;
