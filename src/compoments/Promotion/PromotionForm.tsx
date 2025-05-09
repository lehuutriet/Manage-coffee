import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../contexts/auth/authProvider";
import { useDataCache } from "../../contexts/auth/DataCacheProvider";
import {
  Save,
  ArrowLeft,
  Tag,
  Percent,
  DollarSign,
  Calendar,
  Image as ImageIcon,
  Info,
  Loader2,
  Trash2,
  X,
  Camera,
  Edit,
  Plus,
} from "lucide-react";
import toast from "react-hot-toast";
import Modal from "react-modal";

// Đảm bảo Modal được thiết lập cho ứng dụng
Modal.setAppElement("#root");

interface Product {
  $id: string;
  name: string;
  price: number;
  photoUrl?: string;
}

interface Promotion {
  $id?: string;
  name: string;
  type: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  description: string;
  details: string[];
  photo: string;
  photoUrl?: string;
}

interface PromotionFormProps {
  isEditing?: boolean;
}

const PromotionForm = ({ isEditing = false }: PromotionFormProps) => {
  const { id } = useParams<{ id: string }>();
  const {
    createItem,
    updateItem,
    getSingleItem,
    COLLECTION_IDS,
    storage,
    getAllItems,
    BUCKET_ID,
  } = useAuth();
  const { getCachedData, setCachedData, invalidateCache } = useDataCache();
  const navigate = useNavigate();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(isEditing);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePickerVisible, setImagePickerVisible] = useState(false);

  const [products, setProducts] = useState<Product[]>([]);

  // Trạng thái cho form gốc
  const [formData, setFormData] = useState<Promotion>({
    name: "",
    type: "percent",
    startDate: new Date().toISOString().slice(0, 16),
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 16),
    isActive: true,
    description: "",
    details: [],
    photo: "",
  });

  // Trạng thái ảnh
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  // Trạng thái cho loại "mua X tặng Y"
  const [requiredProductId, setRequiredProductId] = useState<string>("");
  const [requiredQuantity, setRequiredQuantity] = useState<string>("1");
  const [freeProductId, setFreeProductId] = useState<string>("");
  const [freeQuantity, setFreeQuantity] = useState<string>("1");

  // Trạng thái cho loại "giảm giá sản phẩm"
  const [discountProductId, setDiscountProductId] = useState<string>("");
  const [discountType, setDiscountType] = useState<string>("percentage");
  const [discountValue, setDiscountValue] = useState<string>("");

  // Trạng thái cho loại "combo deal"
  const [selectedComboProducts, setSelectedComboProducts] = useState<string[]>(
    []
  );
  const [comboPrice, setComboPrice] = useState<string>("");

  // Tải danh sách sản phẩm
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const cachedProducts = getCachedData("productsList");
        if (cachedProducts) {
          setProducts(cachedProducts);
        } else {
          const data = await getAllItems(COLLECTION_IDS.products);
          setProducts(data);
          setCachedData("productsList", data, 15 * 60 * 1000);
        }
      } catch (error) {
        console.error("Lỗi khi tải danh sách sản phẩm:", error);
        toast.error("Không thể tải danh sách sản phẩm");
      }
    };

    fetchProducts();
  }, [getAllItems, COLLECTION_IDS, getCachedData, setCachedData]);

  // Hàm lấy preview ảnh từ storage
  const getImagePreview = useCallback(
    async (fileId: string) => {
      try {
        console.log("Lấy ảnh với BUCKET_ID:", BUCKET_ID, "và fileId:", fileId);
        const preview = await storage.getFilePreview(BUCKET_ID, fileId);
        console.log("Đường dẫn ảnh:", preview.toString());
        return preview.toString();
      } catch (error) {
        console.error("Lỗi khi lấy preview ảnh:", error);
        return null;
      }
    },
    [storage, BUCKET_ID]
  );

  // Tải dữ liệu khuyến mãi khi sửa
  useEffect(() => {
    const fetchPromotionData = async () => {
      if (!isEditing || !id) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        console.log("Đang tải dữ liệu khuyến mãi với ID:", id);

        const promotion = await getSingleItem(COLLECTION_IDS.promotions, id);
        console.log("Dữ liệu khuyến mãi:", promotion);

        if (promotion) {
          setFormData({
            ...promotion,
            startDate: formatDateForInput(promotion.startDate),
            endDate: formatDateForInput(promotion.endDate),
          });

          // Lấy URL ảnh nếu có photo ID
          if (promotion.photo) {
            console.log("Có ID ảnh:", promotion.photo);
            setPhoto(promotion.photo);

            const imageUrl = await getImagePreview(promotion.photo);
            if (imageUrl) {
              console.log("Đã lấy được URL ảnh:", imageUrl);
              setPhotoUrl(imageUrl);
            } else {
              console.error("Không lấy được URL ảnh");
            }
          } else {
            console.log("Khuyến mãi không có ảnh");
          }

          // Phân tích details từ mảng chuỗi
          parsePromotionDetails(promotion);
          setCachedData(`promotion_${id}`, promotion, 15 * 60 * 1000);
        } else {
          toast.error("Không tìm thấy thông tin khuyến mãi");
        }
      } catch (error) {
        console.error("Lỗi khi tải dữ liệu khuyến mãi:", error);
        toast.error("Không thể tải thông tin khuyến mãi");
      } finally {
        setLoading(false);
      }
    };

    fetchPromotionData();
  }, [
    id,
    isEditing,
    getSingleItem,
    COLLECTION_IDS,
    getImagePreview,
    setCachedData,
  ]);

  // Phân tích cấu trúc details từ mảng chuỗi
  const parsePromotionDetails = (promotion: Promotion) => {
    if (!Array.isArray(promotion.details) || promotion.details.length === 0)
      return;

    const details: Record<string, any> = {};
    promotion.details.forEach((item) => {
      const parts = item.split(":");
      if (parts.length >= 2) {
        const key = parts[0];
        // Gộp lại phần value nếu có nhiều dấu ":"
        const value = parts.slice(1).join(":");

        if (key === "productIds") {
          details[key] = value.split(",");
        } else if (!isNaN(Number(value))) {
          details[key] = Number(value);
        } else {
          details[key] = value;
        }
      }
    });

    console.log("Đã parse details:", details);

    // Set các giá trị dựa vào loại khuyến mãi
    if (promotion.type === "buy_x_get_y") {
      setRequiredProductId(details.requiredProductId || "");
      setRequiredQuantity(details.requiredQuantity?.toString() || "1");
      setFreeProductId(details.freeProductId || "");
      setFreeQuantity(details.freeQuantity?.toString() || "1");
    } else if (promotion.type === "discount_product") {
      setDiscountProductId(details.productId || "");
      setDiscountType(details.discountType || "percentage");
      setDiscountValue(details.discountValue?.toString() || "");
    } else if (promotion.type === "combo_deal") {
      setSelectedComboProducts(
        Array.isArray(details.productIds) ? details.productIds : []
      );
      setComboPrice(details.comboPrice?.toString() || "");
    } else if (promotion.type === "percent" || promotion.type === "fixed") {
      setDiscountValue(details.discountValue?.toString() || "");
    }
  };

  // Chuyển đổi định dạng ngày tháng cho input
  const formatDateForInput = (dateString: string): string => {
    try {
      if (!dateString) {
        return new Date().toISOString().slice(0, 16);
      }

      const date = new Date(dateString);
      // Kiểm tra xem date có phải là ngày hợp lệ không
      if (isNaN(date.getTime())) {
        return new Date().toISOString().slice(0, 16);
      }
      return date.toISOString().slice(0, 16);
    } catch (error) {
      console.error("Lỗi định dạng ngày tháng:", error);
      return new Date().toISOString().slice(0, 16);
    }
  };

  // Chuyển đổi từ định dạng input sang định dạng lưu trữ
  const formatDateForStorage = (dateString: string): string => {
    try {
      if (!dateString) {
        return new Date().toISOString();
      }

      const date = new Date(dateString);
      // Kiểm tra xem date có phải là ngày hợp lệ không
      if (isNaN(date.getTime())) {
        return new Date().toISOString();
      }
      return date.toISOString();
    } catch (error) {
      console.error("Lỗi định dạng ngày tháng cho lưu trữ:", error);
      return new Date().toISOString();
    }
  };

  // Kiểm tra form
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Vui lòng nhập tên khuyến mãi";
    }

    if (formData.type === "buy_x_get_y") {
      if (!requiredProductId) {
        newErrors.requiredProductId = "Vui lòng chọn sản phẩm cần mua";
      }
      if (!freeProductId) {
        newErrors.freeProductId = "Vui lòng chọn sản phẩm tặng kèm";
      }
    } else if (formData.type === "discount_product") {
      if (!discountProductId) {
        newErrors.discountProductId = "Vui lòng chọn sản phẩm giảm giá";
      }
      if (
        !discountValue ||
        isNaN(Number(discountValue)) ||
        Number(discountValue) <= 0
      ) {
        newErrors.discountValue = "Giá trị giảm giá phải lớn hơn 0";
      }
      if (discountType === "percentage" && Number(discountValue) > 100) {
        newErrors.discountValue = "Giá trị phần trăm không thể vượt quá 100%";
      }
    } else if (formData.type === "combo_deal") {
      if (!selectedComboProducts || selectedComboProducts.length < 2) {
        newErrors.selectedComboProducts = "Vui lòng chọn ít nhất 2 sản phẩm";
      }
      if (!comboPrice || isNaN(Number(comboPrice)) || Number(comboPrice) <= 0) {
        newErrors.comboPrice = "Vui lòng nhập giá combo hợp lệ";
      }
    } else if (formData.type === "percent" || formData.type === "fixed") {
      if (
        !discountValue ||
        isNaN(Number(discountValue)) ||
        Number(discountValue) <= 0
      ) {
        newErrors.discountValue = "Vui lòng nhập giá trị giảm giá hợp lệ";
      }
      if (formData.type === "percent" && Number(discountValue) > 100) {
        newErrors.discountValue = "Giá trị phần trăm không thể vượt quá 100%";
      }
    }

    if (!formData.startDate) {
      newErrors.startDate = "Vui lòng chọn ngày bắt đầu";
    }

    if (!formData.endDate) {
      newErrors.endDate = "Vui lòng chọn ngày kết thúc";
    }

    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      if (end < start) {
        newErrors.endDate = "Ngày kết thúc phải sau ngày bắt đầu";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Xử lý thay đổi input
  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;

    if (name === "type") {
      // Reset các trường chi tiết khi thay đổi loại khuyến mãi
      setRequiredProductId("");
      setRequiredQuantity("1");
      setFreeProductId("");
      setFreeQuantity("1");
      setDiscountProductId("");
      setDiscountType("percentage");
      setDiscountValue("");
      setSelectedComboProducts([]);
      setComboPrice("");
    }

    if (name === "isActive") {
      setFormData({
        ...formData,
        isActive: (e.target as HTMLInputElement).checked,
      });
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }

    if (errors[name]) {
      setErrors({ ...errors, [name]: "" });
    }
  };

  // Toggle sản phẩm combo
  const toggleComboProduct = (productId: string) => {
    if (selectedComboProducts.includes(productId)) {
      setSelectedComboProducts(
        selectedComboProducts.filter((id) => id !== productId)
      );
    } else {
      setSelectedComboProducts([...selectedComboProducts, productId]);
    }
  };

  // Xử lý chọn ảnh
  const pickImage = async () => {
    try {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";

      input.onchange = async (e) => {
        const target = e.target as HTMLInputElement;
        const file = target.files?.[0];
        if (file) {
          setImageFile(file);
          setPhotoUrl(URL.createObjectURL(file));
          setImagePickerVisible(false);
        }
      };

      input.click();
    } catch (error) {
      console.error("Lỗi khi chọn ảnh:", error);
      toast.error("Không thể chọn ảnh");
    }
  };

  // Xử lý xóa ảnh
  const removePhoto = () => {
    setPhoto(null);
    setPhotoUrl(null);
    setImageFile(null);
    setImagePickerVisible(false);
  };

  // Upload ảnh lên storage
  const uploadImage = async (): Promise<{ photoId: string } | null> => {
    if (!imageFile && !photo) return null;

    // Nếu không có file mới nhưng có ảnh cũ
    if (!imageFile && photo) {
      return { photoId: photo };
    }

    try {
      setIsSubmitting(true);

      // Xóa ảnh cũ nếu có
      if (photo) {
        try {
          await storage.deleteFile(BUCKET_ID, photo);
          console.log("Đã xóa ảnh cũ:", photo);
        } catch (error) {
          console.error("Lỗi khi xóa ảnh cũ:", error);
        }
      }

      // Upload file mới
      console.log("Đang upload ảnh mới...");
      const response = await storage.createFile(
        BUCKET_ID,
        "unique()",
        imageFile as File
      );
      console.log("Kết quả upload ảnh:", response);

      return { photoId: response.$id };
    } catch (error) {
      console.error("Lỗi khi upload ảnh:", error);
      toast.error("Không thể tải lên ảnh khuyến mãi");
      return null;
    }
  };

  // Xử lý lưu khuyến mãi - SỬA ĐỔI
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const isValid = validateForm();
    if (!isValid) {
      toast.error("Vui lòng kiểm tra lại thông tin nhập");
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload ảnh nếu có
      const imageData = await uploadImage();
      console.log("Kết quả xử lý ảnh:", imageData);

      // Chuẩn bị details dựa vào loại khuyến mãi
      let details: string[] = [];

      if (formData.type === "buy_x_get_y") {
        details = [
          `requiredProductId:${requiredProductId}`,
          `requiredQuantity:${Number(requiredQuantity) || 1}`,
          `freeProductId:${freeProductId}`,
          `freeQuantity:${Number(freeQuantity) || 1}`,
        ];
      } else if (formData.type === "discount_product") {
        details = [
          `productId:${discountProductId}`,
          `discountType:${discountType}`,
          `discountValue:${Number(discountValue)}`,
        ];
      } else if (formData.type === "combo_deal") {
        details = [
          `productIds:${selectedComboProducts.join(",")}`,
          `comboPrice:${Number(comboPrice)}`,
        ];
      } else if (formData.type === "percent" || formData.type === "fixed") {
        details = [`discountValue:${Number(discountValue)}`];
      }

      // Dữ liệu khuyến mãi - LOẠI BỎ trường photoUrl
      const promotionData = {
        name: formData.name.trim(),
        type: formData.type,
        startDate: formatDateForStorage(formData.startDate),
        endDate: formatDateForStorage(formData.endDate),
        isActive: formData.isActive,
        description: formData.description.trim() || "",
        details: details,
        photo: imageData ? imageData.photoId : null,
        // KHÔNG lưu photoUrl vào database để tránh lỗi
      };

      console.log("Dữ liệu khuyến mãi cần lưu:", promotionData);

      if (isEditing && id) {
        // Cập nhật khuyến mãi
        const updatedPromotion = await updateItem(
          COLLECTION_IDS.promotions,
          id,
          promotionData
        );
        console.log("Khuyến mãi đã được cập nhật:", updatedPromotion);
        toast.success("Cập nhật khuyến mãi thành công");
        invalidateCache(`promotion_${id}`);
        invalidateCache("promotionsList");
        navigate(`/promotions/${id}`);
      } else {
        // Tạo khuyến mãi mới
        const newPromotion = await createItem(
          COLLECTION_IDS.promotions,
          promotionData
        );
        console.log("Khuyến mãi mới đã được tạo:", newPromotion);
        toast.success("Thêm khuyến mãi mới thành công");
        invalidateCache("promotionsList");
        navigate(`/promotions/${newPromotion.$id}`);
      }
    } catch (error) {
      console.error("Lỗi khi lưu khuyến mãi:", error);
      toast.error(
        isEditing
          ? "Không thể cập nhật khuyến mãi"
          : "Không thể tạo khuyến mãi mới"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Xử lý hủy
  const handleCancel = () => {
    if (isEditing && id) {
      navigate(`/promotions/${id}`);
    } else {
      navigate("/promotions");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={handleCancel}
            className="flex items-center text-blue-600 hover:text-blue-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            <span>Quay lại</span>
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEditing ? "Chỉnh sửa khuyến mãi" : "Thêm khuyến mãi mới"}
          </h1>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 gap-6">
              {/* Thông tin cơ bản */}
              <div className="mb-4">
                <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <Info className="h-5 w-5 mr-2 text-blue-600" />
                  Thông tin cơ bản
                </h2>
                <div className="border-b border-gray-200 pb-2 mb-4"></div>
              </div>

              {/* Tên khuyến mãi */}
              <div className="space-y-1">
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-gray-700"
                >
                  Tên khuyến mãi <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className={`mt-1 block w-full border ${
                    errors.name ? "border-red-300" : "border-gray-300"
                  } rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                  placeholder="Nhập tên khuyến mãi (VD: Khuyến mãi Giáng sinh)"
                />
                {errors.name && (
                  <p className="text-red-500 text-xs mt-1">{errors.name}</p>
                )}
              </div>

              {/* Phần cải tiến hiển thị ảnh */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  Hình ảnh khuyến mãi
                </label>

                {photoUrl ? (
                  <div className="relative w-full h-48 rounded-lg overflow-hidden border border-gray-300">
                    <img
                      src={photoUrl}
                      alt="Ảnh khuyến mãi"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-0 right-0 p-2 flex space-x-2">
                      <button
                        type="button"
                        onClick={() => setImagePickerVisible(true)}
                        className="bg-white bg-opacity-75 rounded-full p-2 hover:bg-opacity-100 transition-all"
                      >
                        <Edit className="h-5 w-5 text-gray-700" />
                      </button>
                      <button
                        type="button"
                        onClick={removePhoto}
                        className="bg-white bg-opacity-75 rounded-full p-2 hover:bg-opacity-100 transition-all"
                      >
                        <Trash2 className="h-5 w-5 text-red-600" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => setImagePickerVisible(true)}
                    className="w-full h-48 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors"
                  >
                    <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-3">
                      <Plus className="h-8 w-8 text-blue-600" />
                    </div>
                    <p className="text-gray-600 font-medium">
                      Thêm ảnh khuyến mãi
                    </p>
                    <p className="text-gray-400 text-sm mt-1">
                      Ảnh hấp dẫn sẽ thu hút khách hàng
                    </p>
                  </div>
                )}
              </div>

              {/* Loại khuyến mãi */}
              <div className="space-y-1">
                <label
                  htmlFor="type"
                  className="block text-sm font-medium text-gray-700"
                >
                  Loại khuyến mãi <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center">
                  <Tag className="h-5 w-5 text-gray-400 mr-2" />
                  <select
                    id="type"
                    name="type"
                    value={formData.type}
                    onChange={handleInputChange}
                    className={`mt-1 block w-full border ${
                      errors.type ? "border-red-300" : "border-gray-300"
                    } rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                  >
                    <option value="percent">Giảm giá %</option>
                    <option value="fixed">Giảm số tiền</option>
                    <option value="buy_x_get_y">Mua X tặng Y</option>
                    <option value="discount_product">Giảm giá sản phẩm</option>
                    <option value="combo_deal">Combo Deal</option>
                  </select>
                </div>
                {errors.type && (
                  <p className="text-red-500 text-xs mt-1">{errors.type}</p>
                )}
              </div>

              {/* Chi tiết theo loại khuyến mãi */}
              <div className="mb-4 mt-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <Tag className="h-5 w-5 mr-2 text-blue-600" />
                  Chi tiết khuyến mãi
                </h2>
                <div className="border-b border-gray-200 pb-2 mb-4"></div>
              </div>

              {/* Chi tiết cho mua X tặng Y */}
              {formData.type === "buy_x_get_y" && (
                <div className="space-y-4 p-4 bg-blue-50 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="requiredProductId"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Sản phẩm cần mua <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="requiredProductId"
                        value={requiredProductId}
                        onChange={(e) => setRequiredProductId(e.target.value)}
                        className={`mt-1 block w-full border ${
                          errors.requiredProductId
                            ? "border-red-300"
                            : "border-gray-300"
                        } rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                      >
                        <option value="">Chọn sản phẩm</option>
                        {products.map((product) => (
                          <option
                            key={`req-${product.$id}`}
                            value={product.$id}
                          >
                            {product.name}
                          </option>
                        ))}
                      </select>
                      {errors.requiredProductId && (
                        <p className="text-red-500 text-xs mt-1">
                          {errors.requiredProductId}
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="requiredQuantity"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Số lượng cần mua
                      </label>
                      <input
                        type="number"
                        id="requiredQuantity"
                        value={requiredQuantity}
                        onChange={(e) => setRequiredQuantity(e.target.value)}
                        min="1"
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="freeProductId"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Sản phẩm tặng kèm{" "}
                        <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="freeProductId"
                        value={freeProductId}
                        onChange={(e) => setFreeProductId(e.target.value)}
                        className={`mt-1 block w-full border ${
                          errors.freeProductId
                            ? "border-red-300"
                            : "border-gray-300"
                        } rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                      >
                        <option value="">Chọn sản phẩm</option>
                        {products.map((product) => (
                          <option
                            key={`free-${product.$id}`}
                            value={product.$id}
                          >
                            {product.name}
                          </option>
                        ))}
                      </select>
                      {errors.freeProductId && (
                        <p className="text-red-500 text-xs mt-1">
                          {errors.freeProductId}
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="freeQuantity"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Số lượng tặng kèm
                      </label>
                      <input
                        type="number"
                        id="freeQuantity"
                        value={freeQuantity}
                        onChange={(e) => setFreeQuantity(e.target.value)}
                        min="1"
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Chi tiết cho giảm giá sản phẩm */}
              {formData.type === "discount_product" && (
                <div className="space-y-4 p-4 bg-green-50 rounded-lg">
                  <div>
                    <label
                      htmlFor="discountProductId"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Sản phẩm giảm giá <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="discountProductId"
                      value={discountProductId}
                      onChange={(e) => setDiscountProductId(e.target.value)}
                      className={`mt-1 block w-full border ${
                        errors.discountProductId
                          ? "border-red-300"
                          : "border-gray-300"
                      } rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                    >
                      <option value="">Chọn sản phẩm</option>
                      {products.map((product) => (
                        <option key={`disc-${product.$id}`} value={product.$id}>
                          {product.name}
                        </option>
                      ))}
                    </select>
                    {errors.discountProductId && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.discountProductId}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="discountType"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Loại giảm giá
                      </label>
                      <select
                        id="discountType"
                        value={discountType}
                        onChange={(e) => setDiscountType(e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="percentage">Phần trăm (%)</option>
                        <option value="fixed">Số tiền cố định</option>
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="discountValue"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Giá trị giảm giá <span className="text-red-500">*</span>
                      </label>
                      <div className="mt-1 relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          {discountType === "percentage" ? (
                            <Percent className="h-5 w-5 text-gray-400" />
                          ) : (
                            <DollarSign className="h-5 w-5 text-gray-400" />
                          )}
                        </div>
                        <input
                          type="number"
                          id="discountValue"
                          value={discountValue}
                          onChange={(e) => setDiscountValue(e.target.value)}
                          min="0"
                          max={discountType === "percentage" ? "100" : ""}
                          className={`pl-10 block w-full border ${
                            errors.discountValue
                              ? "border-red-300"
                              : "border-gray-300"
                          } rounded-md shadow-sm py-2 pr-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                          placeholder={
                            discountType === "percentage" ? "10" : "10000"
                          }
                        />
                      </div>
                      {errors.discountValue && (
                        <p className="text-red-500 text-xs mt-1">
                          {errors.discountValue}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Chi tiết cho Combo Deal */}
              {formData.type === "combo_deal" && (
                <div className="space-y-4 p-4 bg-purple-50 rounded-lg">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Chọn sản phẩm trong combo{" "}
                      <span className="text-red-500">*</span>
                    </label>

                    <div className="max-h-60 overflow-y-auto border border-gray-300 rounded-md p-2">
                      {products.map((product) => (
                        <div
                          key={`combo-${product.$id}`}
                          className={`flex items-center justify-between p-2 mb-2 rounded cursor-pointer ${
                            selectedComboProducts.includes(product.$id)
                              ? "bg-blue-100 border border-blue-300"
                              : "bg-white border border-gray-200 hover:bg-gray-50"
                          }`}
                          onClick={() => toggleComboProduct(product.$id)}
                        >
                          <div>
                            <div className="font-medium">{product.name}</div>
                            <div className="text-sm text-gray-600">
                              {new Intl.NumberFormat("vi-VN", {
                                style: "currency",
                                currency: "VND",
                              }).format(product.price)}
                            </div>
                          </div>
                          <div
                            className={`w-5 h-5 rounded-full flex items-center justify-center ${
                              selectedComboProducts.includes(product.$id)
                                ? "bg-blue-500 text-white"
                                : "bg-gray-200"
                            }`}
                          >
                            {selectedComboProducts.includes(product.$id) && (
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-3 w-3"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {errors.selectedComboProducts && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.selectedComboProducts}
                      </p>
                    )}

                    {selectedComboProducts.length > 0 && (
                      <div className="mt-2 text-sm text-gray-600">
                        Đã chọn {selectedComboProducts.length} sản phẩm
                      </div>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="comboPrice"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Giá combo <span className="text-red-500">*</span>
                    </label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <DollarSign className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="number"
                        id="comboPrice"
                        value={comboPrice}
                        onChange={(e) => setComboPrice(e.target.value)}
                        min="0"
                        className={`pl-10 block w-full border ${
                          errors.comboPrice
                            ? "border-red-300"
                            : "border-gray-300"
                        } rounded-md shadow-sm py-2 pr-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                        placeholder="Nhập giá combo"
                      />
                    </div>
                    {errors.comboPrice && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.comboPrice}
                      </p>
                    )}
                  </div>

                  {selectedComboProducts.length > 0 && (
                    <div className="p-3 bg-white rounded-md border border-gray-200">
                      <div className="font-medium mb-2">Thông tin combo:</div>
                      <div className="text-sm">
                        <div className="mb-1">
                          Tổng giá gốc:{" "}
                          {new Intl.NumberFormat("vi-VN", {
                            style: "currency",
                            currency: "VND",
                          }).format(
                            selectedComboProducts.reduce((total, id) => {
                              const product = products.find(
                                (p) => p.$id === id
                              );
                              return total + (product ? product.price : 0);
                            }, 0)
                          )}
                        </div>

                        {comboPrice && !isNaN(Number(comboPrice)) && (
                          <>
                            <div className="mb-1">
                              Giá combo:{" "}
                              {new Intl.NumberFormat("vi-VN", {
                                style: "currency",
                                currency: "VND",
                              }).format(Number(comboPrice))}
                            </div>
                            <div className="text-green-600 font-medium">
                              Tiết kiệm:{" "}
                              {new Intl.NumberFormat("vi-VN", {
                                style: "currency",
                                currency: "VND",
                              }).format(
                                selectedComboProducts.reduce((total, id) => {
                                  const product = products.find(
                                    (p) => p.$id === id
                                  );
                                  return total + (product ? product.price : 0);
                                }, 0) - Number(comboPrice)
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Chi tiết cho percent và fixed */}
              {(formData.type === "percent" || formData.type === "fixed") && (
                <div className="space-y-4 p-4 bg-amber-50 rounded-lg">
                  <div>
                    <label
                      htmlFor="discountValue"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Giá trị giảm giá <span className="text-red-500">*</span>
                    </label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        {formData.type === "percent" ? (
                          <Percent className="h-5 w-5 text-gray-400" />
                        ) : (
                          <DollarSign className="h-5 w-5 text-gray-400" />
                        )}
                      </div>
                      <input
                        type="number"
                        id="discountValue"
                        value={discountValue}
                        onChange={(e) => setDiscountValue(e.target.value)}
                        min="0"
                        max={formData.type === "percent" ? "100" : ""}
                        className={`pl-10 block w-full border ${
                          errors.discountValue
                            ? "border-red-300"
                            : "border-gray-300"
                        } rounded-md shadow-sm py-2 pr-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                        placeholder={
                          formData.type === "percent" ? "10" : "10000"
                        }
                      />
                    </div>
                    {errors.discountValue && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.discountValue}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Thời gian */}
              <div className="mb-4 mt-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <Calendar className="h-5 w-5 mr-2 text-blue-600" />
                  Thời gian khuyến mãi
                </h2>
                <div className="border-b border-gray-200 pb-2 mb-4"></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Thời gian bắt đầu */}
                <div className="space-y-1">
                  <label
                    htmlFor="startDate"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Thời gian bắt đầu <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center">
                    <Calendar className="h-5 w-5 text-gray-400 mr-2" />
                    <input
                      type="datetime-local"
                      id="startDate"
                      name="startDate"
                      value={formData.startDate}
                      onChange={handleInputChange}
                      className={`mt-1 block w-full border ${
                        errors.startDate ? "border-red-300" : "border-gray-300"
                      } rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                    />
                  </div>
                  {errors.startDate && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.startDate}
                    </p>
                  )}
                </div>

                {/* Thời gian kết thúc */}
                <div className="space-y-1">
                  <label
                    htmlFor="endDate"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Thời gian kết thúc <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center">
                    <Calendar className="h-5 w-5 text-gray-400 mr-2" />
                    <input
                      type="datetime-local"
                      id="endDate"
                      name="endDate"
                      value={formData.endDate}
                      onChange={handleInputChange}
                      className={`mt-1 block w-full border ${
                        errors.endDate ? "border-red-300" : "border-gray-300"
                      } rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                    />
                  </div>
                  {errors.endDate && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.endDate}
                    </p>
                  )}
                </div>

                {/* Trạng thái kích hoạt */}
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Trạng thái
                  </label>
                  <div className="mt-2">
                    <label className="inline-flex items-center">
                      <input
                        type="checkbox"
                        name="isActive"
                        checked={formData.isActive}
                        onChange={handleInputChange}
                        className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50 h-5 w-5"
                      />
                      <span className="ml-2 text-gray-700">
                        Kích hoạt khuyến mãi
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Mô tả */}
              <div className="space-y-1">
                <label
                  htmlFor="description"
                  className="block text-sm font-medium text-gray-700"
                >
                  Mô tả khuyến mãi
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Nhập mô tả ngắn cho khuyến mãi..."
                />
              </div>

              {/* Submit buttons */}
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Đang lưu...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      {isEditing ? "Cập nhật" : "Lưu"}
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Modal chọn ảnh cải tiến */}
      <Modal
        isOpen={imagePickerVisible}
        onRequestClose={() => !isSubmitting && setImagePickerVisible(false)}
        style={{
          content: {
            top: "50%",
            left: "50%",
            right: "auto",
            bottom: "auto",
            marginRight: "-50%",
            transform: "translate(-50%, -50%)",
            maxWidth: "400px",
            width: "90%",
            padding: "0",
            borderRadius: "0.75rem",
            border: "none",
            boxShadow:
              "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
          },
          overlay: {
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            zIndex: 1000,
          },
        }}
        contentLabel="Chọn ảnh"
      >
        <div className="p-5">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800">
              Chọn ảnh khuyến mãi
            </h2>
            <button
              onClick={() => setImagePickerVisible(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              disabled={isSubmitting}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {isSubmitting ? (
            <div className="flex flex-col items-center justify-center py-10">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
              <p className="text-gray-600 font-medium">Đang xử lý ảnh...</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <button
                  onClick={pickImage}
                  className="flex flex-col items-center justify-center py-6 px-4 border border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-colors"
                >
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-3">
                    <ImageIcon className="h-6 w-6 text-blue-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-700">
                    Thư viện
                  </span>
                </button>

                {/* Thêm tùy chọn "Camera" nếu muốn (giả lập trải nghiệm React Native) */}
                <button
                  disabled
                  className="flex flex-col items-center justify-center py-6 px-4 border border-gray-200 rounded-xl bg-gray-50 opacity-50 cursor-not-allowed"
                >
                  <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center mb-3">
                    <Camera className="h-6 w-6 text-gray-400" />
                  </div>
                  <span className="text-sm font-medium text-gray-400">
                    Camera
                  </span>
                </button>
              </div>

              {photo && (
                <button
                  onClick={removePhoto}
                  className="w-full flex items-center justify-center py-3 px-4 border border-red-200 rounded-lg text-red-600 hover:bg-red-50 hover:border-red-300 transition-colors mb-4"
                >
                  <Trash2 className="h-5 w-5 mr-2" />
                  <span className="font-medium">Xóa ảnh</span>
                </button>
              )}

              <div className="mt-4 pt-4 border-t border-gray-100">
                <button
                  onClick={() => setImagePickerVisible(false)}
                  className="w-full text-gray-500 hover:text-gray-700 py-2 transition-colors font-medium"
                >
                  Đóng
                </button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default PromotionForm;
