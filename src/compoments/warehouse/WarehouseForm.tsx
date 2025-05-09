import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/auth/authProvider";
import { Home, Package, Save, Loader2, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";

interface WarehouseItem {
  $id?: string;
  productName: string;
  quantity: number;
  minStock: number;
  price: number;
  transactionDate: string;
  userId?: string;
  note?: string;
}

const WarehouseForm = () => {
  const { id } = useParams<{ id: string }>();
  const isEditMode = !!id;
  const navigate = useNavigate();
  const { getSingleItem, updateItem, createItem, COLLECTION_IDS, getAllItems } =
    useAuth();

  const [, setProducts] = useState<any[]>([]);
  const [formData, setFormData] = useState<WarehouseItem>({
    productName: "",
    quantity: 0,
    minStock: 10,
    price: 0,
    transactionDate: new Date().toISOString().split("T")[0],
    note: "",
  });
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(isEditMode);
  const [error, setError] = useState("");

  // Tải danh sách sản phẩm
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const productsData = await getAllItems(COLLECTION_IDS.products);
        setProducts(productsData);
      } catch (error) {
        console.error("Lỗi khi tải danh sách sản phẩm:", error);
        toast.error("Không thể tải danh sách sản phẩm");
      }
    };

    fetchProducts();
  }, [getAllItems, COLLECTION_IDS.products]);

  // Nếu là chế độ chỉnh sửa, tải dữ liệu mục kho hàng cần sửa
  useEffect(() => {
    const fetchWarehouseItem = async () => {
      if (!id) return;

      setFetchLoading(true);
      try {
        const item = await getSingleItem(COLLECTION_IDS.warehouse, id);
        if (item) {
          // Chuẩn bị dữ liệu để hiển thị trong form
          setFormData({
            productName: item.productName || "",
            quantity: item.quantity || 0,
            minStock: item.minStock || 10,
            price: item.price || 0,
            transactionDate: new Date(item.transactionDate)
              .toISOString()
              .split("T")[0],
            note: item.note || "",
          });
        } else {
          toast.error("Không tìm thấy mục kho hàng");
          navigate("/warehouse");
        }
      } catch (error) {
        console.error("Lỗi khi tải thông tin mục kho hàng:", error);
        toast.error("Không thể tải thông tin mục kho hàng");
        navigate("/warehouse");
      } finally {
        setFetchLoading(false);
      }
    };

    if (isEditMode) {
      fetchWarehouseItem();
    }
  }, [id, isEditMode, getSingleItem, navigate, COLLECTION_IDS.warehouse]);

  // Cập nhật dữ liệu khi người dùng nhập
  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value, type } = e.target;

    // Xử lý giá trị dựa vào loại input
    const processedValue = type === "number" ? parseFloat(value) || 0 : value;

    setFormData({
      ...formData,
      [name]: processedValue,
    });
  };

  // Xử lý khi người dùng gửi form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Kiểm tra các trường bắt buộc
      if (!formData.productName) {
        throw new Error("Vui lòng chọn sản phẩm");
      }

      if (formData.quantity < 0) {
        throw new Error("Số lượng không thể là số âm");
      }

      if (formData.price < 0) {
        throw new Error("Giá không thể là số âm");
      }

      // Chuẩn bị dữ liệu để lưu
      const itemData = {
        ...formData,
        transactionDate: new Date(formData.transactionDate).toISOString(),
      };

      let result;
      console.log("result", result);
      if (isEditMode && id) {
        // Cập nhật mục kho hàng hiện có
        result = await updateItem(COLLECTION_IDS.warehouse, id, itemData);
        toast.success("Cập nhật mục kho hàng thành công");
      } else {
        // Tạo mục kho hàng mới
        result = await createItem(COLLECTION_IDS.warehouse, itemData);
        toast.success("Thêm mục kho hàng mới thành công");
      }

      // Chuyển hướng về trang danh sách kho hàng
      navigate("/warehouse");
    } catch (error: any) {
      console.error("Lỗi khi lưu mục kho hàng:", error);
      setError(
        error.message || "Không thể lưu mục kho hàng. Vui lòng thử lại sau."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate("/warehouse");
  };

  if (fetchLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <button
          onClick={handleCancel}
          className="mb-6 flex items-center text-blue-600 hover:text-blue-800 transition-colors"
        >
          <Home className="w-5 h-5 mr-2" />
          <span>Quay lại danh sách kho hàng</span>
        </button>

        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="p-6">
            <div className="flex items-center mb-6">
              <Package className="h-8 w-8 text-blue-600 mr-3" />
              <h1 className="text-2xl font-bold text-gray-900">
                {isEditMode
                  ? "Chỉnh sửa mục kho hàng"
                  : "Thêm mục kho hàng mới"}
              </h1>
            </div>

            {error && (
              <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
                <div className="flex items-center">
                  <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                  <p className="text-red-700">{error}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 gap-6 mb-6 md:grid-cols-2">
                <div>
                  <label
                    htmlFor="productName"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Tên sản phẩm <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="productName"
                    name="productName"
                    value={formData.productName}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Nhập tên sản phẩm"
                  />
                </div>

                <div>
                  <label
                    htmlFor="quantity"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Số lượng <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    id="quantity"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleChange}
                    required
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="minStock"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Số lượng tối thiểu
                  </label>
                  <input
                    type="number"
                    id="minStock"
                    name="minStock"
                    value={formData.minStock}
                    onChange={handleChange}
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Số lượng cảnh báo khi cần nhập thêm hàng
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="price"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Giá nhập <span className="text-red-500">*</span>
                  </label>
                  <div className="relative mt-1 rounded-md shadow-sm">
                    <input
                      type="number"
                      id="price"
                      name="price"
                      value={formData.price}
                      onChange={handleChange}
                      required
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">VNĐ</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="transactionDate"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Ngày giao dịch <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    id="transactionDate"
                    name="transactionDate"
                    value={formData.transactionDate}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label
                    htmlFor="note"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Ghi chú
                  </label>
                  <textarea
                    id="note"
                    name="note"
                    rows={3}
                    value={formData.note}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Thêm ghi chú về mục kho hàng này (nếu có)"
                  />
                </div>
              </div>

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
                  disabled={loading}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Đang lưu...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      {isEditMode ? "Cập nhật" : "Lưu"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WarehouseForm;
