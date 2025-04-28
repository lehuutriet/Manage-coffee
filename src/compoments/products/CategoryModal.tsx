// CategoryModal.tsx
import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/auth/authProvider";
import { useDataCache } from "../../contexts/auth/DataCacheProvider";
import { X, Plus, Trash2, Edit, Save } from "lucide-react";
import toast from "react-hot-toast";

interface Category {
  $id: string;
  name: string;
}

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCategoryChange?: () => void;
}

const CategoryModal: React.FC<CategoryModalProps> = ({
  isOpen,
  onClose,
  onCategoryChange,
}) => {
  const { getAllItems, createItem, updateItem, deleteItem, COLLECTION_IDS } =
    useAuth();
  const { setCachedData } = useDataCache();

  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [loading, setLoading] = useState(false);
  const [editingCategory, setEditingCategory] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [isDeleteCategoryModalOpen, setIsDeleteCategoryModalOpen] =
    useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
    }
  }, [isOpen]);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const categoriesData = await getAllItems(COLLECTION_IDS.categories);
      setCategories(categoriesData);
      // Cập nhật cache
      setCachedData("categoriesList", categoriesData, 10 * 60 * 1000);
    } catch (error) {
      console.error("Lỗi khi tải danh mục:", error);
      toast.error("Không thể tải danh sách danh mục");
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) {
      toast.error("Vui lòng nhập tên danh mục");
      return;
    }

    try {
      setLoading(true);
      const newCategory = await createItem(COLLECTION_IDS.categories, {
        name: newCategoryName.trim(),
      });

      // Cập nhật state và cache
      const updatedCategories = [...categories, newCategory];
      setCategories(updatedCategories);
      setCachedData("categoriesList", updatedCategories, 10 * 60 * 1000);

      setNewCategoryName("");
      toast.success("Đã thêm danh mục mới");

      if (onCategoryChange) {
        onCategoryChange();
      }
    } catch (error) {
      console.error("Lỗi khi thêm danh mục:", error);
      toast.error("Không thể thêm danh mục");
    } finally {
      setLoading(false);
    }
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory({ id: category.$id, name: category.name });
  };

  const handleUpdateCategory = async () => {
    if (!editingCategory) return;
    if (!editingCategory.name.trim()) {
      toast.error("Tên danh mục không được để trống");
      return;
    }

    try {
      setLoading(true);
      await updateItem(COLLECTION_IDS.categories, editingCategory.id, {
        name: editingCategory.name.trim(),
      });

      // Cập nhật state và cache
      const updatedCategories = categories.map((cat) =>
        cat.$id === editingCategory.id
          ? { ...cat, name: editingCategory.name.trim() }
          : cat
      );
      setCategories(updatedCategories);
      setCachedData("categoriesList", updatedCategories, 10 * 60 * 1000);

      setEditingCategory(null);
      toast.success("Đã cập nhật danh mục");

      if (onCategoryChange) {
        onCategoryChange();
      }
    } catch (error) {
      console.error("Lỗi khi cập nhật danh mục:", error);
      toast.error("Không thể cập nhật danh mục");
    } finally {
      setLoading(false);
    }
  };

  // Hàm để mở modal xác nhận xóa
  const openDeleteCategoryModal = (categoryId: string) => {
    setCategoryToDelete(categoryId);
    setIsDeleteCategoryModalOpen(true);
  };

  const handleDeleteCategory = async () => {
    if (!categoryToDelete) return;

    try {
      setLoading(true);
      await deleteItem(COLLECTION_IDS.categories, categoryToDelete);

      // Cập nhật state và cache
      const updatedCategories = categories.filter(
        (cat) => cat.$id !== categoryToDelete
      );
      setCategories(updatedCategories);
      setCachedData("categoriesList", updatedCategories, 10 * 60 * 1000);

      toast.success("Đã xóa danh mục");

      if (onCategoryChange) {
        onCategoryChange();
      }
    } catch (error) {
      console.error("Lỗi khi xóa danh mục:", error);
      toast.error(
        "Không thể xóa danh mục. Có thể có sản phẩm đang sử dụng danh mục này."
      );
    } finally {
      setLoading(false);
      setIsDeleteCategoryModalOpen(false);
      setCategoryToDelete(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>

        <span
          className="hidden sm:inline-block sm:align-middle sm:h-screen"
          aria-hidden="true"
        >
          &#8203;
        </span>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="flex justify-between items-center border-b px-6 py-4">
            <h3 className="text-lg font-medium text-gray-900">
              Quản lý danh mục
            </h3>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 focus:outline-none"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="px-6 py-4">
            <form onSubmit={handleAddCategory} className="flex mb-6">
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Nhập tên danh mục mới"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                type="submit"
                disabled={loading}
                className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <Plus className="w-5 h-5" />
              </button>
            </form>

            {loading && (
              <div className="flex justify-center my-4">
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            )}

            <div className="overflow-y-auto max-h-80">
              <ul className="divide-y divide-gray-200">
                {categories.length === 0 ? (
                  <li className="py-4 text-center text-gray-500">
                    Chưa có danh mục nào
                  </li>
                ) : (
                  categories.map((category) => (
                    <li key={category.$id} className="py-4">
                      {editingCategory &&
                      editingCategory.id === category.$id ? (
                        <div className="flex items-center">
                          <input
                            type="text"
                            value={editingCategory.name}
                            onChange={(e) =>
                              setEditingCategory({
                                ...editingCategory,
                                name: e.target.value,
                              })
                            }
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md mr-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                          <button
                            onClick={handleUpdateCategory}
                            disabled={loading}
                            className="mr-2 text-green-600 hover:text-green-800"
                          >
                            <Save className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => setEditingCategory(null)}
                            className="text-gray-600 hover:text-gray-800"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-800">{category.name}</span>
                          <div className="flex items-center">
                            <button
                              onClick={() => handleEditCategory(category)}
                              className="text-blue-600 hover:text-blue-800 mr-3"
                            >
                              <Edit className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() =>
                                openDeleteCategoryModal(category.$id)
                              }
                              disabled={loading}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>

          <div className="bg-gray-50 px-6 py-4 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>

      {/* Modal xác nhận xóa danh mục */}
      {isDeleteCategoryModalOpen && (
        <div className="fixed inset-0 z-[60] overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 transition-opacity"
              aria-hidden="true"
            >
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <span
              className="hidden sm:inline-block sm:align-middle sm:h-screen"
              aria-hidden="true"
            >
              &#8203;
            </span>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <svg
                      className="h-6 w-6 text-red-600"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3
                      className="text-lg leading-6 font-medium text-gray-900"
                      id="modal-title"
                    >
                      Xóa danh mục
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        Bạn có chắc chắn muốn xóa danh mục này? Các sản phẩm
                        thuộc danh mục này có thể bị ảnh hưởng. Hành động này
                        không thể hoàn tác.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm ${
                    loading ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                  onClick={handleDeleteCategory}
                  disabled={loading}
                >
                  {loading ? (
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
                      Đang xóa...
                    </>
                  ) : (
                    "Xóa"
                  )}
                </button>
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={() => setIsDeleteCategoryModalOpen(false)}
                >
                  Hủy
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryModal;
