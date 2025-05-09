import { useEffect, useState, useCallback } from "react";
import { useAuth } from "../../contexts/auth/authProvider";
import { useDataCache } from "../../contexts/auth/DataCacheProvider";
import {
  Trash2,
  Search,
  Package,
  FilterX,
  Home,
  PlusCircle,
  Edit,
  Calendar,
  ArrowUpDown,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import toast from "react-hot-toast";
import DeleteConfirmModal from "../products/DeleteConfirmModal";

interface WarehouseItem {
  $id: string;
  productName: string;
  quantity: number;
  minStock: number;
  price: number;
  transactionDate: string;
  userId: string;
  note?: string;
}

const WarehouseManagement = () => {
  const { getAllItems, COLLECTION_IDS, deleteItem } = useAuth();
  const { setCachedData, getCachedData } = useDataCache();
  const [warehouseItems, setWarehouseItems] = useState<WarehouseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState({
    startDate: "",
    endDate: "",
  });
  const [isDeleting, setIsDeleting] = useState(false);
  const [sortConfig, setSortConfig] = useState<{
    key: keyof WarehouseItem | null;
    direction: "asc" | "desc";
  }>({ key: "transactionDate", direction: "desc" });
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [stockFilter, setStockFilter] = useState<string>("");

  const navigate = useNavigate();

  // Xử lý khi click nút xóa
  const handleDeleteClick = (itemId: string) => {
    setItemToDelete(itemId);
    setIsDeleteModalOpen(true);
  };

  // Xử lý khi xác nhận xóa
  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;

    setIsDeleting(true);
    try {
      await deleteItem(COLLECTION_IDS.warehouse, itemToDelete);

      // Cập nhật state và cache
      const updatedItems = warehouseItems.filter(
        (item) => item.$id !== itemToDelete
      );
      setWarehouseItems(updatedItems);
      setCachedData("warehouseItems", updatedItems, 5 * 60 * 1000);

      toast.success("Đã xóa mục kho hàng thành công");
    } catch (error) {
      console.error("Lỗi khi xóa mục kho hàng:", error);
      toast.error("Không thể xóa mục kho hàng");
    } finally {
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
      setItemToDelete(null);
    }
  };

  // Lấy dữ liệu kho hàng sử dụng cache
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Kiểm tra cache trước
      const cachedItems = getCachedData("warehouseItems");

      if (cachedItems && refreshKey === 0) {
        console.log("Sử dụng dữ liệu kho hàng từ cache");
        setWarehouseItems(cachedItems);
        setLoading(false);

        // Vẫn tải lại dữ liệu mới từ server nhưng không chờ đợi
        refreshWarehouseItems();
      } else {
        // Nếu không có cache hoặc đang yêu cầu làm mới, tải từ server
        await refreshWarehouseItems();
      }
    } catch (error) {
      console.error("Lỗi khi tải dữ liệu kho hàng:", error);
      toast.error("Không thể tải dữ liệu kho hàng");
      setLoading(false);
    }
  }, [refreshKey]);

  // Tải lại dữ liệu kho hàng từ server
  const refreshWarehouseItems = async () => {
    try {
      const data = await getAllItems(COLLECTION_IDS.warehouse);
      console.log("Tổng số mục kho hàng lấy được:", data.length);

      // Sắp xếp theo thời gian mới nhất
      data.sort((a, b) => {
        const dateA = new Date(a.transactionDate || new Date()).getTime();
        const dateB = new Date(b.transactionDate || new Date()).getTime();
        return dateB - dateA;
      });

      setWarehouseItems(data);

      // Cập nhật cache với thời gian hết hạn 5 phút
      setCachedData("warehouseItems", data, 5 * 60 * 1000);

      setLoading(false);
    } catch (error) {
      console.error("Lỗi khi làm mới danh sách kho hàng:", error);
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

  // Xử lý chuyển hướng đến trang tạo mục kho mới
  const handleAddNewItem = () => {
    navigate("/warehouse/new");
  };

  // Xử lý chuyển hướng đến trang chỉnh sửa
  const handleEditItem = (itemId: string) => {
    navigate(`/warehouse/edit/${itemId}`);
  };

  // Sắp xếp dữ liệu
  const requestSort = (key: keyof WarehouseItem) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  // Định dạng ngày tháng
  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      return date.toLocaleString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (error) {
      console.error("Lỗi định dạng ngày tháng:", error);
      return "";
    }
  };

  // Lọc và sắp xếp mục kho hàng
  const filteredItems = warehouseItems
    .filter((item) => {
      // Lọc theo tìm kiếm
      const matchesSearch = (item.productName || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

      // Lọc theo tồn kho
      let matchesStock = true;
      if (stockFilter === "low") {
        matchesStock = (item.quantity ?? 0) <= (item.minStock ?? 0);
      } else if (stockFilter === "normal") {
        matchesStock = (item.quantity ?? 0) > (item.minStock ?? 0);
      }

      // Lọc theo ngày
      let matchesDate = true;
      if (dateFilter.startDate && item.transactionDate) {
        const itemDate = new Date(item.transactionDate);
        const startDate = new Date(dateFilter.startDate);
        matchesDate = itemDate >= startDate;
      }
      if (dateFilter.endDate && matchesDate && item.transactionDate) {
        const itemDate = new Date(item.transactionDate);
        const endDate = new Date(dateFilter.endDate);
        endDate.setHours(23, 59, 59, 999);
        matchesDate = itemDate <= endDate;
      }

      return matchesSearch && matchesStock && matchesDate;
    })
    .sort((a, b) => {
      // Sắp xếp kết quả
      if (!sortConfig.key) return 0;

      if (sortConfig.key === "transactionDate") {
        const dateA = new Date(a.transactionDate || new Date()).getTime();
        const dateB = new Date(b.transactionDate || new Date()).getTime();
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
        ? (valueA as number) < (valueB as number)
          ? -1
          : 1
        : (valueA as number) > (valueB as number)
        ? -1
        : 1;
    });

  // Xóa bộ lọc
  const clearFilters = () => {
    setSearchTerm("");
    setDateFilter({ startDate: "", endDate: "" });
    setStockFilter("");
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
              Quản lý kho hàng
            </h1>
            <p className="text-gray-600 mt-1">
              Quản lý tồn kho và nhập xuất hàng cho cửa hàng AYAI-Coffee
            </p>
          </div>
          <div className="flex space-x-4">
            <button
              onClick={handleRefresh}
              className="flex items-center px-4 py-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
            >
              <ArrowUpDown className="w-5 h-5 mr-2" />
              Làm mới
            </button>
            <button
              onClick={handleAddNewItem}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <PlusCircle className="w-5 h-5 mr-2" />
              Thêm mục kho mới
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
                placeholder="Tìm kiếm sản phẩm..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <select
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Tất cả tồn kho</option>
                <option value="low">Sắp hết hàng</option>
                <option value="normal">Tồn kho bình thường</option>
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

        {/* Danh sách kho hàng */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <Package className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">
              Không tìm thấy mục kho hàng
            </h3>
            <p className="text-gray-500">
              {searchTerm ||
              stockFilter ||
              dateFilter.startDate ||
              dateFilter.endDate
                ? "Không có mục kho hàng nào phù hợp với bộ lọc của bạn"
                : "Chưa có mục kho hàng nào trong hệ thống."}
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
                      onClick={() => requestSort("productName")}
                    >
                      Tên sản phẩm
                      {sortConfig.key === "productName" && (
                        <span>
                          {sortConfig.direction === "asc" ? " ↑" : " ↓"}
                        </span>
                      )}
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => requestSort("quantity")}
                    >
                      Số lượng tồn
                      {sortConfig.key === "quantity" && (
                        <span>
                          {sortConfig.direction === "asc" ? " ↑" : " ↓"}
                        </span>
                      )}
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => requestSort("price")}
                    >
                      Giá
                      {sortConfig.key === "price" && (
                        <span>
                          {sortConfig.direction === "asc" ? " ↑" : " ↓"}
                        </span>
                      )}
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => requestSort("transactionDate")}
                    >
                      Ngày cập nhật
                      {sortConfig.key === "transactionDate" && (
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
                  {filteredItems.map((item) => (
                    <tr
                      key={item.$id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center bg-blue-100 rounded-md">
                            <Package className="h-6 w-6 text-blue-600" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {item.productName || "Không có tên"}
                            </div>
                            <div className="text-sm text-gray-500">
                              {item.note || "Không có ghi chú"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div
                          className={`text-sm font-medium ${
                            (item.quantity ?? 0) <= (item.minStock ?? 0)
                              ? "text-red-600"
                              : "text-gray-900"
                          }`}
                        >
                          {item.quantity ?? 0}{" "}
                          {(item.quantity ?? 0) <= (item.minStock ?? 0) &&
                            "(Cần nhập thêm)"}
                        </div>
                        <div className="text-sm text-gray-500">
                          Min: {item.minStock ?? 0}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {(item.price ?? 0).toLocaleString()} VNĐ
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {formatDate(item.transactionDate || "")}
                        </div>
                        <div className="text-sm text-gray-500">
                          <Calendar className="inline h-4 w-4 mr-1" />
                          {item.transactionDate
                            ? new Date(item.transactionDate).toLocaleDateString(
                                "vi-VN"
                              )
                            : "Không có ngày"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <button
                          onClick={() => handleEditItem(item.$id)}
                          className="text-indigo-600 hover:text-indigo-900 mr-4"
                        >
                          <Edit className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(item.$id)}
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
          </div>
        )}

        {/* Modal xác nhận xóa */}
        <DeleteConfirmModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={handleDeleteConfirm}
          title="Xóa mục kho hàng"
          message="Bạn có chắc chắn muốn xóa mục kho hàng này? Hành động này không thể hoàn tác."
          isDeleting={isDeleting}
        />
      </div>
    </div>
  );
};

export default WarehouseManagement;
