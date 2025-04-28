import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/auth/authProvider";
import { useDataCache } from "../../contexts/auth/DataCacheProvider";
import { ArrowLeft, Edit, Trash2, Home } from "lucide-react";
import toast from "react-hot-toast";

interface Product {
  $id: string;
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

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { getSingleItem, COLLECTION_IDS, deleteItem } = useAuth();
  const { getCachedData, setCachedData } = useDataCache();
  const navigate = useNavigate();

  const [product, setProduct] = useState<Product | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) return;

      setLoading(true);
      try {
        // Kiểm tra cache
        const cachedProduct = getCachedData(`product_${id}`);
        if (cachedProduct) {
          setProduct(cachedProduct);
          fetchCategory(cachedProduct.category);
        } else {
          const productData = await getSingleItem(COLLECTION_IDS.products, id);
          setProduct(productData);
          // Cache sản phẩm với thời gian hết hạn 5 phút
          setCachedData(`product_${id}`, productData, 5 * 60 * 1000);
          fetchCategory(productData.category);
        }
      } catch (error) {
        console.error("Lỗi khi tải thông tin sản phẩm:", error);
        toast.error("Không thể tải thông tin sản phẩm");
      } finally {
        setLoading(false);
      }
    };

    const fetchCategory = async (categoryId: string) => {
      if (!categoryId) return;

      try {
        // Kiểm tra cache categories
        const cachedCategories = getCachedData("categoriesList");
        if (cachedCategories) {
          const foundCategory = cachedCategories.find(
            (cat: Category) => cat.$id === categoryId
          );
          if (foundCategory) {
            setCategory(foundCategory);
            return;
          }
        }

        // Nếu không có trong cache, lấy từ database
        const categoryData = await getSingleItem(
          COLLECTION_IDS.categories,
          categoryId
        );
        setCategory(categoryData);
      } catch (error) {
        console.error("Lỗi khi tải thông tin danh mục:", error);
      }
    };

    fetchProduct();
  }, [id, getSingleItem, COLLECTION_IDS, getCachedData, setCachedData]);

  const handleEdit = () => {
    navigate(`/products/edit/${id}`);
  };

  const handleDelete = async () => {
    if (!product) return;

    if (window.confirm("Bạn có chắc muốn xóa sản phẩm này?")) {
      setIsDeleting(true);
      try {
        await deleteItem(COLLECTION_IDS.products, product.$id);

        // Cập nhật cache products
        const cachedProducts = getCachedData("productsList");
        if (cachedProducts) {
          const updatedProducts = cachedProducts.filter(
            (p: Product) => p.$id !== product.$id
          );
          setCachedData("productsList", updatedProducts, 5 * 60 * 1000);
        }

        toast.success("Đã xóa sản phẩm thành công");
        navigate("/products");
      } catch (error) {
        console.error("Lỗi khi xóa sản phẩm:", error);
        toast.error("Không thể xóa sản phẩm");
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const handleBackToList = () => {
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

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <h2 className="text-xl font-bold text-red-600 mb-4">
            Không tìm thấy sản phẩm
          </h2>
          <p className="text-gray-600 mb-6">
            Sản phẩm này không tồn tại hoặc đã bị xóa
          </p>
          <button
            onClick={handleBackToList}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Quay lại danh sách sản phẩm
          </button>
        </div>
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
              onClick={handleBackToList}
              className="flex items-center text-blue-600 hover:text-blue-800 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              <span>Quay lại danh sách sản phẩm</span>
            </button>
          </div>
          <div className="flex space-x-4">
            <button
              onClick={handleEdit}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Edit className="w-5 h-5 mr-2" />
              <span>Chỉnh sửa</span>
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-5 h-5 mr-2" />
              <span>{isDeleting ? "Đang xóa..." : "Xóa sản phẩm"}</span>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="md:flex">
            <div className="md:flex-shrink-0 md:w-1/3">
              {product.photoUrl ? (
                <img
                  className="h-64 w-full object-cover md:h-full"
                  src={product.photoUrl}
                  alt={product.name}
                />
              ) : (
                <div className="h-64 w-full md:h-full bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-500 text-lg">
                    Không có hình ảnh
                  </span>
                </div>
              )}
            </div>
            <div className="p-8 md:w-2/3">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    {product.name}
                  </h1>
                  {category && (
                    <span className="px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                      {category.name}
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-600">
                    {product.price.toLocaleString()} VNĐ
                  </div>
                  <div className="text-sm text-gray-500">
                    Giá vốn: {product.cost?.toLocaleString() || "-"} VNĐ
                  </div>
                </div>
              </div>

              <div className="mt-8 border-t pt-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">
                  Thông tin sản phẩm
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Mô tả</h3>
                    <p className="mt-1 text-gray-900">
                      {product.description || "Không có mô tả"}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">
                      Ghi chú
                    </h3>
                    <p className="mt-1 text-gray-900">
                      {product.note || "Không có ghi chú"}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">
                      Tồn kho
                    </h3>
                    <p
                      className={`mt-1 ${
                        product.stock <= (product.minStock || 0)
                          ? "text-red-600 font-semibold"
                          : "text-gray-900"
                      }`}
                    >
                      {product.stock}{" "}
                      {product.stock <= (product.minStock || 0) && "(Sắp hết)"}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">
                      Ngưỡng tồn kho tối thiểu
                    </h3>
                    <p className="mt-1 text-gray-900">
                      {product.minStock || 0}
                    </p>
                  </div>
                  {product.location && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">
                        Vị trí lưu trữ
                      </h3>
                      <p className="mt-1 text-gray-900">{product.location}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
