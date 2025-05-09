import { useEffect, useState, useCallback } from "react";
import { useAuth } from "../../contexts/auth/authProvider";
import { useDataCache } from "../../contexts/auth/DataCacheProvider";
import {
  Trash2,
  Search,
  FilterX,
  Home,
  PlusCircle,
  Edit,
  ChefHat,
  BookOpen,
  Utensils,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import DeleteConfirmModal from "../products/DeleteConfirmModal";
import { Query } from "appwrite";

interface Recipe {
  $id: string;
  name: string;
  description: string;
  ingredients: string[];
  output: string[];
  note: string;
  userid?: string;
}

interface DisplayRecipe extends Omit<Recipe, "ingredients" | "output"> {
  ingredients: Array<{
    recipeId: string;
    recipeName: string;
    quantity?: number;
  }>;
  output: Array<{
    recipeId: string;
    recipeName: string;
    quantity?: number;
  }>;
}

const RecipeManagement = () => {
  const { getAllItems, COLLECTION_IDS, deleteItem } = useAuth();
  const { setCachedData, getCachedData } = useDataCache();
  const [recipes, setRecipes] = useState<DisplayRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [recipeToDelete, setRecipeToDelete] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [allRecipes, setAllRecipes] = useState<Recipe[]>([]);
  const [allProducts, setAllProducts] = useState<any[]>([]);

  const navigate = useNavigate();

  const handleDeleteClick = (recipeId: string) => {
    setRecipeToDelete(recipeId);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!recipeToDelete) return;

    setIsDeleting(true);
    try {
      await deleteItem(COLLECTION_IDS.recipes, recipeToDelete);

      const updatedRecipes = recipes.filter(
        (recipe) => recipe.$id !== recipeToDelete
      );
      setRecipes(updatedRecipes);
      setCachedData("recipesList", updatedRecipes, 5 * 60 * 1000);

      toast.success("Đã xóa công thức thành công");
    } catch (error) {
      console.error("Lỗi khi xóa công thức:", error);
      toast.error("Không thể xóa công thức");
    } finally {
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
      setRecipeToDelete(null);
    }
  };

  const convertRecipeData = async (recipe: Recipe): Promise<DisplayRecipe> => {
    const ingredients =
      recipe.ingredients?.map((ingredientId: string) => {
        const foundRecipe = allRecipes.find((r) => r.$id === ingredientId);
        const foundProduct = allProducts.find((p) => p.$id === ingredientId);
        return {
          recipeId: ingredientId,
          recipeName: foundRecipe
            ? foundRecipe.name
            : foundProduct
            ? foundProduct.name
            : ingredientId,
        };
      }) || [];

    const output =
      recipe.output?.map((outputId: string) => {
        const foundRecipe = allRecipes.find((r) => r.$id === outputId);
        const foundProduct = allProducts.find((p) => p.$id === outputId);
        return {
          recipeId: outputId,
          recipeName: foundRecipe
            ? foundRecipe.name
            : foundProduct
            ? foundProduct.name
            : outputId,
        };
      }) || [];

    return {
      ...recipe,
      ingredients,
      output,
    };
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const cachedRecipes = getCachedData("recipesList");

      if (cachedRecipes && refreshKey === 0) {
        console.log("Sử dụng dữ liệu công thức từ cache");
        setRecipes(cachedRecipes);
        setLoading(false);
        refreshRecipes();
      } else {
        await refreshRecipes();
      }
    } catch (error) {
      console.error("Lỗi khi tải dữ liệu:", error);
      toast.error("Không thể tải dữ liệu công thức");
      setLoading(false);
    }
  }, [refreshKey]);

  // Tải danh sách sản phẩm và công thức
  useEffect(() => {
    const loadReferenceLists = async () => {
      try {
        const [recipes, products] = await Promise.all([
          getAllItems(COLLECTION_IDS.recipes),
          getAllItems(COLLECTION_IDS.products),
        ]);
        setAllRecipes(recipes);
        setAllProducts(products);
      } catch (error) {
        console.error("Lỗi khi tải danh sách tham chiếu:", error);
      }
    };

    loadReferenceLists();
  }, [getAllItems, COLLECTION_IDS]);

  const refreshRecipes = async () => {
    try {
      const data = await getAllItems(COLLECTION_IDS.recipes);
      console.log("Tổng số công thức lấy được:", data.length);

      // Convert all recipes
      const convertedRecipes = await Promise.all(
        data.map((recipe) => convertRecipeData(recipe))
      );

      setRecipes(convertedRecipes);
      setCachedData("recipesList", convertedRecipes, 5 * 60 * 1000);
      setLoading(false);
    } catch (error) {
      console.error("Lỗi khi làm mới danh sách công thức:", error);
      if (loading) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const handleBackToHome = () => {
    navigate("/homepage");
  };

  // Xử lý chuyển hướng đến trang chi tiết công thức - CẬP NHẬT
  const handleViewRecipe = async (recipeId: string) => {
    try {
      // Hiển thị thông báo đang tải
      toast.loading("Đang tải thông tin công thức...", {
        id: "recipe-loading",
      });

      // Tìm công thức cần xem trong state hiện tại
      const recipeToView = recipes.find((recipe) => recipe.$id === recipeId);

      if (recipeToView) {
        try {
          // Tải dữ liệu đầy đủ từ server sử dụng hàm từ useAuth()
          const fullRecipeData = await getAllItems(COLLECTION_IDS.recipes, [
            Query.equal("$id", recipeId),
          ]);

          if (fullRecipeData && fullRecipeData.length > 0) {
            const recipeData = fullRecipeData[0];

            // Tạo phiên bản đầy đủ của recipe
            const fullRecipe = {
              ...recipeData,
              ingredients:
                recipeData.ingredients?.map((ingredientStr: string) => {
                  if (typeof ingredientStr !== "string") {
                    return {
                      recipeId: "",
                      recipeName: "Không xác định",
                      quantity: 1,
                    };
                  }

                  if (ingredientStr.includes(":")) {
                    const parts = ingredientStr.split(":");
                    return {
                      recipeId: parts[0] || "",
                      recipeName: parts[1] || "Không có tên",
                      quantity: parts.length > 2 ? parseInt(parts[2]) : 1,
                    };
                  }

                  // Tìm tên dựa vào ID
                  const foundRecipe = allRecipes.find(
                    (r) => r.$id === ingredientStr
                  );
                  const foundProduct = allProducts.find(
                    (p) => p.$id === ingredientStr
                  );

                  return {
                    recipeId: ingredientStr,
                    recipeName:
                      foundRecipe?.name ||
                      foundProduct?.name ||
                      "Không xác định",
                    quantity: 1,
                  };
                }) || [],
              output:
                recipeData.output?.map((outputStr: string) => {
                  if (typeof outputStr !== "string") {
                    return {
                      recipeId: "",
                      recipeName: "Không xác định",
                      quantity: 1,
                    };
                  }

                  if (outputStr.includes(":")) {
                    const parts = outputStr.split(":");
                    return {
                      recipeId: parts[0] || "",
                      recipeName: parts[1] || "Không có tên",
                      quantity: parts.length > 2 ? parseInt(parts[2]) : 1,
                    };
                  }

                  // Tìm tên dựa vào ID
                  const foundRecipe = allRecipes.find(
                    (r) => r.$id === outputStr
                  );
                  const foundProduct = allProducts.find(
                    (p) => p.$id === outputStr
                  );

                  return {
                    recipeId: outputStr,
                    recipeName:
                      foundRecipe?.name ||
                      foundProduct?.name ||
                      "Không xác định",
                    quantity: 1,
                  };
                }) || [],
            };

            // Lưu phiên bản đầy đủ vào cache
            setCachedData(`recipe_${recipeId}`, fullRecipe, 15 * 60 * 1000);
          } else {
            // Nếu không tìm được từ server, sử dụng dữ liệu từ state
            setCachedData(`recipe_${recipeId}`, recipeToView, 15 * 60 * 1000);
          }
        } catch (fetchError) {
          console.error("Lỗi khi tải dữ liệu đầy đủ:", fetchError);
          // Dùng dữ liệu có sẵn nếu không tải được từ server
          setCachedData(`recipe_${recipeId}`, recipeToView, 15 * 60 * 1000);
        }

        // Xong loading
        toast.dismiss("recipe-loading");

        // Thực hiện chuyển hướng
        navigate(`/recipes/${recipeId}`);
      } else {
        // Nếu không tìm thấy trong state, tải trực tiếp từ server
        try {
          const recipeDataList = await getAllItems(COLLECTION_IDS.recipes, [
            Query.equal("$id", recipeId),
          ]);

          if (recipeDataList && recipeDataList.length > 0) {
            const recipeData = recipeDataList[0];

            // Xử lý và lưu vào cache tương tự như trên
            const fullRecipe = {
              ...recipeData,
              ingredients:
                recipeData.ingredients?.map((ingredientStr: string) => {
                  if (typeof ingredientStr !== "string")
                    return {
                      recipeId: "",
                      recipeName: "Không xác định",
                      quantity: 1,
                    };
                  if (ingredientStr.includes(":")) {
                    const parts = ingredientStr.split(":");
                    return {
                      recipeId: parts[0] || "",
                      recipeName: parts[1] || "Không có tên",
                      quantity: parts.length > 2 ? parseInt(parts[2]) : 1,
                    };
                  }
                  const foundRecipe = allRecipes.find(
                    (r) => r.$id === ingredientStr
                  );
                  const foundProduct = allProducts.find(
                    (p) => p.$id === ingredientStr
                  );
                  return {
                    recipeId: ingredientStr,
                    recipeName:
                      foundRecipe?.name ||
                      foundProduct?.name ||
                      "Không xác định",
                    quantity: 1,
                  };
                }) || [],
              output:
                recipeData.output?.map((outputStr: string) => {
                  if (typeof outputStr !== "string")
                    return {
                      recipeId: "",
                      recipeName: "Không xác định",
                      quantity: 1,
                    };
                  if (outputStr.includes(":")) {
                    const parts = outputStr.split(":");
                    return {
                      recipeId: parts[0] || "",
                      recipeName: parts[1] || "Không có tên",
                      quantity: parts.length > 2 ? parseInt(parts[2]) : 1,
                    };
                  }
                  const foundRecipe = allRecipes.find(
                    (r) => r.$id === outputStr
                  );
                  const foundProduct = allProducts.find(
                    (p) => p.$id === outputStr
                  );
                  return {
                    recipeId: outputStr,
                    recipeName:
                      foundRecipe?.name ||
                      foundProduct?.name ||
                      "Không xác định",
                    quantity: 1,
                  };
                }) || [],
            };

            setCachedData(`recipe_${recipeId}`, fullRecipe, 15 * 60 * 1000);
          }
        } catch (directFetchError) {
          console.error("Lỗi khi tải trực tiếp từ server:", directFetchError);
        }

        toast.dismiss("recipe-loading");
        navigate(`/recipes/${recipeId}`);
      }
    } catch (error) {
      console.error("Lỗi khi tải thông tin công thức:", error);
      toast.error("Không thể tải thông tin công thức");
      toast.dismiss("recipe-loading");
    }
  };

  const handleEditRecipe = (recipeId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    navigate(`/recipes/edit/${recipeId}`);
  };

  const handleAddNewRecipe = () => {
    navigate("/recipes/new");
  };

  const filteredRecipes = recipes.filter((recipe) => {
    const matchesSearch =
      recipe.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      recipe.description?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const clearFilters = () => {
    setSearchTerm("");
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

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Quản lý công thức pha chế
            </h1>
            <p className="text-gray-600 mt-1">
              Quản lý tất cả công thức pha chế của cửa hàng AYAI-Coffee
            </p>
          </div>
          <div className="mt-4 md:mt-0 flex space-x-4">
            <button
              onClick={handleRefresh}
              className="flex items-center px-4 py-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
            >
              <svg
                className="w-5 h-5 mr-2"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M4 12C4 7.58172 7.58172 4 12 4C15.0736 4 17.7249 5.80151 19 8.5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M20 12C20 16.4183 16.4183 20 12 20C8.92638 20 6.27514 18.1985 5 15.5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M20 4V8H16"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M4 20V16H8"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Làm mới
            </button>
            <button
              onClick={handleAddNewRecipe}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <PlusCircle className="w-5 h-5 mr-2" />
              Thêm công thức mới
            </button>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-md mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Tìm kiếm công thức..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <button
                onClick={clearFilters}
                className="flex items-center justify-center px-4 py-2 w-full bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
              >
                <FilterX className="w-5 h-5 mr-2" />
                Xóa bộ lọc
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : filteredRecipes.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <ChefHat className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">
              Không tìm thấy công thức
            </h3>
            <p className="text-gray-500">
              {searchTerm
                ? "Không có công thức nào phù hợp với bộ lọc của bạn"
                : "Chưa có công thức nào trong hệ thống."}
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
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Tên công thức
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Mô tả
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Nguyên liệu
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Số bước
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
                  {filteredRecipes.map((recipe) => (
                    <tr
                      key={recipe.$id}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => handleViewRecipe(recipe.$id)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-md bg-orange-100 flex items-center justify-center">
                              <ChefHat className="h-6 w-6 text-orange-600" />
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {recipe.name}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 truncate max-w-xs">
                          {recipe.description || "Không có mô tả"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-900">
                          <Utensils className="h-4 w-4 text-green-500 mr-1" />
                          {recipe.ingredients?.length || 0} nguyên liệu
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-900">
                          <BookOpen className="h-4 w-4 text-blue-500 mr-1" />
                          {recipe.output?.length || 0} bước
                        </div>
                      </td>
                      <td
                        className="px-6 py-4 whitespace-nowrap text-right text-sm"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditRecipe(recipe.$id, e);
                          }}
                          className="text-indigo-600 hover:text-indigo-900 mr-4"
                        >
                          <Edit className="h-5 w-5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClick(recipe.$id);
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

        <DeleteConfirmModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={handleDeleteConfirm}
          title="Xóa công thức"
          message="Bạn có chắc chắn muốn xóa công thức này? Hành động này không thể hoàn tác."
          isDeleting={isDeleting}
        />
      </div>
    </div>
  );
};

export default RecipeManagement;
