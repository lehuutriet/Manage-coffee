import { useEffect, useState } from "react";
import { useAuth } from "../../contexts/auth/authProvider";
import { useDataCache } from "../../contexts/auth/DataCacheProvider";
import {
  PlusCircle,
  Edit,
  Trash2,
  Search,
  Coffee,
  FilterX,
  Home,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import toast from "react-hot-toast";

interface Product {
  $id: string;
  name: string;
  price: number;
  cost: number;
  category: string; // Category ID
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

const ProductManagement = () => {
  const { getAllItems, COLLECTION_IDS, deleteItem } = useAuth();
  const { getCachedData, setCachedData } = useDataCache();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Product | null;
    direction: "asc" | "desc";
  }>({ key: null, direction: "asc" });

  const navigate = useNavigate();

  // Lấy dữ liệu danh mục và sản phẩm
  const fetchData = async () => {
    setLoading(true);
    try {
      // Kiểm tra cache cho categories
      const cachedCategories = getCachedData("categoriesList");
      if (!cachedCategories) {
        // Nếu không có cache, tải từ server
        const categoriesData = await getAllItems(COLLECTION_IDS.categories);
        setCategories(categoriesData);
        // Cập nhật cache với thời gian hết hạn 10 phút
        setCachedData("categoriesList", categoriesData, 10 * 60 * 1000);
      } else {
        setCategories(cachedCategories);
      }

      // Kiểm tra cache cho products
      const cachedProducts = getCachedData("productsList");
      if (cachedProducts) {
        setProducts(cachedProducts);
        setLoading(false);
        // Vẫn tải lại dữ liệu mới từ server nhưng không chờ đợi
        refreshProducts();
      } else {
        // Nếu không có cache, tải từ server
        await refreshProducts();
      }
    } catch (error) {
      console.error("Lỗi khi tải dữ liệu:", error);
      toast.error("Không thể tải dữ liệu sản phẩm");
      setLoading(false);
    }
  };
  const handleBackToHome = () => {
    navigate("/homepage");
  };
  const refreshProducts = async () => {
    try {
      const data = await getAllItems(COLLECTION_IDS.products);
      setProducts(data);

      // Cập nhật cache với thời gian hết hạn 5 phút
      setCachedData("productsList", data, 5 * 60 * 1000);

      setLoading(false);
    } catch (error) {
      console.error("Lỗi khi làm mới danh sách sản phẩm:", error);
      if (loading) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Lấy tên danh mục từ ID
  const getCategoryName = (categoryId: string) => {
    const category = categories.find((cat) => cat.$id === categoryId);
    return category ? category.name : "Chưa phân loại";
  };

  // Chức năng xóa sản phẩm
  const handleDeleteProduct = async (productId: string) => {
    if (window.confirm("Bạn có chắc muốn xóa sản phẩm này?")) {
      setIsDeleting(true);
      try {
        await deleteItem(COLLECTION_IDS.products, productId);
        // Cập nhật danh sách sản phẩm sau khi xóa
        setProducts(products.filter((product) => product.$id !== productId));
        // Cập nhật cache
        setCachedData(
          "productsList",
          products.filter((product) => product.$id !== productId),
          5 * 60 * 1000
        );
        toast.success("Đã xóa sản phẩm thành công");
      } catch (error) {
        console.error("Lỗi khi xóa sản phẩm:", error);
        toast.error("Không thể xóa sản phẩm");
      } finally {
        setIsDeleting(false);
      }
    }
  };

  // Chức năng sắp xếp
  const requestSort = (key: keyof Product) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  // Áp dụng bộ lọc và sắp xếp
  const filteredProducts = products
    .filter((product) => {
      const matchesSearch =
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter
        ? product.category === categoryFilter
        : true;
      return matchesSearch && matchesCategory;
    })
    // Sửa phần hàm sort trong ProductManagement.tsx
    .sort((a, b) => {
      if (!sortConfig.key) return 0;

      if (sortConfig.key === "category") {
        // Sắp xếp theo tên danh mục thay vì ID
        const nameA = getCategoryName(a.category || "").toLowerCase();
        const nameB = getCategoryName(b.category || "").toLowerCase();
        return sortConfig.direction === "asc"
          ? nameA.localeCompare(nameB)
          : nameB.localeCompare(nameA);
      }

      const valueA = a[sortConfig.key] ?? 0; // Sử dụng nullish coalescing
      const valueB = b[sortConfig.key] ?? 0;

      // Xử lý cho chuỗi
      if (typeof valueA === "string" && typeof valueB === "string") {
        return sortConfig.direction === "asc"
          ? valueA.localeCompare(valueB)
          : valueB.localeCompare(valueA);
      }

      // Xử lý cho số và các kiểu dữ liệu khác
      if (valueA === valueB) return 0;

      return sortConfig.direction === "asc"
        ? valueA < valueB
          ? -1
          : 1
        : valueA > valueB
        ? -1
        : 1;
    });

  // Xử lý chuyển hướng đến trang tạo sản phẩm mới
  const handleAddNewProduct = () => {
    navigate("/products/new");
  };

  // Xử lý chuyển hướng đến trang chỉnh sửa
  const handleEditProduct = (productId: string) => {
    navigate(`/products/edit/${productId}`);
  };

  // Xử lý xem chi tiết sản phẩm
  const handleViewProduct = (productId: string) => {
    navigate(`/products/${productId}`);
  };

  // Hủy bộ lọc
  const clearFilters = () => {
    setSearchTerm("");
    setCategoryFilter("");
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
        {/* Tiêu đề và nút thêm mới */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Quản lý sản phẩm
            </h1>
            <p className="text-gray-600 mt-1">
              Quản lý tất cả sản phẩm của cửa hàng AYAI-Coffee
            </p>
          </div>
          <button
            onClick={handleAddNewProduct}
            className="mt-4 md:mt-0 flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <PlusCircle className="w-5 h-5 mr-2" />
            Thêm sản phẩm mới
          </button>
        </div>

        {/* Bộ lọc và tìm kiếm */}
        <div className="bg-white p-4 rounded-lg shadow-md mb-6">
          <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
            <div className="relative flex-1">
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
            <div className="flex-1">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Tất cả danh mục</option>
                {categories.map((category) => (
                  <option key={category.$id} value={category.$id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={clearFilters}
              className="flex items-center justify-center px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
            >
              <FilterX className="w-5 h-5 mr-2" />
              Xóa bộ lọc
            </button>
          </div>
        </div>

        {/* Danh sách sản phẩm */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <Coffee className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">
              Không tìm thấy sản phẩm
            </h3>
            <p className="text-gray-500">
              {searchTerm || categoryFilter
                ? "Không có sản phẩm nào phù hợp với bộ lọc của bạn"
                : "Chưa có sản phẩm nào. Hãy thêm sản phẩm mới!"}
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
                      Tên sản phẩm
                      {sortConfig.key === "name" && (
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
                      Giá bán
                      {sortConfig.key === "price" && (
                        <span>
                          {sortConfig.direction === "asc" ? " ↑" : " ↓"}
                        </span>
                      )}
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => requestSort("category")}
                    >
                      Danh mục
                      {sortConfig.key === "category" && (
                        <span>
                          {sortConfig.direction === "asc" ? " ↑" : " ↓"}
                        </span>
                      )}
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => requestSort("stock")}
                    >
                      Tồn kho
                      {sortConfig.key === "stock" && (
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
                  {filteredProducts.map((product) => (
                    <tr
                      key={product.$id}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => handleViewProduct(product.$id)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            {product.photoUrl ? (
                              <img
                                className="h-10 w-10 rounded-md object-cover"
                                src={product.photoUrl}
                                alt={product.name}
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-md bg-gray-200 flex items-center justify-center">
                                <Coffee className="h-6 w-6 text-gray-500" />
                              </div>
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {product.name}
                            </div>
                            <div className="text-sm text-gray-500 truncate max-w-xs">
                              {product.description || "Không có mô tả"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {product.price.toLocaleString()} VNĐ
                        </div>
                        <div className="text-sm text-gray-500">
                          Giá vốn: {product.cost?.toLocaleString() || "-"} VNĐ
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                          {getCategoryName(product.category)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div
                          className={`text-sm ${
                            product.stock <= (product.minStock || 0)
                              ? "text-red-600 font-semibold"
                              : "text-gray-900"
                          }`}
                        >
                          {product.stock}{" "}
                          {product.stock <= (product.minStock || 0) &&
                            "(Sắp hết)"}
                        </div>
                      </td>
                      <td
                        className="px-6 py-4 whitespace-nowrap text-right text-sm"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditProduct(product.$id);
                          }}
                          className="text-indigo-600 hover:text-indigo-900 mr-4"
                        >
                          <Edit className="h-5 w-5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteProduct(product.$id);
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
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductManagement;
