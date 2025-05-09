import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/auth/authProvider";
import { useDataCache } from "../../contexts/auth/DataCacheProvider";
import {
  Home,
  ChefHat,
  Edit,
  AlertCircle,
  BookOpen,
  Utensils,
  Clipboard,
  ArrowLeft,
  RefreshCw,
} from "lucide-react";
import toast from "react-hot-toast";

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
    quantity: number;
  }>;
  output: Array<{
    recipeId: string;
    recipeName: string;
    quantity: number;
  }>;
}

const RecipeDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { getSingleItem, COLLECTION_IDS, getAllItems } = useAuth();
  const { getCachedData, setCachedData } = useDataCache();
  const [recipe, setRecipe] = useState<DisplayRecipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [dataComplete, setDataComplete] = useState(false);
  const navigate = useNavigate();

  // Kiểm tra xem dữ liệu đã hoàn chỉnh chưa
  const isDataComplete = (data: DisplayRecipe | null): boolean => {
    if (!data) return false;
    if (!data.name) return false;

    // Kiểm tra ingredients
    if (!data.ingredients || data.ingredients.length === 0) return false;
    for (const ing of data.ingredients) {
      if (!ing || typeof ing !== "object") return false;
      if (!ing.recipeName) return false;
    }

    // Kiểm tra output
    if (!data.output || data.output.length === 0) return false;
    for (const out of data.output) {
      if (!out || typeof out !== "object") return false;
      if (!out.recipeName) return false;
    }

    return true;
  };

  // Hàm chuyển đổi dữ liệu recipe
  const convertRecipeData = useCallback(
    async (recipe: Recipe): Promise<DisplayRecipe> => {
      try {
        const allRecipes = await getAllItems(COLLECTION_IDS.recipes);
        const allProducts = await getAllItems(COLLECTION_IDS.products);

        const ingredients =
          recipe.ingredients?.map((ingredientId: string) => {
            // Kiểm tra nếu ingredientId không phải là string
            if (typeof ingredientId !== "string") {
              return {
                recipeId: "",
                recipeName: "Không xác định",
                quantity: 1,
              };
            }

            // Xử lý khi ingredient có định dạng "id:name:quantity"
            if (ingredientId.includes(":")) {
              const parts = ingredientId.split(":");
              return {
                recipeId: parts[0] || "",
                recipeName: parts[1] || "Không có tên",
                quantity: parts.length > 2 ? parseInt(parts[2]) : 1,
              };
            }

            // Trường hợp chỉ có ID
            const foundRecipe = allRecipes.find((r) => r.$id === ingredientId);
            const foundProduct = allProducts.find(
              (p) => p.$id === ingredientId
            );

            return {
              recipeId: ingredientId,
              recipeName:
                foundRecipe?.name || foundProduct?.name || "Không xác định",
              quantity: 1,
            };
          }) || [];

        const output =
          recipe.output?.map((outputId: string) => {
            // Kiểm tra nếu outputId không phải là string
            if (typeof outputId !== "string") {
              return {
                recipeId: "",
                recipeName: "Không xác định",
                quantity: 1,
              };
            }

            // Xử lý tương tự cho output
            if (outputId.includes(":")) {
              const parts = outputId.split(":");
              return {
                recipeId: parts[0] || "",
                recipeName: parts[1] || "Không có tên",
                quantity: parts.length > 2 ? parseInt(parts[2]) : 1,
              };
            }

            const foundRecipe = allRecipes.find((r) => r.$id === outputId);
            const foundProduct = allProducts.find((p) => p.$id === outputId);

            return {
              recipeId: outputId,
              recipeName:
                foundRecipe?.name || foundProduct?.name || "Không xác định",
              quantity: 1,
            };
          }) || [];

        const convertedData = {
          ...recipe,
          ingredients,
          output,
        };

        // Kiểm tra tính hoàn chỉnh của dữ liệu
        const complete = isDataComplete(convertedData);
        setDataComplete(complete);

        return convertedData;
      } catch (error) {
        console.error("Lỗi trong convertRecipeData:", error);
        return {
          ...recipe,
          ingredients: [],
          output: [],
        };
      }
    },
    [getAllItems, COLLECTION_IDS.recipes, COLLECTION_IDS.products]
  );

  // Hàm tải dữ liệu công thức
  const loadRecipeData = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    try {
      const data = await getSingleItem(COLLECTION_IDS.recipes, id);

      if (data) {
        const convertedData = await convertRecipeData(data);
        setRecipe(convertedData);
        setCachedData(`recipe_${id}`, convertedData, 15 * 60 * 1000);

        // Kiểm tra tính hoàn chỉnh của dữ liệu sau khi tải
        setTimeout(() => {
          const complete = isDataComplete(convertedData);
          setDataComplete(complete);
          setLoading(false);
        }, 100);
      } else {
        throw new Error("Không tìm thấy công thức");
      }
    } catch (error) {
      console.error("Lỗi khi tải dữ liệu:", error);
      toast.error("Không thể tải thông tin công thức");
      setLoading(false);
    }
  }, [
    id,
    getSingleItem,
    convertRecipeData,
    setCachedData,
    COLLECTION_IDS.recipes,
  ]);

  // Load dữ liệu khi component mount
  useEffect(() => {
    let mounted = true;

    const fetchRecipeDetail = async () => {
      if (!id) return;

      setLoading(true);
      try {
        // Kiểm tra cache trước
        const cachedRecipe = getCachedData(`recipe_${id}`);

        if (cachedRecipe && mounted) {
          setRecipe(cachedRecipe);

          // Kiểm tra tính hoàn chỉnh của dữ liệu từ cache
          const complete = isDataComplete(cachedRecipe);
          if (complete) {
            setDataComplete(true);
            setLoading(false);
          } else {
            // Nếu dữ liệu không hoàn chỉnh, tải lại từ server
            console.log("Dữ liệu từ cache không hoàn chỉnh, tải lại từ server");
            await loadRecipeData();
          }
        } else {
          // Không có cache, tải từ server
          await loadRecipeData();
        }
      } catch (error) {
        console.error("Lỗi khi tải chi tiết công thức:", error);
        if (mounted) {
          toast.error("Không thể tải thông tin công thức");
          setLoading(false);
        }
      }
    };

    fetchRecipeDetail();

    // Cleanup function để tránh memory leaks
    return () => {
      mounted = false;
    };
  }, [id, getCachedData, loadRecipeData]);

  // Xử lý khi muốn tải lại dữ liệu
  const handleRefreshData = () => {
    loadRecipeData();
  };

  const handleBackToList = () => {
    navigate("/recipes");
  };

  const handleEditRecipe = () => {
    navigate(`/recipes/edit/${id}`);
  };

  // Hiển thị trạng thái loading
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-gray-700">Đang tải thông tin công thức...</p>
          <p className="text-sm text-gray-500 mt-2">
            Vui lòng đợi trong giây lát
          </p>
        </div>
      </div>
    );
  }

  // Nếu không tìm thấy công thức
  if (!recipe) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <AlertCircle className="mx-auto h-16 w-16 text-red-500 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Không tìm thấy công thức
            </h2>
            <p className="text-gray-500 mb-4">
              Công thức này không tồn tại hoặc đã bị xóa.
            </p>
            <button
              onClick={handleBackToList}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Home className="w-5 h-5 mr-2" />
              Quay lại danh sách công thức
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Nếu dữ liệu không hoàn chỉnh
  if (!dataComplete) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <AlertCircle className="mx-auto h-16 w-16 text-yellow-500 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Dữ liệu công thức chưa đầy đủ
            </h2>
            <p className="text-gray-500 mb-4">
              Thông tin công thức này có thể không đầy đủ hoặc đang bị lỗi.
            </p>
            <div className="flex justify-center space-x-4">
              <button
                onClick={handleRefreshData}
                className="inline-flex items-center px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
              >
                <RefreshCw className="w-5 h-5 mr-2" />
                Tải lại dữ liệu
              </button>
              <button
                onClick={handleBackToList}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Home className="w-5 h-5 mr-2" />
                Quay lại danh sách công thức
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Hiển thị dữ liệu chi tiết khi đã có đầy đủ và hoàn chỉnh
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex justify-between mb-6">
          <button
            onClick={handleBackToList}
            className="flex items-center text-blue-600 hover:text-blue-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            <span>Quay lại danh sách công thức</span>
          </button>
          <button
            onClick={handleEditRecipe}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Edit className="w-5 h-5 mr-2" />
            <span>Chỉnh sửa</span>
          </button>
        </div>

        {/* Recipe Header */}
        <div className="bg-white shadow rounded-lg mb-6 overflow-hidden">
          <div className="bg-gradient-to-r from-orange-600 to-amber-600 px-6 py-12">
            <div className="flex flex-col md:flex-row items-center">
              <div className="h-24 w-24 rounded-full bg-white flex items-center justify-center mb-4 md:mb-0 md:mr-6">
                <ChefHat className="h-14 w-14 text-orange-600" />
              </div>
              <div className="text-white text-center md:text-left">
                <h1 className="text-2xl font-bold">{recipe.name}</h1>
                <div className="mt-2 flex flex-col md:flex-row md:items-center space-y-1 md:space-y-0 md:space-x-4">
                  <span className="flex items-center justify-center md:justify-start">
                    <Utensils className="h-4 w-4 mr-1" />
                    {recipe.ingredients?.length || 0} nguyên liệu
                  </span>
                  <span className="flex items-center justify-center md:justify-start">
                    <BookOpen className="h-4 w-4 mr-1" />
                    {recipe.output?.length || 0} bước
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="border-b border-gray-200">
            <div className="px-6 py-5 flex items-center">
              <div className="flex-shrink-0">
                <BookOpen className="h-8 w-8 text-orange-600 bg-orange-100 p-1.5 rounded-full" />
              </div>
              <div className="ml-4">
                <h2 className="text-lg font-medium text-gray-900">
                  Mô tả công thức
                </h2>
              </div>
            </div>
          </div>
          <div className="px-6 py-5">
            <p className="text-gray-700">
              {recipe.description || "Chưa có mô tả cho công thức này."}
            </p>
          </div>
        </div>

        {/* Ingredients */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="border-b border-gray-200">
            <div className="px-6 py-5 flex items-center">
              <div className="flex-shrink-0">
                <Utensils className="h-8 w-8 text-green-600 bg-green-100 p-1.5 rounded-full" />
              </div>
              <div className="ml-4">
                <h2 className="text-lg font-medium text-gray-900">
                  Nguyên liệu
                </h2>
              </div>
            </div>
          </div>

          <div className="px-6 py-5">
            {recipe.ingredients && recipe.ingredients.length > 0 ? (
              <div className="divide-y divide-gray-200">
                {recipe.ingredients.map((ingredient, index) => {
                  // Kiểm tra và lọc tên trước khi hiển thị
                  let displayName = ingredient?.recipeName || "Không có tên";

                  // Thêm kiểm tra trước khi sử dụng includes
                  if (
                    typeof displayName === "string" &&
                    (displayName.includes(":") ||
                      /^[a-zA-Z0-9]{10,}$/.test(displayName))
                  ) {
                    displayName = "Sản phẩm " + (index + 1);
                  }

                  return (
                    <div key={index} className="py-3 flex items-center">
                      <div className="h-6 w-6 rounded-full bg-orange-100 flex items-center justify-center mr-3">
                        <span className="text-orange-600 text-sm font-medium">
                          {index + 1}
                        </span>
                      </div>
                      <span className="text-gray-900">
                        {displayName}
                        {ingredient.quantity > 1 &&
                          ` (x${ingredient.quantity})`}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-6">
                Chưa có nguyên liệu nào được thêm vào.
              </p>
            )}
          </div>
        </div>

        {/* Steps */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="border-b border-gray-200">
            <div className="px-6 py-5 flex items-center">
              <div className="flex-shrink-0">
                <BookOpen className="h-8 w-8 text-blue-600 bg-blue-100 p-1.5 rounded-full" />
              </div>
              <div className="ml-4">
                <h2 className="text-lg font-medium text-gray-900">
                  Các bước thực hiện
                </h2>
              </div>
            </div>
          </div>
          <div className="px-6 py-5">
            {recipe.output && recipe.output.length > 0 ? (
              <div className="space-y-4">
                {recipe.output.map((output, index) => {
                  // Kiểm tra và lọc tên trước khi hiển thị
                  let displayName = output?.recipeName || "Không có tên";

                  // Thêm kiểm tra trước khi sử dụng includes
                  if (
                    typeof displayName === "string" &&
                    (displayName.includes(":") ||
                      /^[a-zA-Z0-9]{10,}$/.test(displayName))
                  ) {
                    displayName = "Bước " + (index + 1);
                  }

                  return (
                    <div key={index} className="flex">
                      <div className="flex-shrink-0 mr-4">
                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                          <span className="text-blue-600 text-sm font-medium">
                            {index + 1}
                          </span>
                        </div>
                      </div>
                      <div className="flex-grow pt-1">
                        <p className="text-gray-900">{displayName}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-6">
                Chưa có bước thực hiện nào được thêm vào.
              </p>
            )}
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="border-b border-gray-200">
            <div className="px-6 py-5 flex items-center">
              <div className="flex-shrink-0">
                <Clipboard className="h-8 w-8 text-gray-600 bg-gray-100 p-1.5 rounded-full" />
              </div>
              <div className="ml-4">
                <h2 className="text-lg font-medium text-gray-900">
                  Ghi chú bổ sung
                </h2>
              </div>
            </div>
          </div>
          <div className="px-6 py-5">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-gray-700">
                {recipe.note || "Không có ghi chú nào cho công thức này."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecipeDetail;
