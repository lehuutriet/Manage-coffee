import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/auth/authProvider";
import { useDataCache } from "../../contexts/auth/DataCacheProvider";
import {
  Home,
  Edit,
  AlertCircle,
  Calendar,
  ArrowLeft,
  Tag,
  DollarSign,
  Gift,
  Check,
  X,
  Clock,
  Image,
} from "lucide-react";
import toast from "react-hot-toast";

interface Product {
  $id: string;
  name: string;
  price: number;
  photoUrl?: string;
}

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

const PromotionDetail = () => {
  const { id } = useParams<{ id: string }>();
  const {
    getSingleItem,
    COLLECTION_IDS,
    updateItem,
    getAllItems,
    BUCKET_ID,
    storage,
  } = useAuth();
  const { getCachedData, setCachedData, invalidateCache } = useDataCache();
  const [promotion, setPromotion] = useState<Promotion | null>(null);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Record<string, Product>>({});
  const navigate = useNavigate();

  // Hàm để lấy tên sản phẩm từ ID
  const getProductNameById = useCallback(
    (productId: string) => {
      return products[productId]?.name || `Sản phẩm (${productId})`;
    },
    [products]
  );
  const getImageUrl = useCallback(
    (photoId: string) => {
      if (!photoId) return null;

      // Sử dụng Appwrite Storage để tạo URL preview từ photoId
      try {
        // Tạo URL trực tiếp từ storage của Appwrite
        return `https://cloud.appwrite.io/v1/storage/buckets/${BUCKET_ID}/files/${photoId}/preview?project=66a085e60016a161b67b`;

        // Hoặc cách lấy URL động thông qua storage API:
        // return storage.getFilePreview(BUCKET_ID, photoId).toString();
      } catch (error) {
        console.error("Lỗi khi tạo URL ảnh:", error);
        return null;
      }
    },
    [BUCKET_ID]
  );
  // Hàm để lấy danh sách tất cả sản phẩm và lưu vào state
  const fetchProducts = useCallback(async () => {
    try {
      // Kiểm tra cache trước
      const cachedProducts = getCachedData("productsList");

      if (cachedProducts) {
        // Tạo đối tượng map từ ID đến sản phẩm để tra cứu nhanh
        const productsMap: Record<string, Product> = {};
        cachedProducts.forEach((product: Product) => {
          productsMap[product.$id] = product;
        });
        setProducts(productsMap);
      } else {
        // Nếu không có trong cache, lấy từ server
        const data = await getAllItems(COLLECTION_IDS.products);
        const productsMap: Record<string, Product> = {};
        data.forEach((product: Product) => {
          productsMap[product.$id] = product;
        });
        setProducts(productsMap);

        // Lưu vào cache
        setCachedData("productsList", data, 15 * 60 * 1000);
      }
    } catch (error) {
      console.error("Lỗi khi tải danh sách sản phẩm:", error);
    }
  }, [getAllItems, COLLECTION_IDS, getCachedData, setCachedData]);

  useEffect(() => {
    const fetchPromotionDetail = async () => {
      if (!id) return;

      setLoading(true);
      try {
        // Kiểm tra cache trước
        const cachedPromotion = getCachedData(`promotion_${id}`);

        if (cachedPromotion) {
          console.log("Sử dụng dữ liệu khuyến mãi từ cache");
          if (cachedPromotion.photo && !cachedPromotion.photoUrl) {
            try {
              const photoUrl = await storage.getFilePreview(
                BUCKET_ID,
                cachedPromotion.photo
              );
              cachedPromotion.photoUrl = photoUrl.toString();
            } catch (photoError) {
              console.error("Lỗi khi lấy ảnh từ cache:", photoError);
            }
          }
          setPromotion(cachedPromotion);
          setLoading(false);
        }

        // Luôn tải dữ liệu mới từ server
        const data = await getSingleItem(COLLECTION_IDS.promotions, id);
        console.log("Chi tiết khuyến mãi từ server:", data);

        // Nếu có dữ liệu mới từ server
        if (data) {
          // Xử lý ảnh nếu có photoId nhưng không có photoUrl
          if (data.photo && !data.photoUrl) {
            try {
              const photoUrl = await storage.getFilePreview(
                BUCKET_ID,
                data.photo
              );
              data.photoUrl = photoUrl.toString();
              console.log("Đã tạo URL ảnh:", data.photoUrl);
            } catch (photoError) {
              console.error(
                "Lỗi khi lấy ảnh từ server:",
                photoError,
                "photoId:",
                data.photo
              );
            }
          }

          // Nếu dữ liệu khác với cache hoặc không có cache, cập nhật state và cache
          if (
            !cachedPromotion ||
            JSON.stringify(data) !== JSON.stringify(cachedPromotion)
          ) {
            setPromotion(data);
            setCachedData(`promotion_${id}`, data, 15 * 60 * 1000); // Cache 15 phút
          }
        }

        // Tải danh sách sản phẩm
        await fetchProducts();

        setLoading(false);
      } catch (error) {
        console.error("Lỗi khi tải chi tiết khuyến mãi:", error);
        toast.error("Không thể tải thông tin khuyến mãi");
        setLoading(false);
      }
    };

    fetchPromotionDetail();
  }, [
    id,
    getSingleItem,
    getCachedData,
    setCachedData,
    fetchProducts,
    BUCKET_ID,
    storage,
  ]);

  const handleBackToList = () => {
    navigate("/promotions");
  };

  const handleEditPromotion = () => {
    navigate(`/promotions/edit/${id}`);
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

  // Hàm định dạng tên loại khuyến mãi
  const getDiscountTypeName = (type: string) => {
    switch (type) {
      case "percentage":
        return "Giảm theo phần trăm";
      case "fixed":
        return "Giảm số tiền cố định";
      case "freegift":
        return "Tặng quà";
      case "buyxgety":
        return "Mua X tặng Y";
      default:
        return type;
    }
  };

  // Kiểm tra trạng thái khuyến mãi
  const getPromotionStatus = (promotion: Promotion) => {
    if (!promotion.isActive) return "inactive";

    const now = new Date();
    const startDate = new Date(promotion.startDate);
    const endDate = new Date(promotion.endDate);

    if (now < startDate) return "upcoming";
    if (now > endDate) return "expired";

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
        return "Đang diễn ra";
      case "upcoming":
        return "Sắp diễn ra";
      case "expired":
        return "Đã kết thúc";
      case "inactive":
        return "Không kích hoạt";
      default:
        return status;
    }
  };

  // Lấy màu cho loại khuyến mãi
  const getTypeColor = (type: string) => {
    switch (type) {
      case "percent":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "fixed":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "freegift":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "buyxgety":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
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

  // Tính thời gian còn lại hoặc đã qua
  const getRemainingTime = (promotion: Promotion) => {
    const now = new Date();
    const startDate = new Date(promotion.startDate);
    const endDate = new Date(promotion.endDate);

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
        return `Đã kết thúc ${days} ngày trước`;
      } else {
        return `Đã kết thúc trong ngày hôm nay`;
      }
    }

    // Nếu đang diễn ra
    const diff = endDate.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) {
      return `Còn ${days} ngày ${hours} giờ`;
    } else {
      return `Còn ${hours} giờ`;
    }
  };

  // Xử lý kích hoạt/vô hiệu hóa khuyến mãi
  const handleToggleActive = async () => {
    if (!promotion) return;

    try {
      const newStatus = !promotion.isActive;
      await updateItem(COLLECTION_IDS.promotions, promotion.$id, {
        isActive: newStatus,
      });

      // Cập nhật state và cache
      setPromotion({
        ...promotion,
        isActive: newStatus,
      });

      setCachedData(
        `promotion_${promotion.$id}`,
        {
          ...promotion,
          isActive: newStatus,
        },
        15 * 60 * 1000
      );

      invalidateCache("promotionsList");

      toast.success(
        newStatus ? "Đã kích hoạt khuyến mãi" : "Đã vô hiệu hóa khuyến mãi"
      );
    } catch (error) {
      console.error("Lỗi khi cập nhật trạng thái khuyến mãi:", error);
      toast.error("Không thể cập nhật trạng thái khuyến mãi");
    }
  };

  // Thay đổi phần hiển thị chi tiết khuyến mãi
  // Thay thế hàm renderPromotionDetails hiện tại bằng phiên bản cải tiến này
  // Thay thế hàm renderPromotionDetails hiện tại bằng phiên bản cải tiến này
  const renderPromotionDetails = () => {
    if (!promotion || !promotion.details || promotion.details.length === 0) {
      return (
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-gray-500 italic">Không có chi tiết khuyến mãi</p>
        </div>
      );
    }

    // Chuyển đổi mảng details thành đối tượng để dễ truy cập
    const detailsObject: Record<string, any> = {};
    promotion.details.forEach((detail) => {
      if (detail.includes(":")) {
        const [key, ...valueParts] = detail.split(":");
        const value = valueParts.join(":");
        detailsObject[key] = value;
      }
    });

    // Hiển thị theo từng loại khuyến mãi
    if (promotion.type === "buy_x_get_y") {
      // Lấy thông tin sản phẩm
      const requiredProductId = detailsObject.requiredProductId || "";
      const freeProductId = detailsObject.freeProductId || "";
      const requiredProduct = getProductNameById(requiredProductId);
      const freeProduct = getProductNameById(freeProductId);
      const requiredQuantity = parseInt(detailsObject.requiredQuantity || "1");
      const freeQuantity = parseInt(detailsObject.freeQuantity || "1");

      // Lấy đối tượng sản phẩm đầy đủ
      const requiredProductObj = products[requiredProductId];
      const freeProductObj = products[freeProductId];

      return (
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-medium text-lg mb-4 text-blue-800">
            Chi tiết khuyến mãi "Mua X tặng Y"
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="bg-white p-3 rounded-md shadow-sm">
              <p className="font-medium text-gray-600 mb-2">
                Sản phẩm cần mua:
              </p>
              <div className="flex items-center">
                {requiredProductObj?.photoUrl ? (
                  <img
                    src={requiredProductObj.photoUrl}
                    alt={requiredProduct}
                    className="w-16 h-16 object-cover rounded-md mr-3"
                  />
                ) : (
                  <div className="w-16 h-16 bg-gray-200 rounded-md mr-3 flex items-center justify-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-8 w-8 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                )}
                <div>
                  <p className="text-gray-900 font-medium">{requiredProduct}</p>
                  {requiredProductObj?.price && (
                    <p className="text-sm text-gray-500">
                      {requiredProductObj.price.toLocaleString()} VNĐ
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white p-3 rounded-md shadow-sm">
              <p className="font-medium text-gray-600 mb-1">
                Số lượng cần mua:
              </p>
              <p className="text-gray-900 text-lg font-medium">
                {requiredQuantity}
              </p>
            </div>

            <div className="bg-white p-3 rounded-md shadow-sm">
              <p className="font-medium text-gray-600 mb-2">
                Sản phẩm tặng kèm:
              </p>
              <div className="flex items-center">
                {freeProductObj?.photoUrl ? (
                  <img
                    src={freeProductObj.photoUrl}
                    alt={freeProduct}
                    className="w-16 h-16 object-cover rounded-md mr-3"
                  />
                ) : (
                  <div className="w-16 h-16 bg-gray-200 rounded-md mr-3 flex items-center justify-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-8 w-8 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                )}
                <div>
                  <p className="text-gray-900 font-medium">{freeProduct}</p>
                  {freeProductObj?.price && (
                    <p className="text-sm text-gray-500">
                      {freeProductObj.price.toLocaleString()} VNĐ
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white p-3 rounded-md shadow-sm">
              <p className="font-medium text-gray-600 mb-1">
                Số lượng tặng kèm:
              </p>
              <p className="text-gray-900 text-lg font-medium">
                {freeQuantity}
              </p>
            </div>
          </div>

          <div className="bg-blue-100 p-4 rounded-md">
            <div className="flex items-center text-blue-800 mb-2">
              <Gift className="h-5 w-5 mr-2" />
              <span className="font-medium">Tóm tắt khuyến mãi:</span>
            </div>
            <p>
              Khi khách hàng mua{" "}
              <span className="font-medium">
                {requiredQuantity} {requiredProduct}
              </span>
              , sẽ được tặng kèm{" "}
              <span className="font-medium">
                {freeQuantity} {freeProduct}
              </span>
              .
            </p>
          </div>
        </div>
      );
    } else if (promotion.type === "discount_product") {
      // Lấy thông tin sản phẩm được giảm giá
      const productId = detailsObject.productId || "";
      const product = products[productId];
      const productName = getProductNameById(productId);
      const discountType = detailsObject.discountType || "percentage";
      const discountValue = parseInt(detailsObject.discountValue || "0");

      // Tìm thông tin giá gốc của sản phẩm nếu có
      const originalPrice = product?.price || 0;
      const discountAmount =
        discountType === "percentage"
          ? (originalPrice * discountValue) / 100
          : discountValue;
      const finalPrice = originalPrice - discountAmount;

      return (
        <div className="bg-green-50 p-4 rounded-lg">
          <h3 className="font-medium text-lg mb-4 text-green-800">
            Chi tiết giảm giá sản phẩm
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="bg-white p-3 rounded-md shadow-sm">
              <p className="font-medium text-gray-600 mb-2">
                Sản phẩm được giảm giá:
              </p>
              <div className="flex items-center">
                {product?.photoUrl ? (
                  <img
                    src={product.photoUrl}
                    alt={productName}
                    className="w-16 h-16 object-cover rounded-md mr-3"
                  />
                ) : (
                  <div className="w-16 h-16 bg-gray-200 rounded-md mr-3 flex items-center justify-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-8 w-8 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                )}
                <div>
                  <p className="text-gray-900 font-medium">{productName}</p>
                  {originalPrice > 0 && (
                    <p className="text-sm text-gray-500">
                      {originalPrice.toLocaleString()} VNĐ
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white p-3 rounded-md shadow-sm">
              <p className="font-medium text-gray-600 mb-1">Loại giảm giá:</p>
              <p className="text-gray-900">
                {discountType === "percentage"
                  ? "Phần trăm (%)"
                  : "Số tiền cố định"}
              </p>
            </div>

            <div className="bg-white p-3 rounded-md shadow-sm">
              <p className="font-medium text-gray-600 mb-1">Giá trị giảm:</p>
              <p className="text-green-600 font-medium">
                {discountType === "percentage"
                  ? `${discountValue}%`
                  : `${discountValue.toLocaleString()} VNĐ`}
              </p>
            </div>
          </div>

          {originalPrice > 0 && (
            <div className="bg-green-100 p-4 rounded-md">
              <div className="flex items-center text-green-800 mb-2">
                <DollarSign className="h-5 w-5 mr-2" />
                <span className="font-medium">Thông tin giá:</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm mb-2">
                <div className="bg-white p-2 rounded text-center">
                  <p className="text-gray-500 mb-1">Giá gốc</p>
                  <p className="font-medium">
                    {originalPrice.toLocaleString()} VNĐ
                  </p>
                </div>
                <div className="bg-white p-2 rounded text-center">
                  <p className="text-gray-500 mb-1">Giảm giá</p>
                  <p className="font-medium text-red-600">
                    - {discountAmount.toLocaleString()} VNĐ
                  </p>
                </div>
                <div className="bg-white p-2 rounded text-center">
                  <p className="text-gray-500 mb-1">Giá sau giảm</p>
                  <p className="font-medium text-green-600">
                    {finalPrice.toLocaleString()} VNĐ
                  </p>
                </div>
              </div>
              <p className="text-green-800">
                Khách hàng tiết kiệm được{" "}
                <span className="font-medium">
                  {discountAmount.toLocaleString()} VNĐ
                </span>{" "}
                khi mua sản phẩm này.
              </p>
            </div>
          )}
        </div>
      );
    } else if (promotion.type === "combo_deal") {
      // Xử lý combo deal
      const productIds = detailsObject.productIds?.split(",") || [];
      const comboPrice = parseInt(detailsObject.comboPrice || "0");

      // Tính tổng giá gốc các sản phẩm
      let totalOriginalPrice = 0;
      const productList = productIds
        .map((id: string) => {
          const product = products[id];
          if (product) {
            totalOriginalPrice += product.price;
            return product;
          }
          return null;
        })
        .filter(Boolean);

      const savings = totalOriginalPrice - comboPrice;
      const savingsPercent =
        totalOriginalPrice > 0
          ? Math.round((savings / totalOriginalPrice) * 100)
          : 0;

      return (
        <div className="bg-purple-50 p-4 rounded-lg">
          <h3 className="font-medium text-lg mb-4 text-purple-800">
            Chi tiết Combo Deal
          </h3>

          <div className="mb-4">
            <p className="font-medium text-gray-700 mb-2">
              Sản phẩm trong combo:
            </p>
            <div className="space-y-2">
              {productList.map((product: any, index: any) => (
                <div
                  key={product?.$id}
                  className="bg-white p-3 rounded-md shadow-sm flex justify-between items-center"
                >
                  <div className="flex items-center">
                    <div className="bg-purple-100 text-purple-800 w-6 h-6 rounded-full flex items-center justify-center mr-3">
                      {index + 1}
                    </div>
                    {product?.photoUrl ? (
                      <img
                        src={product.photoUrl}
                        alt={product.name}
                        className="w-12 h-12 object-cover rounded-md mr-3"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gray-200 rounded-md mr-3 flex items-center justify-center">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-6 w-6 text-gray-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                    )}
                    <span className="font-medium">{product?.name}</span>
                  </div>
                  <span className="text-gray-600">
                    {product?.price.toLocaleString()} VNĐ
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-purple-100 p-4 rounded-md">
            <div className="flex items-center text-purple-800 mb-3">
              <DollarSign className="h-5 w-5 mr-2" />
              <span className="font-medium">Thông tin giá Combo:</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
              <div className="bg-white p-2 rounded-md text-center">
                <p className="text-gray-500 mb-1">Tổng giá gốc</p>
                <p className="font-medium">
                  {totalOriginalPrice.toLocaleString()} VNĐ
                </p>
              </div>
              <div className="bg-white p-2 rounded-md text-center">
                <p className="text-gray-500 mb-1">Giá combo</p>
                <p className="font-medium text-purple-600">
                  {comboPrice.toLocaleString()} VNĐ
                </p>
              </div>
              <div className="bg-white p-2 rounded-md text-center">
                <p className="text-gray-500 mb-1">Tiết kiệm</p>
                <p className="font-medium text-green-600">
                  {savings.toLocaleString()} VNĐ ({savingsPercent}%)
                </p>
              </div>
            </div>
            <p className="text-purple-800">
              Mua combo này, khách hàng tiết kiệm được{" "}
              <span className="font-medium">
                {savings.toLocaleString()} VNĐ
              </span>
              .
            </p>
          </div>
        </div>
      );
    } else if (promotion.type === "percent" || promotion.type === "fixed") {
      // Xử lý giảm giá % hoặc giảm số tiền
      const discountValue = parseInt(detailsObject.discountValue || "0");
      const minOrderValue = parseInt(detailsObject.minOrderValue || "0");
      const maxDiscount = parseInt(detailsObject.maxDiscount || "0");

      return (
        <div className="bg-amber-50 p-4 rounded-lg">
          <h3 className="font-medium text-lg mb-4 text-amber-800">
            Chi tiết{" "}
            {promotion.type === "percent"
              ? "giảm giá %"
              : "giảm số tiền cố định"}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="bg-white p-3 rounded-md shadow-sm">
              <p className="font-medium text-gray-600 mb-1">
                Giá trị giảm giá:
              </p>
              <p className="text-amber-600 font-medium">
                {promotion.type === "percent"
                  ? `${discountValue}%`
                  : `${discountValue.toLocaleString()} VNĐ`}
              </p>
            </div>
            {minOrderValue > 0 && (
              <div className="bg-white p-3 rounded-md shadow-sm">
                <p className="font-medium text-gray-600 mb-1">
                  Giá trị đơn hàng tối thiểu:
                </p>
                <p className="text-gray-900">
                  {minOrderValue.toLocaleString()} VNĐ
                </p>
              </div>
            )}
            {promotion.type === "percent" && maxDiscount > 0 && (
              <div className="bg-white p-3 rounded-md shadow-sm">
                <p className="font-medium text-gray-600 mb-1">
                  Giảm giá tối đa:
                </p>
                <p className="text-gray-900">
                  {maxDiscount.toLocaleString()} VNĐ
                </p>
              </div>
            )}
          </div>

          <div className="bg-amber-100 p-4 rounded-md">
            <div className="flex items-center text-amber-800 mb-2">
              <Tag className="h-5 w-5 mr-2" />
              <span className="font-medium">Thông tin áp dụng:</span>
            </div>
            <p>
              Khuyến mãi{" "}
              {promotion.type === "percent"
                ? `giảm ${discountValue}%`
                : `giảm ${discountValue.toLocaleString()} VNĐ`}
              {minOrderValue > 0
                ? ` cho đơn hàng từ ${minOrderValue.toLocaleString()} VNĐ`
                : " cho tất cả đơn hàng"}
              {promotion.type === "percent" && maxDiscount > 0
                ? `, tối đa ${maxDiscount.toLocaleString()} VNĐ`
                : ""}
              .
            </p>
          </div>
        </div>
      );
    }

    // Trường hợp mặc định - hiển thị dưới dạng danh sách
    return (
      <div className="bg-gray-50 p-4 rounded-lg">
        <ul className="space-y-3">
          {promotion.details.map((detail, index) => {
            if (detail.includes(":")) {
              const [key, value] = detail.split(":");

              let displayKey = key;
              let displayValue = value;

              if (key === "productId") {
                displayKey = "Sản phẩm";
                displayValue = getProductNameById(value);
                const product = products[value];

                // Nếu có sản phẩm, hiển thị với ảnh
                if (product) {
                  return (
                    <li key={index} className="flex items-start">
                      <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-blue-100 text-blue-800 mr-2 mt-1">
                        <Check className="h-3 w-3" />
                      </span>
                      <div className="flex-1">
                        <div className="font-medium">{displayKey}:</div>
                        <div className="flex items-center mt-1">
                          {product.photoUrl ? (
                            <img
                              src={product.photoUrl}
                              alt={displayValue}
                              className="w-12 h-12 object-cover rounded-md mr-2"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-gray-200 rounded-md mr-2 flex items-center justify-center">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-6 w-6 text-gray-400"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                />
                              </svg>
                            </div>
                          )}
                          <span>{displayValue}</span>
                        </div>
                      </div>
                    </li>
                  );
                }
              } else if (key === "discountType") {
                displayKey = "Loại giảm giá";
                displayValue = getDiscountTypeName(value);
              } else if (key === "discountValue") {
                displayKey = "Giá trị giảm giá";
                displayValue =
                  value + (promotion.type === "percent" ? "%" : " VNĐ");
              } else if (key === "requiredProductId") {
                displayKey = "Sản phẩm yêu cầu";
                displayValue = getProductNameById(value);
                const product = products[value];

                // Nếu có sản phẩm, hiển thị với ảnh
                if (product) {
                  return (
                    <li key={index} className="flex items-start">
                      <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-blue-100 text-blue-800 mr-2 mt-1">
                        <Check className="h-3 w-3" />
                      </span>
                      <div className="flex-1">
                        <div className="font-medium">{displayKey}:</div>
                        <div className="flex items-center mt-1">
                          {product.photoUrl ? (
                            <img
                              src={product.photoUrl}
                              alt={displayValue}
                              className="w-12 h-12 object-cover rounded-md mr-2"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-gray-200 rounded-md mr-2 flex items-center justify-center">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-6 w-6 text-gray-400"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                />
                              </svg>
                            </div>
                          )}
                          <span>{displayValue}</span>
                        </div>
                      </div>
                    </li>
                  );
                }
              } else if (key === "freeProductId") {
                displayKey = "Sản phẩm tặng kèm";
                displayValue = getProductNameById(value);
                const product = products[value];

                // Nếu có sản phẩm, hiển thị với ảnh
                if (product) {
                  return (
                    <li key={index} className="flex items-start">
                      <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-blue-100 text-blue-800 mr-2 mt-1">
                        <Check className="h-3 w-3" />
                      </span>
                      <div className="flex-1">
                        <div className="font-medium">{displayKey}:</div>
                        <div className="flex items-center mt-1">
                          {product.photoUrl ? (
                            <img
                              src={product.photoUrl}
                              alt={displayValue}
                              className="w-12 h-12 object-cover rounded-md mr-2"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-gray-200 rounded-md mr-2 flex items-center justify-center">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-6 w-6 text-gray-400"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                />
                              </svg>
                            </div>
                          )}
                          <span>{displayValue}</span>
                        </div>
                      </div>
                    </li>
                  );
                }
              } else if (key === "requiredQuantity") {
                displayKey = "Số lượng cần mua";
              } else if (key === "freeQuantity") {
                displayKey = "Số lượng tặng kèm";
              }

              return (
                <li key={index} className="flex items-start">
                  <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-blue-100 text-blue-800 mr-2">
                    <Check className="h-3 w-3" />
                  </span>
                  <div>
                    <span className="font-medium">{displayKey}:</span>{" "}
                    {displayValue}
                  </div>
                </li>
              );
            } else {
              return (
                <li key={index} className="flex items-start">
                  <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-blue-100 text-blue-800 mr-2">
                    <Check className="h-3 w-3" />
                  </span>
                  <div>{detail}</div>
                </li>
              );
            }
          })}
        </ul>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!promotion) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <AlertCircle className="mx-auto h-16 w-16 text-red-500 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Không tìm thấy khuyến mãi
            </h2>
            <p className="text-gray-500 mb-4">
              Khuyến mãi này không tồn tại hoặc đã bị xóa.
            </p>
            <button
              onClick={handleBackToList}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Home className="w-5 h-5 mr-2" />
              Quay lại danh sách khuyến mãi
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Xác định trạng thái hiện tại của khuyến mãi
  const currentStatus = getPromotionStatus(promotion);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex justify-between mb-6">
          <button
            onClick={handleBackToList}
            className="flex items-center text-blue-600 hover:text-blue-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            <span>Quay lại danh sách khuyến mãi</span>
          </button>
          <button
            onClick={handleEditPromotion}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Edit className="w-5 h-5 mr-2" />
            <span>Chỉnh sửa</span>
          </button>
        </div>

        {/* Promotion Header */}
        <div className="bg-white shadow rounded-lg mb-6 overflow-hidden">
          <div className="bg-gradient-to-r from-red-600 to-pink-600 px-6 py-12">
            <div className="flex flex-col md:flex-row items-center justify-between">
              <div className="flex flex-col md:flex-row items-center">
                <div className="h-24 w-24 rounded-full bg-white flex items-center justify-center mb-4 md:mb-0 md:mr-6">
                  {promotion.photo ? (
                    <img
                      src={
                        promotion.photoUrl ||
                        getImageUrl(promotion.photo) ||
                        undefined
                      }
                      alt={promotion.name}
                      className="h-20 w-20 rounded-full object-cover"
                      onError={(e) => {
                        console.error("Lỗi tải ảnh:", e);
                        const target = e.target as HTMLImageElement;
                        // Hiển thị biểu tượng Gift thay vì ảnh khi có lỗi
                        target.style.display = "none";
                        e.currentTarget.parentElement?.classList.add(
                          "gift-fallback"
                        );
                      }}
                    />
                  ) : (
                    <Gift className="h-14 w-14 text-red-600" />
                  )}
                </div>
                <div className="text-white text-center md:text-left">
                  <h1 className="text-3xl font-bold">{promotion.name}</h1>
                  <div className="mt-2 flex flex-col md:flex-row md:items-center space-y-1 md:space-y-0 md:space-x-4">
                    <span
                      className={`px-3 py-1 rounded-full ${getTypeColor(
                        promotion.type
                      )}`}
                    >
                      {getTypeName(promotion.type)}
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

          {/* Hiển thị ảnh đầy đủ của khuyến mãi nếu có */}
          {promotion.photo && (
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Image className="h-5 w-5 mr-2 text-blue-600" />
                Hình ảnh khuyến mãi
              </h2>
              <div className="flex justify-center">
                {/* Thêm phần tải ảnh với xử lý lỗi */}
                <div
                  className="relative bg-gray-100 rounded-lg overflow-hidden"
                  style={{ minHeight: "200px", minWidth: "300px" }}
                >
                  <img
                    src={
                      promotion.photoUrl ||
                      getImageUrl(promotion.photo) ||
                      undefined
                    }
                    alt={promotion.name}
                    className="max-w-full h-auto"
                    style={{ maxHeight: "300px" }}
                    onError={(e) => {
                      console.error("Lỗi tải ảnh lớn:", e);
                      const target = e.target as HTMLImageElement;
                      target.style.display = "none";

                      // Thêm thông báo lỗi tải ảnh
                      const errorMsg = document.createElement("div");
                      errorMsg.className =
                        "absolute inset-0 flex items-center justify-center";
                      errorMsg.innerHTML = `
              <div class="text-center">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12V8a4 4 0 00-4-4H8a4 4 0 00-4 4v4m0 0l3-3m-3 3l3 3m11-3l-3-3m3 3l-3 3" />
                </svg>
                <p class="text-gray-500">Không thể tải ảnh khuyến mãi</p>
              </div>
            `;
                      target.parentElement?.appendChild(errorMsg);
                    }}
                  />
                </div>
              </div>
            </div>
          )}
          <div className="p-6">
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-500 mb-1">
                    Thời gian còn lại
                  </div>
                  <span className="text-lg font-medium text-gray-900">
                    {getRemainingTime(promotion)}
                  </span>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-1">Trạng thái</div>
                  <button
                    onClick={handleToggleActive}
                    className={`flex items-center px-4 py-2 rounded-lg ${
                      promotion.isActive
                        ? "bg-green-100 text-green-700 hover:bg-green-200"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    } transition-colors`}
                  >
                    {promotion.isActive ? (
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

            {promotion.description && (
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                  <Tag className="h-5 w-5 mr-2 text-blue-600" />
                  Mô tả khuyến mãi
                </h2>
                <div className="prose max-w-none bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-700 whitespace-pre-line">
                    {promotion.description}
                  </p>
                </div>
              </div>
            )}

            {/* Chi tiết khuyến mãi */}
            {promotion.details && promotion.details.length > 0 && (
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                  <Tag className="h-5 w-5 mr-2 text-blue-600" />
                  Chi tiết khuyến mãi
                </h2>
                {renderPromotionDetails()}
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
                    Loại khuyến mãi
                  </div>
                  <div className="text-lg font-medium text-gray-900">
                    {getTypeName(promotion.type)}
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-500 mb-1">
                    Thời gian bắt đầu
                  </div>
                  <div className="text-lg font-medium text-gray-900">
                    {formatDate(promotion.startDate)}
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-500 mb-1">
                    Thời gian kết thúc
                  </div>
                  <div className="text-lg font-medium text-gray-900">
                    {formatDate(promotion.endDate)}
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-500 mb-1">
                    Đơn hàng tối thiểu
                  </div>
                  <div className="text-lg font-medium text-gray-900">
                    {promotion.minOrderValue > 0
                      ? `${promotion.minOrderValue.toLocaleString()} VNĐ`
                      : "Không giới hạn"}
                  </div>
                </div>
                {promotion.type === "percent" && promotion.maxDiscount > 0 && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-500 mb-1">
                      Giảm tối đa
                    </div>
                    <div className="text-lg font-medium text-gray-900">
                      {promotion.maxDiscount.toLocaleString()} VNĐ
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Phần thời gian và trạng thái */}
            <div className="mt-8 border-t border-gray-200 pt-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Clock className="h-5 w-5 mr-2 text-blue-600" />
                Thời gian và trạng thái
              </h2>
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center mb-4">
                  <Calendar className="h-5 w-5 text-blue-600 mr-2" />
                  <h3 className="text-md font-medium text-blue-800">
                    Thời gian khuyến mãi:
                  </h3>
                </div>
                <div className="pl-7 space-y-2">
                  <p className="text-blue-700">
                    <span className="font-medium">Bắt đầu:</span>{" "}
                    {formatDate(promotion.startDate)}
                  </p>
                  <p className="text-blue-700">
                    <span className="font-medium">Kết thúc:</span>{" "}
                    {formatDate(promotion.endDate)}
                  </p>
                  <p className="text-blue-700 font-medium mt-2">
                    {getRemainingTime(promotion)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PromotionDetail;
