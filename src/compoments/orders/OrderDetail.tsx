import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/auth/authProvider";
import { useDataCache } from "../../contexts/auth/DataCacheProvider";
import {
  Home,
  Calendar,
  DollarSign,
  User,
  Clipboard,
  Coffee,
  Tag,
  Truck,
  AlertCircle,
  CheckSquare,
  Square,
} from "lucide-react";
import toast from "react-hot-toast";

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
  location: string;
  wasPaid: boolean;
  note?: string;
  userId?: string;
  order: string[];
  couponCode?: string;
  couponDiscount?: number;
  promotionName?: string;
  promotionDiscount?: number;
  returnReason?: string;
  returnDate?: string;
  output?: string[];
  paymentMethod?: string;
}

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  count?: number;
  options?: { name: string; price: number }[];
}

const OrderDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { getSingleItem, COLLECTION_IDS, updateItem, createItem } = useAuth();
  const { getCachedData, setCachedData, invalidateCache } = useDataCache();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const navigate = useNavigate();
  const receiptRef = useRef<HTMLDivElement>(null);

  // State cho modal hoàn trả
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [returnReason, setReturnReason] = useState("");
  const [selectedItems, setSelectedItems] = useState<{
    [key: string]: boolean;
  }>({});
  const [, setReturnAmount] = useState(0);
  const [currentReturnAmount, setCurrentReturnAmount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  // Debug thông tin sản phẩm chi tiết
  useEffect(() => {
    if (orderItems.length > 0) {
      console.log("--------- Chi tiết từng sản phẩm ----------");
      let debugTotal = 0;
      orderItems.forEach((item) => {
        console.log(`Tên: ${item.name}`);
        console.log(`Giá: ${item.price} (${typeof item.price})`);
        console.log(`Số lượng: ${item.quantity} (${typeof item.quantity})`);

        const itemTotal =
          Number(item.price) *
          (Number(item.quantity) > 0 ? Number(item.quantity) : 1);
        console.log(`Thành tiền: ${itemTotal}`);
        debugTotal += itemTotal;
        console.log("--------------------------------");
      });
      console.log(`Tổng cộng: ${debugTotal}`);
    }
  }, [orderItems]);

  useEffect(() => {
    const fetchOrderDetail = async () => {
      if (!id) return;

      setLoading(true);
      try {
        // Kiểm tra cache trước
        const cachedOrder = getCachedData(`order_${id}`);

        if (cachedOrder) {
          console.log("Sử dụng dữ liệu order từ cache");
          setOrder(cachedOrder);
          if (cachedOrder.order) {
            parseOrderItems(cachedOrder.order);
          }
          setLoading(false);
        }

        // Luôn tải dữ liệu mới từ server
        const data = await getSingleItem(COLLECTION_IDS.orders, id);
        console.log("Chi tiết đơn hàng từ server:", data);

        // Nếu có dữ liệu mới từ server và khác với cache, cập nhật state và cache
        if (
          data &&
          (!cachedOrder || JSON.stringify(data) !== JSON.stringify(cachedOrder))
        ) {
          setOrder(data);
          setCachedData(`order_${id}`, data, 15 * 60 * 1000); // Cache 15 phút

          if (data.order) {
            parseOrderItems(data.order);
          } else {
            console.error("Không có dữ liệu đơn hàng hoặc dữ liệu sản phẩm");
            setOrderItems([]);
          }
        }

        setLoading(false);
      } catch (error) {
        console.error("Lỗi khi tải chi tiết đơn hàng:", error);
        toast.error("Không thể tải thông tin đơn hàng");
        setLoading(false);
      }
    };

    fetchOrderDetail();
  }, [id, getSingleItem]);

  // Theo dõi khi selectedItems thay đổi
  useEffect(() => {
    if (order) {
      setReturnAmount(calculateReturnAmount());
    }
  }, [selectedItems, order]);

  const parseOrderItems = (orderData: string[]) => {
    try {
      if (!orderData || !Array.isArray(orderData)) {
        console.error("orderData không phải mảng:", orderData);
        setOrderItems([]);
        return;
      }

      console.log("Dữ liệu order gốc:", orderData);

      const parsedItems: OrderItem[] = orderData.map((item, index) => {
        try {
          const parsed = JSON.parse(item);
          console.log(`Item ${index}:`, parsed);

          // Kiểm tra cả count và quantity để đảm bảo tương thích với tất cả dữ liệu
          const quantity = Number(parsed.count || parsed.quantity || 0);

          const parsedItem = {
            ...parsed,
            id: parsed.id || parsed.$id || `item-${index}`,
            name: parsed.name || `Sản phẩm ${index + 1}`,
            price: Number(parsed.price) || 0,
            quantity: quantity > 0 ? quantity : 1,
          };

          console.log(`Item ${index} sau khi xử lý:`, parsedItem);
          return parsedItem;
        } catch (e) {
          console.error("Lỗi phân tích item:", item, e);
          return {
            id: `unknown-${index}`,
            name: `Không thể đọc thông tin sản phẩm ${index + 1}`,
            quantity: 1,
            price: 0,
          };
        }
      });

      console.log("Các sản phẩm trong đơn hàng sau khi parse:", parsedItems);
      setOrderItems(parsedItems);
    } catch (error) {
      console.error("Lỗi khi phân tích dữ liệu đơn hàng:", error);
      setOrderItems([]);
    }
  };

  const handleBackToList = () => {
    navigate("/orders");
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
    // Kiểm tra nếu amount là undefined hoặc không phải số hợp lệ
    if (amount === undefined || isNaN(amount)) {
      return "0 VNĐ";
    }
    return amount.toLocaleString("vi-VN") + " VNĐ";
  };

  // Định dạng giá tiền cho đơn hàng - đã sửa
  // Định dạng giá tiền cho đơn hàng
  const calculateItemTotal = (price: number, quantity: number) => {
    const safePrice = Number(price) || 0;
    const safeQuantity = Number(quantity) > 0 ? Number(quantity) : 1;
    return safePrice * safeQuantity;
  };

  // Tính tổng tiền từ các sản phẩm
  const calculateItemsTotal = () => {
    if (!orderItems || orderItems.length === 0) return 0;

    return orderItems.reduce((total, item) => {
      const price = Number(item.price) || 0;
      const quantity = Number(item.quantity) > 0 ? Number(item.quantity) : 1;
      const itemTotal = price * quantity;
      console.log(
        `Tính tổng sản phẩm ${item.name}: ${price} × ${quantity} = ${itemTotal}`
      );
      return total + itemTotal;
    }, 0);
  };

  // Tính tổng tiền cuối cùng - đã sửa
  const calculateFinalTotal = () => {
    const itemsTotal = calculateItemsTotal();
    let finalTotal = itemsTotal;

    if (order?.discount && !isNaN(Number(order.discount))) {
      finalTotal -= Number(order.discount);
    }

    if (order?.couponDiscount && !isNaN(Number(order.couponDiscount))) {
      finalTotal -= Number(order.couponDiscount);
    }

    if (order?.promotionDiscount && !isNaN(Number(order.promotionDiscount))) {
      finalTotal -= Number(order.promotionDiscount);
    }

    // Đảm bảo tổng tiền không âm
    return Math.max(finalTotal, 0);
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case "Completed":
        return "bg-green-100 text-green-800 border-green-200";
      case "Processing":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "Cancelled":
        return "bg-red-100 text-red-800 border-red-200";
      case "Pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "transfer":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "cash":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "returned":
        return "bg-orange-100 text-orange-800 border-orange-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusName = (status: string) => {
    switch (status) {
      case "Completed":
        return "Hoàn thành";
      case "Processing":
        return "Đang xử lý";
      case "Cancelled":
        return "Đã hủy";
      case "Pending":
        return "Chờ xác nhận";
      case "transfer":
        return "Chuyển khoản";
      case "cash":
        return "Tiền mặt";
      case "returned":
        return "Đã hoàn trả";
      default:
        return status;
    }
  };

  // Tính toán số tiền hoàn trả
  const calculateReturnAmount = () => {
    let total = 0;

    if (!order || !orderItems.length) return total;

    const isPaid = order.status === "cash" || order.status === "transfer";
    if (!isPaid) return 0;

    Object.entries(selectedItems).forEach(([index, isSelected]) => {
      if (isSelected) {
        const item = orderItems[parseInt(index)];
        total += item.price * item.quantity;
      }
    });

    return total;
  };

  // Chọn/bỏ chọn mục khi hoàn trả
  const toggleItemSelection = (index: number) => {
    const newSelectedItems = {
      ...selectedItems,
      [index]: !selectedItems[index],
    };

    setSelectedItems(newSelectedItems);

    if (orderItems.length > 0) {
      const item = orderItems[index];
      const itemValue = item.price * item.quantity;

      if (!selectedItems[index]) {
        setCurrentReturnAmount(currentReturnAmount + itemValue);
      } else {
        setCurrentReturnAmount(currentReturnAmount - itemValue);
      }
    }
  };

  // Xử lý hoàn trả đơn hàng
  const handleReturnOrder = async () => {
    if (!order) return;
    if (!returnReason) {
      toast.error("Vui lòng nhập lý do hoàn trả!");
      return;
    }

    setIsProcessing(true);

    try {
      const returnAmount = calculateReturnAmount();
      const isPaid = order.status === "cash" || order.status === "transfer";

      const returnData = {
        originalOrderId: order.$id,
        returnDate: new Date().toISOString(),
        returnReason: returnReason,
        returnedItems: orderItems
          .filter((_, index) => selectedItems[index])
          .map((item) => `${item.id}:${item.quantity}`),
        totalReturnAmount: returnAmount,
        status: "returned",
        wasPaid: isPaid,
      };

      // Cập nhật trạng thái đơn hàng
      await updateItem(COLLECTION_IDS.orders, order.$id, {
        status: "returned",
        returnReason: returnReason,
        returnDate: new Date().toISOString(),
      });

      // Tạo bản ghi hoàn trả
      await createItem(COLLECTION_IDS.returns, returnData);

      // Nếu đơn hàng đã thanh toán, cập nhật lại tồn kho
      if (isPaid) {
        for (const [index, isSelected] of Object.entries(selectedItems)) {
          if (isSelected && orderItems[parseInt(index)]) {
            const item = orderItems[parseInt(index)];

            try {
              const product = await getSingleItem(
                COLLECTION_IDS.products,
                item.id
              );

              if (product) {
                const currentStock = product.stock || 0;
                const newStock = currentStock + item.quantity;

                await updateItem(COLLECTION_IDS.products, item.id, {
                  stock: newStock,
                });
              }
            } catch (err) {
              console.error(
                `Lỗi khi cập nhật tồn kho cho sản phẩm ${item.id}:`,
                err
              );
            }
          }
        }
      }

      // Xóa cache
      invalidateCache(`order_${order.$id}`);
      invalidateCache("ordersList");

      const successMessage = isPaid
        ? `Hoàn trả đơn hàng thành công. Số tiền hoàn trả: ${returnAmount.toLocaleString(
            "vi-VN"
          )} VNĐ`
        : "Hoàn trả đơn hàng thành công. Đơn hàng chưa thanh toán nên không có hoàn tiền.";

      toast.success(successMessage);

      // Chuyển về trang danh sách đơn hàng
      setTimeout(() => {
        navigate("/orders");
      }, 2000);
    } catch (error) {
      console.error("Lỗi khi hoàn trả đơn hàng:", error);
      toast.error("Không thể hoàn trả đơn hàng. Vui lòng thử lại sau.");
    } finally {
      setIsProcessing(false);
      setIsReturnModalOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <AlertCircle className="mx-auto h-16 w-16 text-red-500 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Không tìm thấy đơn hàng
            </h2>
            <p className="text-gray-500 mb-4">
              Đơn hàng này không tồn tại hoặc đã bị xóa.
            </p>
            <button
              onClick={handleBackToList}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Home className="w-5 h-5 mr-2" />
              Quay lại danh sách đơn hàng
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
            <span>Quay lại danh sách đơn hàng</span>
          </button>
        </div>

        {/* Hóa đơn */}
        <div
          ref={receiptRef}
          className="bg-white shadow rounded-lg mb-6 p-6 print:shadow-none print:border print:border-gray-200"
        >
          {/* Tiêu đề đơn hàng */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Đơn hàng #{order.$id.substring(0, 8)}
              </h1>
              <div className="flex items-center mt-2">
                <Calendar className="h-4 w-4 text-gray-500 mr-1" />
                <span className="text-gray-500 text-sm">
                  {formatDateTime(order.date)}
                </span>
              </div>
            </div>
            <div className="mt-4 lg:mt-0">
              <div
                className={`px-4 py-2 border rounded-lg ${getStatusClass(
                  order.status
                )}`}
              >
                <span className="font-medium">
                  {getStatusName(order.status)}
                </span>
              </div>
            </div>
          </div>

          {/* Thông tin thanh toán */}
          <div className="bg-white shadow rounded-lg mb-6 overflow-hidden">
            <div className="border-b border-gray-200">
              <div className="px-6 py-5 flex items-center">
                <div className="flex-shrink-0">
                  <DollarSign className="h-8 w-8 text-blue-600 bg-blue-100 p-1.5 rounded-full" />
                </div>
                <div className="ml-4">
                  <h2 className="text-lg font-medium text-gray-900">
                    Thông tin thanh toán
                  </h2>
                </div>
              </div>
            </div>
            <div className="px-6 py-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">
                    Tổng tiền hàng
                  </h3>
                  <p className="mt-1 text-lg font-semibold text-gray-900">
                    {formatCurrency(order.subtotal || calculateItemsTotal())}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">
                    Giảm giá
                  </h3>
                  <p className="mt-1 text-lg font-semibold text-green-600">
                    {order.discount > 0
                      ? `-${formatCurrency(order.discount)}`
                      : "0 VNĐ"}
                  </p>
                </div>
                {order.couponDiscount && order.couponDiscount > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">
                      Mã giảm giá{" "}
                      <span className="text-blue-600">{order.couponCode}</span>
                    </h3>
                    <p className="mt-1 text-lg font-semibold text-green-600">
                      -{formatCurrency(order.couponDiscount)}
                    </p>
                  </div>
                )}
                {order.promotionDiscount && order.promotionDiscount > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">
                      Khuyến mãi{" "}
                      <span className="text-blue-600">
                        {order.promotionName}
                      </span>
                    </h3>
                    <p className="mt-1 text-lg font-semibold text-green-600">
                      -{formatCurrency(order.promotionDiscount)}
                    </p>
                  </div>
                )}
                <div className="md:col-span-2">
                  <div className="border-t border-gray-200 pt-4 mt-2">
                    <h3 className="text-sm font-medium text-gray-500">
                      Thành tiền
                    </h3>
                    <p className="mt-1 text-xl font-bold text-gray-900">
                      {formatCurrency(calculateFinalTotal())}
                    </p>
                    {/* Đã xóa điều kiện kiểm tra và hiển thị thành tiền từ sản phẩm */}
                  </div>
                </div>
                <div className="md:col-span-2">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-sm font-medium text-gray-500 mb-2">
                      Phương thức thanh toán
                    </h3>
                    <div className="flex items-center">
                      <span
                        className={`font-medium ${
                          order.status === "transfer"
                            ? "text-blue-600"
                            : order.status === "cash"
                            ? "text-green-600"
                            : order.status === "returned"
                            ? "text-red-600"
                            : "text-gray-600"
                        }`}
                      >
                        {getStatusName(order.status)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Thông tin khách hàng */}
          <div className="bg-white shadow rounded-lg mb-6">
            <div className="border-b border-gray-200">
              <div className="px-6 py-5 flex items-center">
                <div className="flex-shrink-0">
                  <User className="h-8 w-8 text-purple-600 bg-purple-100 p-1.5 rounded-full" />
                </div>
                <div className="ml-4">
                  <h2 className="text-lg font-medium text-gray-900">
                    Thông tin khách hàng
                  </h2>
                </div>
              </div>
            </div>
            <div className="px-6 py-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">
                    Tên khách hàng
                  </h3>
                  <p className="mt-1 text-lg font-medium text-gray-900">
                    {order.customerName || "Khách vãng lai"}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">
                    Số điện thoại
                  </h3>
                  <p className="mt-1 text-lg font-medium text-gray-900">
                    {order.customerPhone || "Không có"}
                  </p>
                </div>
                <div className="md:col-span-2">
                  <h3 className="text-sm font-medium text-gray-500">
                    Địa điểm
                  </h3>
                  <div className="mt-1 flex items-center">
                    {order.table ? (
                      <p className="text-gray-900">
                        <span className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm font-medium mr-2">
                          Bàn: {order.table}
                        </span>
                        {order.location && (
                          <span className="text-gray-700">
                            {order.location}
                          </span>
                        )}
                      </p>
                    ) : (
                      <p className="flex items-center text-gray-900">
                        <Truck className="h-4 w-4 text-gray-500 mr-1" />
                        <span>Mang đi</span>
                        {order.location && (
                          <span className="ml-2 text-gray-700">
                            - {order.location}
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Danh sách sản phẩm */}
          <div className="bg-white shadow rounded-lg mb-6">
            <div className="border-b border-gray-200">
              <div className="px-6 py-5 flex items-center">
                <div className="flex-shrink-0">
                  <Coffee className="h-8 w-8 text-amber-600 bg-amber-100 p-1.5 rounded-full" />
                </div>
                <div className="ml-4">
                  <h2 className="text-lg font-medium text-gray-900">
                    Sản phẩm đã đặt
                  </h2>
                </div>
              </div>
            </div>
            <div className="px-6 py-5">
              <div className="overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th
                        scope="col"
                        className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Sản phẩm
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Số lượng
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Đơn giá
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Thành tiền
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {orderItems.length > 0 ? (
                      orderItems.map((item, index) => (
                        <tr key={index}>
                          <td className="px-3 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {item.name}
                            </div>
                            {item.options && item.options.length > 0 && (
                              <div className="text-sm text-gray-500">
                                {item.options.map((opt, i) => (
                                  <div key={i} className="flex items-center">
                                    <Tag className="h-3 w-3 text-gray-400 mr-1" />
                                    <span>
                                      {opt.name}
                                      {opt.price > 0 &&
                                        ` (+${opt.price.toLocaleString()} VNĐ)`}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                            {item.quantity > 0 ? item.quantity : 1}
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                            {item.price.toLocaleString()} VNĐ
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                            {calculateItemTotal(
                              item.price,
                              item.quantity
                            ).toLocaleString()}{" "}
                            VNĐ
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-3 py-4 text-center text-sm text-gray-500"
                        >
                          Không có thông tin chi tiết sản phẩm
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>

                {/* Thêm phần tổng cộng sản phẩm */}
                {orderItems.length > 0 && (
                  <div className="mt-4 border-t pt-4">
                    <div className="flex justify-between items-center">
                      <div className="text-sm font-medium text-gray-600">
                        Tổng cộng ({orderItems.length} sản phẩm):
                      </div>
                      <div className="text-lg font-bold text-gray-900">
                        {calculateItemsTotal().toLocaleString()} VNĐ
                      </div>
                    </div>

                    {/* Chi tiết cách tính */}
                    <div className="mt-4 bg-gray-50 p-3 rounded-md">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">
                        Chi tiết cách tính:
                      </h4>
                      <table className="w-full text-sm">
                        <tbody>
                          {orderItems.map((item, index) => (
                            <tr key={`calc-${index}`}>
                              <td className="py-1">
                                {item.name} (x
                                {item.quantity > 0 ? item.quantity : 1})
                              </td>
                              <td className="py-1 text-right">
                                {item.price.toLocaleString()} ×{" "}
                                {item.quantity > 0 ? item.quantity : 1} ={" "}
                                {calculateItemTotal(
                                  item.price,
                                  item.quantity
                                ).toLocaleString()}{" "}
                                VNĐ
                              </td>
                            </tr>
                          ))}
                          <tr className="border-t border-gray-200">
                            <td className="py-2 font-medium">Tổng tiền hàng</td>
                            <td className="py-2 text-right font-medium">
                              {calculateItemsTotal().toLocaleString()} VNĐ
                            </td>
                          </tr>
                          {order.discount > 0 && (
                            <tr>
                              <td className="py-1">Giảm giá</td>
                              <td className="py-1 text-right text-green-600">
                                -{order.discount.toLocaleString()} VNĐ
                              </td>
                            </tr>
                          )}
                          {order.couponDiscount && order.couponDiscount > 0 && (
                            <tr>
                              <td className="py-1">
                                Mã giảm giá ({order.couponCode})
                              </td>
                              <td className="py-1 text-right text-green-600">
                                -{order.couponDiscount.toLocaleString()} VNĐ
                              </td>
                            </tr>
                          )}
                          {order.promotionDiscount &&
                            order.promotionDiscount > 0 && (
                              <tr>
                                <td className="py-1">
                                  Khuyến mãi ({order.promotionName})
                                </td>
                                <td className="py-1 text-right text-green-600">
                                  -{order.promotionDiscount.toLocaleString()}{" "}
                                  VNĐ
                                </td>
                              </tr>
                            )}
                          <tr className="border-t border-gray-200">
                            <td className="py-2 font-medium">Thành tiền</td>
                            <td className="py-2 text-right font-bold">
                              {calculateFinalTotal().toLocaleString()} VNĐ
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Ghi chú và thông tin khác */}
          <div className="bg-white shadow rounded-lg mb-6">
            <div className="border-b border-gray-200">
              <div className="px-6 py-5 flex items-center">
                <div className="flex-shrink-0">
                  <Clipboard className="h-8 w-8 text-gray-600 bg-gray-100 p-1.5 rounded-full" />
                </div>
                <div className="ml-4">
                  <h2 className="text-lg font-medium text-gray-900">
                    Thông tin bổ sung
                  </h2>
                </div>
              </div>
            </div>
            <div className="px-6 py-5">
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-500 mb-2">
                  Ghi chú đơn hàng
                </h3>
                <p className="text-gray-900 p-3 bg-gray-50 rounded-lg">
                  {order.note || "Không có ghi chú"}
                </p>
              </div>

              {order.returnReason && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-red-500 mb-2">
                    Lý do trả hàng
                  </h3>
                  <div className="p-3 bg-red-50 rounded-lg border border-red-100">
                    <p className="text-red-700">{order.returnReason}</p>
                    {order.returnDate && (
                      <p className="text-red-500 text-sm mt-1">
                        Ngày trả: {formatDateTime(order.returnDate)}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {order.output && order.output.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">
                    Thông tin xuất ra
                  </h3>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    {order.output.map((out, i) => (
                      <p key={i} className="text-gray-800 mb-1">
                        {out}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal hoàn trả đơn hàng */}
      {isReturnModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-lg max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Hoàn trả đơn hàng
            </h2>

            <h3 className="text-sm font-medium text-gray-600 mb-2">
              Chọn sản phẩm muốn hoàn trả:
            </h3>
            <div className="max-h-48 overflow-y-auto mb-4">
              {orderItems.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center py-2 border-b border-gray-100"
                >
                  <button
                    onClick={() => toggleItemSelection(index)}
                    className="flex-shrink-0 mr-3"
                  >
                    {selectedItems[index] ? (
                      <CheckSquare className="h-5 w-5 text-blue-600" />
                    ) : (
                      <Square className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                  <div className="flex-grow">
                    <p className="text-sm font-medium">{item.name}</p>
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>{item.quantity > 0 ? item.quantity : 1}x</span>
                      <span>{item.price.toLocaleString()} VNĐ</span>
                    </div>
                  </div>
                  <div className="ml-3 font-medium">
                    {calculateItemTotal(
                      item.price,
                      item.quantity
                    ).toLocaleString()}{" "}
                    VNĐ
                  </div>
                </div>
              ))}
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Lý do hoàn trả
              </label>
              <textarea
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Nhập lý do hoàn trả"
              />
            </div>

            <div className="bg-gray-50 p-3 rounded-md mb-4">
              <div className="text-sm font-medium text-gray-700 mb-1">
                Tổng tiền hoàn trả:
              </div>
              <div className="text-lg font-bold text-blue-600">
                {order &&
                (order.status === "cash" || order.status === "transfer")
                  ? currentReturnAmount.toLocaleString() + " VNĐ"
                  : "Đơn hàng chưa thanh toán, không hoàn tiền"}
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setIsReturnModalOpen(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                disabled={isProcessing}
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleReturnOrder}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center"
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                    Đang xử lý...
                  </>
                ) : (
                  "Xác nhận hoàn trả"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderDetail;
