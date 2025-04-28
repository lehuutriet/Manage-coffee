import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/auth/authProvider";
import { useDataCache } from "../../contexts/auth/DataCacheProvider";
import { ArrowLeft, Save, X, Home } from "lucide-react";
import toast from "react-hot-toast";

interface Product {
  $id?: string;
  name: string;
  price: number;
  cost: number;
  category: string;
  count: number;
  description: string;
  stock: number;
  minStock: number;
  photo?: string;
  photoUrl?: string;
  location?: string;
  userId?: string;
  note?: string;
}

interface Category {
  $id: string;
  name: string;
}

const ProductForm = () => {
  const { id } = useParams<{ id: string }>();
  const isEditMode = !!id;
  const navigate = useNavigate();

  const {
    getSingleItem,
    createItem,
    updateItem,
    getAllItems,
    COLLECTION_IDS,
    storage,
    BUCKET_ID,
  } = useAuth();
  const { getCachedData, setCachedData } = useDataCache();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);

  const [product, setProduct] = useState<Product>({
    name: "",
    price: 0,
    cost: 0,
    category: "",
    count: 0,
    description: "",
    stock: 0,
    minStock: 0,
    location: "",
    note: "",
  });

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        // Kiểm tra cache cho categories
        const cachedCategories = getCachedData("categoriesList");
        if (cachedCategories) {
          setCategories(cachedCategories);
        } else {
          // Nếu không có cache, tải từ server
          const categoriesData = await getAllItems(COLLECTION_IDS.categories);
          setCategories(categoriesData);
          // Cache với thời gian hết hạn 10 phút
          setCachedData("categoriesList", categoriesData, 10 * 60 * 1000);
        }
      } catch (error) {
        console.error("Lỗi khi tải danh mục:", error);
        toast.error("Không thể tải danh sách danh mục");
      }
    };

    const fetchProduct = async () => {
      if (!isEditMode) {
        setLoading(false);
        return;
      }

      try {
        // Kiểm tra cache
        const cachedProduct = getCachedData(`product_${id}`);
        if (cachedProduct) {
          setProduct(cachedProduct);
          if (cachedProduct.photoUrl) {
            setPreviewImage(cachedProduct.photoUrl);
          }
        } else {
          const productData = await getSingleItem(COLLECTION_IDS.products, id!);
          setProduct(productData);
          if (productData.photoUrl) {
            setPreviewImage(productData.photoUrl);
          }
          // Cache sản phẩm
          setCachedData(`product_${id}`, productData, 5 * 60 * 1000);
        }
      } catch (error) {
        console.error("Lỗi khi tải thông tin sản phẩm:", error);
        toast.error("Không thể tải thông tin sản phẩm");
        navigate("/products");
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
    fetchProduct();
  }, [
    isEditMode,
    id,
    getSingleItem,
    getAllItems,
    setCachedData,
    getCachedData,
  ]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    let processedValue: any = value;

    // Chuyển đổi giá trị thành số cho các trường số
    if (["price", "cost", "stock", "minStock", "count"].includes(name)) {
      processedValue = value === "" ? 0 : Number(value);
    }

    setProduct((prev) => ({ ...prev, [name]: processedValue }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Kiểm tra kích thước file (giới hạn 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Kích thước file quá lớn. Vui lòng chọn file nhỏ hơn 5MB.");
      return;
    }

    // Kiểm tra loại file
    if (!file.type.startsWith("image/")) {
      toast.error("Vui lòng chọn file hình ảnh.");
      return;
    }

    // Tạo URL xem trước
    const previewUrl = URL.createObjectURL(file);
    setPreviewImage(previewUrl);
    setFileToUpload(file);
  };

  const clearImage = () => {
    setPreviewImage(null);
    setFileToUpload(null);
    setProduct((prev) => ({
      ...prev,
      photo: undefined,
      photoUrl: undefined,
    }));
  };

  const uploadImage = async (): Promise<{
    fileId: string;
    fileUrl: string;
  } | null> => {
    if (!fileToUpload) {
      // Nếu không có file mới và đang trong chế độ chỉnh sửa, giữ nguyên thông tin ảnh cũ
      if (isEditMode && product.photo) {
        return {
          fileId: product.photo,
          fileUrl: product.photoUrl || "",
        };
      }
      return null;
    }

    try {
      // Upload file
      const uploadResponse = await storage.createFile(
        BUCKET_ID,
        "unique()",
        fileToUpload
      );

      // Lấy URL của file
      const fileUrl = storage.getFileView(BUCKET_ID, uploadResponse.$id);

      return {
        fileId: uploadResponse.$id,
        fileUrl,
      };
    } catch (error) {
      console.error("Lỗi khi tải lên hình ảnh:", error);
      throw new Error("Không thể tải lên hình ảnh");
    }
  };

  // Trong hàm handleSubmit của ProductForm.tsx

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Validate
      if (!product.name.trim()) {
        toast.error("Vui lòng nhập tên sản phẩm");
        setSubmitting(false);
        return;
      }

      if (!product.category) {
        toast.error("Vui lòng chọn danh mục sản phẩm");
        setSubmitting(false);
        return;
      }

      let imageData = null;
      if (fileToUpload) {
        try {
          imageData = await uploadImage();
        } catch (error) {
          toast.error("Lỗi khi tải lên hình ảnh. Vui lòng thử lại.");
          setSubmitting(false);
          return;
        }
      }

      // Lọc các thuộc tính hệ thống (bắt đầu bằng $)
      const filteredProduct = Object.fromEntries(
        Object.entries(product).filter(([key]) => !key.startsWith("$"))
      );

      // Chuẩn bị dữ liệu sản phẩm
      const productData = {
        ...filteredProduct,
      };

      // Cập nhật thông tin ảnh nếu có
      if (imageData) {
        productData.photo = imageData.fileId;
        productData.photoUrl = imageData.fileUrl;
      }

      let result;
      if (isEditMode) {
        // Cập nhật sản phẩm
        result = await updateItem(COLLECTION_IDS.products, id!, productData);
        toast.success("Cập nhật sản phẩm thành công");
      } else {
        // Tạo sản phẩm mới
        result = await createItem(COLLECTION_IDS.products, productData);
        toast.success("Thêm sản phẩm mới thành công");
      }

      setCachedData(`product_${result.$id}`, result, 5 * 60 * 1000);

      // Cập nhật danh sách sản phẩm trong cache
      const cachedProducts = getCachedData("productsList");
      if (cachedProducts) {
        let updatedProducts;
        if (isEditMode) {
          updatedProducts = cachedProducts.map((p: Product) =>
            p.$id === result.$id ? result : p
          );
        } else {
          updatedProducts = [...cachedProducts, result];
        }
        setCachedData("productsList", updatedProducts, 5 * 60 * 1000);
      }

      // Chuyển hướng
      navigate("/products");
    } catch (error) {
      console.error("Lỗi khi lưu sản phẩm:", error);
      toast.error(
        isEditMode
          ? "Không thể cập nhật sản phẩm"
          : "Không thể thêm sản phẩm mới"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate("/products");
  };

  const handleBackToHome = () => {
    navigate("/homepage");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex justify-between items-center mb-6">
          <div className="flex space-x-4">
            <button
              onClick={handleBackToHome}
              className="flex items-center text-blue-600 hover:text-blue-800 transition-colors"
            >
              <Home className="w-5 h-5 mr-2" />
              <span>Trang chủ</span>
            </button>
            <button
              onClick={handleCancel}
              className="flex items-center text-blue-600 hover:text-blue-800 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              <span>
                {isEditMode
                  ? "Quay lại chi tiết sản phẩm"
                  : "Quay lại danh sách"}
              </span>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">
              {isEditMode ? "Chỉnh sửa sản phẩm" : "Thêm sản phẩm mới"}
            </h1>
          </div>

          <form onSubmit={handleSubmit} className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-6">
                <div>
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Tên sản phẩm <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={product.name}
                    onChange={handleChange}
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="category"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Danh mục <span className="text-red-600">*</span>
                  </label>
                  <select
                    id="category"
                    name="category"
                    value={product.category}
                    onChange={handleChange}
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">-- Chọn danh mục --</option>
                    {categories.map((category) => (
                      <option key={category.$id} value={category.$id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="price"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Giá bán <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="number"
                      id="price"
                      name="price"
                      value={product.price}
                      onChange={handleChange}
                      min="0"
                      required
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="cost"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Giá vốn
                    </label>
                    <input
                      type="number"
                      id="cost"
                      name="cost"
                      value={product.cost}
                      onChange={handleChange}
                      min="0"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="stock"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Tồn kho <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="number"
                      id="stock"
                      name="stock"
                      value={product.stock}
                      onChange={handleChange}
                      min="0"
                      required
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="minStock"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Tồn kho tối thiểu
                    </label>
                    <input
                      type="number"
                      id="minStock"
                      name="minStock"
                      value={product.minStock}
                      onChange={handleChange}
                      min="0"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="location"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Vị trí lưu trữ
                  </label>
                  <input
                    type="text"
                    id="location"
                    name="location"
                    value={product.location || ""}
                    onChange={handleChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label
                    htmlFor="description"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Mô tả sản phẩm
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={product.description || ""}
                    onChange={handleChange}
                    rows={3}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="note"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Ghi chú
                  </label>
                  <textarea
                    id="note"
                    name="note"
                    value={product.note || ""}
                    onChange={handleChange}
                    rows={3}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hình ảnh sản phẩm
                  </label>
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                    {previewImage ? (
                      <div className="relative">
                        <img
                          src={previewImage}
                          alt="Preview"
                          className="max-h-64 max-w-full object-contain"
                        />
                        <button
                          type="button"
                          onClick={clearImage}
                          className="absolute top-0 right-0 bg-red-600 text-white rounded-full p-1 transform translate-x-1/2 -translate-y-1/2"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-1 text-center">
                        <svg
                          className="mx-auto h-12 w-12 text-gray-400"
                          stroke="currentColor"
                          fill="none"
                          viewBox="0 0 48 48"
                          aria-hidden="true"
                        >
                          <path
                            d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                            strokeWidth={2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        <div className="flex text-sm text-gray-600">
                          <label
                            htmlFor="file-upload"
                            className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                          >
                            <span>Tải lên hình ảnh</span>
                            <input
                              id="file-upload"
                              name="file-upload"
                              type="file"
                              className="sr-only"
                              accept="image/*"
                              onChange={handleImageChange}
                            />
                          </label>
                          <p className="pl-1">hoặc kéo và thả</p>
                        </div>
                        <p className="text-xs text-gray-500">
                          PNG, JPG, GIF tối đa 5MB
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-5 border-t border-gray-200 flex justify-end space-x-3">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center"
              >
                {submitting ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Đang lưu...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    {isEditMode ? "Cập nhật" : "Tạo sản phẩm"}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProductForm;
