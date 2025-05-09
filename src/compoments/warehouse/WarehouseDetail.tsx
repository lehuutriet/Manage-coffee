import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/auth/authProvider";
import { useDataCache } from "../../contexts/auth/DataCacheProvider";
import {
  Home,
  Package,
  Calendar,
  Edit,
  AlertCircle,
  Clipboard,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import toast from "react-hot-toast";

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

const WarehouseDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { getSingleItem, COLLECTION_IDS } = useAuth();
  const { setCachedData, getCachedData } = useDataCache();
  const [item, setItem] = useState<WarehouseItem | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchWarehouseDetail = async () => {
      if (!id) return;

      setLoading(true);
      try {
        // Kiểm tra cache trước
        const cachedItem = getCachedData(`warehouse_${id}`);

        if (cachedItem) {
          console.log("Sử dụng dữ liệu kho hàng từ cache");
          setItem(cachedItem);
          setLoading(false);
        }

        // Luôn tải dữ liệu mới từ server
        const data = await getSingleItem(COLLECTION_IDS.warehouse, id);
        console.log("Chi tiết mục kho hàng từ server:", data);

        // Nếu có dữ liệu mới từ server và khác với cache, cập nhật state và cache
        if (
          data &&
          (!cachedItem || JSON.stringify(data) !== JSON.stringify(cachedItem))
        ) {
          setItem(data);
          setCachedData(`warehouse_${id}`, data, 15 * 60 * 1000); // Cache 15 phút
        }

        setLoading(false);
      } catch (error) {
        console.error("Lỗi khi tải chi tiết mục kho hàng:", error);
        toast.error("Không thể tải thông tin mục kho hàng");
        setLoading(false);
      }
    };

    fetchWarehouseDetail();
  }, [id, getSingleItem, setCachedData, getCachedData]);

  const handleBackToList = () => {
    navigate("/warehouse");
  };

  const handleEdit = () => {
    navigate(`/warehouse/edit/${id}`);
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined || isNaN(amount)) {
      return "0 VNĐ";
    }
    return amount.toLocaleString("vi-VN") + " VNĐ";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <AlertCircle className="mx-auto h-16 w-16 text-red-500 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Không tìm thấy mục kho hàng
            </h2>
            <p className="text-gray-500 mb-4">
              Mục kho hàng này không tồn tại hoặc đã bị xóa.
            </p>
            <button
              onClick={handleBackToList}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Home className="w-5 h-5 mr-2" />
              Quay lại danh sách kho hàng
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex justify-between mb-6">
          <button
            onClick={handleBackToList}
            className="flex items-center text-blue-600 hover:text-blue-800 transition-colors"
          >
            <Home className="w-5 h-5 mr-2" />
            <span>Quay lại danh sách kho hàng</span>
          </button>
          <button
            onClick={handleEdit}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Edit className="w-5 h-5 mr-2" />
            <span>Chỉnh sửa</span>
          </button>
        </div>

        {/* Thông tin chi tiết */}
        <div className="bg-white shadow rounded-lg mb-6 overflow-hidden">
          <div className="border-b border-gray-200">
            <div className="px-6 py-5 flex items-center">
              <div className="flex-shrink-0">
                <Package className="h-8 w-8 text-blue-600 bg-blue-100 p-1.5 rounded-full" />
              </div>
              <div className="ml-4">
                <h2 className="text-lg font-medium text-gray-900">
                  Thông tin mục kho hàng
                </h2>
                <p className="text-sm text-gray-500">
                  Chi tiết về mục kho hàng #{item.$id.substring(0, 8)}
                </p>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Sản phẩm</h3>
                <p className="mt-1 text-lg font-semibold text-gray-900">
                  {item.productName}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500">
                  Ngày giao dịch
                </h3>
                <div className="mt-1 flex items-center">
                  <Calendar className="h-5 w-5 text-gray-400 mr-1" />
                  <span className="text-lg text-gray-900">
                    {formatDateTime(item.transactionDate)}
                  </span>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500">
                  Số lượng tồn
                </h3>
                <div className="mt-1 flex items-center">
                  <div
                    className={`text-lg font-semibold ${
                      item.quantity <= item.minStock
                        ? "text-red-600"
                        : "text-green-600"
                    }`}
                  >
                    {item.quantity}
                    {item.quantity <= item.minStock ? (
                      <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-800 text-xs rounded-full">
                        Cần nhập thêm
                      </span>
                    ) : (
                      <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full">
                        Đủ hàng
                      </span>
                    )}
                  </div>
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  Tồn kho tối thiểu: {item.minStock}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500">Giá nhập</h3>
                <p className="mt-1 text-lg font-semibold text-gray-900">
                  {formatCurrency(item.price)}
                </p>
              </div>

              <div className="md:col-span-2">
                <h3 className="text-sm font-medium text-gray-500">Ghi chú</h3>
                <div className="mt-1 p-3 bg-gray-50 rounded-lg">
                  <p className="text-gray-900">
                    {item.note || "Không có ghi chú"}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 border-t border-gray-200 pt-6">
              <h3 className="text-base font-medium text-gray-900 mb-4">
                Thống kê nhanh
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-blue-600">Giá trị hàng tồn</p>
                      <p className="text-xl font-bold text-blue-900">
                        {formatCurrency(item.quantity * item.price)}
                      </p>
                    </div>
                    <Package className="h-10 w-10 text-blue-400" />
                  </div>
                </div>

                <div className="bg-green-50 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-green-600">Trạng thái</p>
                      <p className="text-xl font-bold text-green-900">
                        {item.quantity > item.minStock * 1.5
                          ? "Dồi dào"
                          : item.quantity > item.minStock
                          ? "Đủ hàng"
                          : "Cần nhập thêm"}
                      </p>
                    </div>
                    {item.quantity > item.minStock ? (
                      <ArrowUp className="h-10 w-10 text-green-400" />
                    ) : (
                      <ArrowDown className="h-10 w-10 text-red-400" />
                    )}
                  </div>
                </div>

                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-purple-600">ID nội bộ</p>
                      <p className="text-lg font-bold text-purple-900 truncate">
                        {item.$id}
                      </p>
                    </div>
                    <Clipboard className="h-10 w-10 text-purple-400" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WarehouseDetail;
