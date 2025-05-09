import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/auth/authProvider";
import { useDataCache } from "../../contexts/auth/DataCacheProvider";
import {
  Home,
  Calendar,
  DollarSign,
  User,
  Clock,
  Phone,
  Mail,
  FileText,
  Edit,
  ArrowLeft,
  Clipboard,
  Award,
  History,
  ShoppingBag,
} from "lucide-react";
import toast from "react-hot-toast";

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

const CustomerDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { getSingleItem, COLLECTION_IDS, getAllItems } = useAuth();
  const { getCachedData, setCachedData } = useDataCache();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCustomerDetail = async () => {
      if (!id) return;

      setLoading(true);
      try {
        // Kiểm tra cache trước
        const cachedCustomer = getCachedData(`customer_${id}`);

        if (cachedCustomer) {
          console.log("Sử dụng dữ liệu customer từ cache");
          setCustomer(cachedCustomer);
          setLoading(false);
        }

        // Luôn tải dữ liệu mới từ server
        const data = await getSingleItem(COLLECTION_IDS.customers, id);
        console.log("Chi tiết khách hàng từ server:", data);

        // Nếu có dữ liệu mới từ server và khác với cache, cập nhật state và cache
        if (
          data &&
          (!cachedCustomer ||
            JSON.stringify(data) !== JSON.stringify(cachedCustomer))
        ) {
          setCustomer(data);
          setCachedData(`customer_${id}`, data, 15 * 60 * 1000); // Cache 15 phút
        }

        setLoading(false);
      } catch (error) {
        console.error("Lỗi khi tải chi tiết khách hàng:", error);
        toast.error("Không thể tải thông tin khách hàng");
        setLoading(false);
      }
    };

    fetchCustomerDetail();
  }, [id, getSingleItem]);

  useEffect(() => {
    const fetchRecentOrders = async () => {
      if (!id || !customer) return;

      setLoadingOrders(true);
      try {
        // Tìm đơn hàng của khách hàng này
        const orders = await getAllItems(COLLECTION_IDS.orders);

        // Lọc theo tên hoặc số điện thoại khách hàng
        const customerOrders = orders.filter(
          (order) =>
            (order.customerPhone &&
              customer.phone &&
              order.customerPhone === customer.phone) ||
            (order.customerName &&
              customer.name &&
              order.customerName.toLowerCase() === customer.name.toLowerCase())
        );

        // Sắp xếp theo thời gian mới nhất
        customerOrders.sort((a, b) => {
          const dateA = new Date(a.date).getTime();
          const dateB = new Date(b.date).getTime();
          return dateB - dateA;
        });

        // Lấy 5 đơn hàng gần nhất
        setRecentOrders(customerOrders.slice(0, 5));
        setLoadingOrders(false);
      } catch (error) {
        console.error("Lỗi khi tải lịch sử đơn hàng:", error);
        setLoadingOrders(false);
      }
    };

    fetchRecentOrders();
  }, [customer, id]);

  const handleBackToList = () => {
    navigate("/customers");
  };

  const handleEditCustomer = () => {
    navigate(`/customers/edit/${id}`);
  };

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

  if (!customer) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <User className="mx-auto h-16 w-16 text-red-500 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Không tìm thấy khách hàng
            </h2>
            <p className="text-gray-500 mb-4">
              Khách hàng này không tồn tại hoặc đã bị xóa.
            </p>
            <button
              onClick={handleBackToList}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Home className="w-5 h-5 mr-2" />
              Quay lại danh sách khách hàng
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
            <ArrowLeft className="w-5 h-5 mr-2" />
            <span>Quay lại danh sách khách hàng</span>
          </button>
          <button
            onClick={handleEditCustomer}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Edit className="w-5 h-5 mr-2" />
            <span>Chỉnh sửa</span>
          </button>
        </div>

        {/* Thông tin chính */}
        <div className="bg-white shadow rounded-lg mb-6 overflow-hidden">
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-12">
            <div className="flex flex-col md:flex-row items-center">
              <div className="h-24 w-24 rounded-full bg-white flex items-center justify-center mb-4 md:mb-0 md:mr-6">
                <User className="h-14 w-14 text-purple-600" />
              </div>
              <div className="text-white text-center md:text-left">
                <h1 className="text-2xl font-bold">{customer.name}</h1>
                <div className="mt-2 flex flex-col md:flex-row md:items-center space-y-1 md:space-y-0 md:space-x-4">
                  <span className="flex items-center justify-center md:justify-start">
                    <Phone className="h-4 w-4 mr-1" />
                    {customer.phone || "Chưa cập nhật"}
                  </span>
                  <span className="flex items-center justify-center md:justify-start">
                    <Mail className="h-4 w-4 mr-1" />
                    {customer.email || "Chưa cập nhật"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-0 md:divide-x">
            <div className="p-6 text-center">
              <p className="text-gray-500 text-sm mb-1">Tham gia từ</p>
              <div className="flex items-center justify-center">
                <Calendar className="h-5 w-5 text-purple-500 mr-2" />
                <p className="text-lg font-medium text-gray-900">
                  {formatDate(customer.joinDate)}
                </p>
              </div>
            </div>
            <div className="p-6 text-center">
              <p className="text-gray-500 text-sm mb-1">Tổng chi tiêu</p>
              <div className="flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-green-500 mr-2" />
                <p className="text-lg font-medium text-gray-900">
                  {formatCurrency(customer.totalSpent)}
                </p>
              </div>
            </div>
            <div className="p-6 text-center">
              <p className="text-gray-500 text-sm mb-1">Điểm tích lũy</p>
              <div className="flex items-center justify-center">
                <Award className="h-5 w-5 text-amber-500 mr-2" />
                <p className="text-lg font-medium text-gray-900">
                  {customer.points || 0} điểm
                </p>
              </div>
            </div>
          </div>

          <div className="px-6 py-4 bg-gray-50">
            <div className="flex items-center mb-2">
              <Clock className="h-5 w-5 text-gray-500 mr-2" />
              <p className="text-gray-600">
                Lần cuối ghé thăm:{" "}
                <span className="font-medium">
                  {formatDate(customer.lastVisit)}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Ghi chú */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="border-b border-gray-200">
            <div className="px-6 py-5 flex items-center">
              <div className="flex-shrink-0">
                <Clipboard className="h-8 w-8 text-gray-600 bg-gray-100 p-1.5 rounded-full" />
              </div>
              <div className="ml-4">
                <h2 className="text-lg font-medium text-gray-900">
                  Ghi chú về khách hàng
                </h2>
              </div>
            </div>
          </div>
          <div className="px-6 py-5">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-gray-700">
                {customer.notes || "Không có ghi chú nào về khách hàng này."}
              </p>
            </div>
          </div>
        </div>

        {/* Lịch sử đơn hàng gần đây */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="border-b border-gray-200">
            <div className="px-6 py-5 flex items-center">
              <div className="flex-shrink-0">
                <History className="h-8 w-8 text-blue-600 bg-blue-100 p-1.5 rounded-full" />
              </div>
              <div className="ml-4">
                <h2 className="text-lg font-medium text-gray-900">
                  Lịch sử đơn hàng gần đây
                </h2>
              </div>
            </div>
          </div>
          <div className="px-6 py-5">
            {loadingOrders ? (
              <div className="flex justify-center py-6">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : recentOrders.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th
                        scope="col"
                        className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Mã đơn hàng
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Ngày đặt
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Tổng tiền
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Trạng thái
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {recentOrders.map((order) => (
                      <tr
                        key={order.$id}
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => navigate(`/orders/${order.$id}`)}
                      >
                        <td className="px-3 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <FileText className="h-4 w-4 text-blue-500 mr-2" />
                            <div className="text-sm font-medium text-gray-900">
                              #{order.$id.substring(0, 8)}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {formatDate(order.date)}
                          </div>
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-right">
                          <div className="text-sm font-medium text-gray-900">
                            {formatCurrency(order.total)}
                          </div>
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-right">
                          <span
                            className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              order.status === "Completed"
                                ? "bg-green-100 text-green-800"
                                : order.status === "Processing"
                                ? "bg-blue-100 text-blue-800"
                                : order.status === "Cancelled"
                                ? "bg-red-100 text-red-800"
                                : order.status === "Pending"
                                ? "bg-yellow-100 text-yellow-800"
                                : order.status === "transfer"
                                ? "bg-purple-100 text-purple-800"
                                : order.status === "cash"
                                ? "bg-emerald-100 text-emerald-800"
                                : order.status === "returned"
                                ? "bg-orange-100 text-orange-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-6 text-center">
                <ShoppingBag className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">
                  Khách hàng này chưa có đơn hàng nào.
                </p>
              </div>
            )}

            {recentOrders.length > 0 && (
              <div className="mt-4 text-center">
                <button
                  onClick={() =>
                    navigate("/orders", {
                      state: { customerFilter: customer.name },
                    })
                  }
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  Xem tất cả đơn hàng
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerDetail;
