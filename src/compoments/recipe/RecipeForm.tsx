import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../contexts/auth/authProvider";
import { useDataCache } from "../../contexts/auth/DataCacheProvider";
import {
  Save,
  ArrowLeft,
  ChefHat,
  Plus,
  X,
  Loader2,
  Utensils,
  BookOpen,
  Clipboard,
} from "lucide-react";
import toast from "react-hot-toast";

interface Recipe {
  $id?: string;
  name: string;
  description: string;
  ingredients: string[];
  output: string[];
  note: string;
}

interface RecipeData {
  $id: string;
  name: string;
  description: string;
}

interface RecipeFormData {
  $id?: string;
  name: string;
  description: string;
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
  note: string;
}

interface RecipeFormProps {
  isEditing?: boolean;
}

const RecipeForm = ({ isEditing = false }: RecipeFormProps) => {
  const { id } = useParams<{ id: string }>();
  const { createItem, updateItem, getSingleItem, COLLECTION_IDS, getAllItems } =
    useAuth();
  const { getCachedData, setCachedData, invalidateCache } = useDataCache();
  const navigate = useNavigate();

  const [allRecipes, setAllRecipes] = useState<RecipeData[]>([]);
  const [allProducts, setAllProducts] = useState<RecipeData[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState<RecipeFormData>({
    name: "",
    description: "",
    ingredients: [{ recipeId: "", recipeName: "", quantity: 1 }],
    output: [{ recipeId: "", recipeName: "", quantity: 1 }],
    note: "",
  });

  // Kiểm tra xem form đã có đủ dữ liệu chưa
  const isFormDataComplete = () => {
    // Nếu là form thêm mới, không cần kiểm tra dữ liệu có sẵn
    if (!isEditing) return true;

    // Kiểm tra các trường cơ bản
    if (!formData.name) return false;

    // Kiểm tra ingredients
    if (formData.ingredients.length === 0) return false;
    for (const ing of formData.ingredients) {
      if (!ing.recipeId || !ing.recipeName) return false;
    }

    // Kiểm tra output
    if (formData.output.length === 0) return false;
    for (const out of formData.output) {
      if (!out.recipeId || !out.recipeName) return false;
    }

    return true;
  };

  // useEffect kết hợp để tải tất cả dữ liệu
  useEffect(() => {
    const loadAllData = async () => {
      setLoading(true);

      try {
        // Tải danh sách recipes và products
        console.log("Đang tải danh sách recipes và products");
        const [recipes, products] = await Promise.all([
          getAllItems(COLLECTION_IDS.recipes),
          getAllItems(COLLECTION_IDS.products),
        ]);

        setAllRecipes(recipes);
        setAllProducts(products);
        console.log("Đã tải xong danh sách recipes và products");

        // Nếu đang chỉnh sửa, tải dữ liệu công thức
        if (isEditing && id) {
          console.log("Đang tải dữ liệu công thức:", id);

          // Hàm chuyển đổi dữ liệu recipe thành formData
          const convertRecipeData = async (
            recipe: Recipe
          ): Promise<RecipeFormData> => {
            try {
              // Xử lý ingredients
              const ingredients = recipe.ingredients?.map(
                (ingredientStr: string) => {
                  if (typeof ingredientStr !== "string") {
                    return {
                      recipeId: "",
                      recipeName: "Lỗi dữ liệu",
                      quantity: 1,
                    };
                  }

                  // Xử lý định dạng "id:name:quantity"
                  if (ingredientStr.includes(":")) {
                    const parts = ingredientStr.split(":");
                    return {
                      recipeId: parts[0] || "",
                      recipeName: parts[1] || "Không có tên",
                      quantity: parts.length > 2 ? parseInt(parts[2]) || 1 : 1,
                    };
                  }

                  // Xử lý trường hợp chỉ có ID
                  const foundRecipe = recipes.find(
                    (r) => r.$id === ingredientStr
                  );
                  const foundProduct = products.find(
                    (p) => p.$id === ingredientStr
                  );

                  return {
                    recipeId: ingredientStr,
                    recipeName:
                      foundRecipe?.name || foundProduct?.name || ingredientStr,
                    quantity: 1,
                  };
                }
              ) || [{ recipeId: "", recipeName: "", quantity: 1 }];

              // Xử lý output
              const output = recipe.output?.map((outputStr: string) => {
                if (typeof outputStr !== "string") {
                  return {
                    recipeId: "",
                    recipeName: "Lỗi dữ liệu",
                    quantity: 1,
                  };
                }

                // Xử lý định dạng "id:name:quantity"
                if (outputStr.includes(":")) {
                  const parts = outputStr.split(":");
                  return {
                    recipeId: parts[0] || "",
                    recipeName: parts[1] || "Không có tên",
                    quantity: parts.length > 2 ? parseInt(parts[2]) || 1 : 1,
                  };
                }

                // Xử lý trường hợp chỉ có ID
                const foundRecipe = recipes.find((r) => r.$id === outputStr);
                const foundProduct = products.find((p) => p.$id === outputStr);

                return {
                  recipeId: outputStr,
                  recipeName:
                    foundRecipe?.name || foundProduct?.name || outputStr,
                  quantity: 1,
                };
              }) || [{ recipeId: "", recipeName: "", quantity: 1 }];

              return {
                ...recipe,
                ingredients,
                output,
              };
            } catch (error) {
              console.error("Lỗi trong convertRecipeData:", error);
              return {
                ...recipe,
                ingredients: [{ recipeId: "", recipeName: "", quantity: 1 }],
                output: [{ recipeId: "", recipeName: "", quantity: 1 }],
              };
            }
          };

          // Thử lấy từ cache trước
          const cachedRecipe = getCachedData(`recipe_${id}`);
          let recipeData: Recipe | null = null;

          if (cachedRecipe) {
            console.log("Sử dụng dữ liệu công thức từ cache");
            recipeData = cachedRecipe;
          } else {
            // Không có cache, tải từ server
            console.log("Tải dữ liệu công thức từ server");
            recipeData = await getSingleItem(COLLECTION_IDS.recipes, id);

            if (recipeData) {
              // Lưu vào cache
              setCachedData(`recipe_${id}`, recipeData, 15 * 60 * 1000);
            } else {
              throw new Error("Không tìm thấy công thức");
            }
          }

          // Chuyển đổi dữ liệu và cập nhật formData
          if (recipeData) {
            const convertedData = await convertRecipeData(recipeData);
            console.log("Đã chuyển đổi dữ liệu:", convertedData);
            setFormData(convertedData);

            // Kiểm tra lại sau khi cập nhật formData
            setTimeout(() => {
              if (isFormDataComplete()) {
                console.log("Dữ liệu đã đầy đủ, tắt loading");
                setLoading(false);
              } else {
                console.log("Dữ liệu chưa đầy đủ, thử tải lại...");
                // Nếu dữ liệu chưa đầy đủ, thử tải lại từ server
                loadRecipeFromServer();
              }
            }, 100);
          }
        } else {
          // Không phải chỉnh sửa, tắt loading
          setLoading(false);
        }
      } catch (error) {
        console.error("Lỗi khi tải dữ liệu:", error);
        toast.error("Không thể tải đầy đủ dữ liệu. Vui lòng tải lại trang.");
        setLoading(false);
      }
    };

    // Hàm tải dữ liệu công thức trực tiếp từ server
    const loadRecipeFromServer = async () => {
      if (!isEditing || !id) return;

      try {
        console.log("Đang tải dữ liệu công thức trực tiếp từ server");
        const recipeData = await getSingleItem(COLLECTION_IDS.recipes, id);

        if (recipeData) {
          // Chuyển đổi dữ liệu
          const convertedData = {
            ...recipeData,
            ingredients:
              recipeData.ingredients?.map((item: string) => {
                if (item.includes(":")) {
                  const parts = item.split(":");
                  return {
                    recipeId: parts[0] || "",
                    recipeName: parts[1] || "",
                    quantity: parts[2] ? parseInt(parts[2]) : 1,
                  };
                }
                return {
                  recipeId: item,
                  recipeName: "Không xác định",
                  quantity: 1,
                };
              }) || [],
            output:
              recipeData.output?.map((item: string) => {
                if (item.includes(":")) {
                  const parts = item.split(":");
                  return {
                    recipeId: parts[0] || "",
                    recipeName: parts[1] || "",
                    quantity: parts[2] ? parseInt(parts[2]) : 1,
                  };
                }
                return {
                  recipeId: item,
                  recipeName: "Không xác định",
                  quantity: 1,
                };
              }) || [],
          };

          setFormData(convertedData);
          setCachedData(`recipe_${id}`, recipeData, 15 * 60 * 1000);

          // Kiểm tra lại sau khi cập nhật formData
          setTimeout(() => {
            if (isFormDataComplete()) {
              setLoading(false);
            } else {
              // Nếu vẫn không đủ dữ liệu sau nhiều lần thử, hiển thị form với dữ liệu hiện có
              console.log("Không thể tải đầy đủ dữ liệu sau nhiều lần thử.");
              setLoading(false);
              toast(
                "Dữ liệu có thể không đầy đủ. Vui lòng kiểm tra lại trước khi lưu.",
                {
                  icon: "⚠️",
                  style: {
                    background: "#FEF3C7",
                    color: "#92400E",
                  },
                }
              );
            }
          }, 100);
        } else {
          throw new Error("Không tìm thấy công thức");
        }
      } catch (error) {
        console.error("Lỗi khi tải dữ liệu công thức từ server:", error);
        setLoading(false);
        toast.error("Không thể tải đầy đủ thông tin công thức.");
      }
    };

    loadAllData();
  }, [
    isEditing,
    id,
    getAllItems,
    getSingleItem,
    getCachedData,
    setCachedData,
    COLLECTION_IDS,
  ]);

  // Các hàm xử lý form - giữ nguyên như code cũ
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Vui lòng nhập tên công thức";
    }

    // Kiểm tra ingredients
    formData.ingredients.forEach((ingredient, index) => {
      if (!ingredient.recipeId) {
        newErrors[`ingredient-${index}`] = "Vui lòng chọn nguyên liệu";
      }
      if (!ingredient.quantity || ingredient.quantity <= 0) {
        newErrors[`ingredient-quantity-${index}`] = "Số lượng phải lớn hơn 0";
      }
    });

    // Kiểm tra output
    formData.output.forEach((output, index) => {
      if (!output.recipeId) {
        newErrors[`output-${index}`] = "Vui lòng chọn sản phẩm đầu ra";
      }
      if (!output.quantity || output.quantity <= 0) {
        newErrors[`output-quantity-${index}`] = "Số lượng phải lớn hơn 0";
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });

    if (errors[name]) {
      setErrors({ ...errors, [name]: "" });
    }
  };

  const addIngredient = () => {
    setFormData({
      ...formData,
      ingredients: [
        ...formData.ingredients,
        { recipeId: "", recipeName: "", quantity: 1 },
      ],
    });
  };

  const removeIngredient = (index: number) => {
    const newIngredients = formData.ingredients.filter((_, i) => i !== index);
    setFormData({ ...formData, ingredients: newIngredients });

    const newErrors = { ...errors };
    delete newErrors[`ingredient-${index}`];
    delete newErrors[`ingredient-quantity-${index}`];
    setErrors(newErrors);
  };

  const updateIngredient = (
    index: number,
    field: string,
    value: string | number
  ) => {
    const newIngredients = [...formData.ingredients];
    newIngredients[index] = { ...newIngredients[index], [field]: value };
    setFormData({ ...formData, ingredients: newIngredients });

    if (errors[`ingredient-${index}`] && field === "recipeId") {
      const newErrors = { ...errors };
      delete newErrors[`ingredient-${index}`];
      setErrors(newErrors);
    }

    if (errors[`ingredient-quantity-${index}`] && field === "quantity") {
      const newErrors = { ...errors };
      delete newErrors[`ingredient-quantity-${index}`];
      setErrors(newErrors);
    }
  };

  const addOutput = () => {
    setFormData({
      ...formData,
      output: [
        ...formData.output,
        { recipeId: "", recipeName: "", quantity: 1 },
      ],
    });
  };

  const removeOutput = (index: number) => {
    const newOutputs = formData.output.filter((_, i) => i !== index);
    setFormData({ ...formData, output: newOutputs });

    const newErrors = { ...errors };
    delete newErrors[`output-${index}`];
    delete newErrors[`output-quantity-${index}`];
    setErrors(newErrors);
  };

  const updateOutput = (
    index: number,
    field: string,
    value: string | number
  ) => {
    const newOutputs = [...formData.output];
    newOutputs[index] = { ...newOutputs[index], [field]: value };
    setFormData({ ...formData, output: newOutputs });

    if (errors[`output-${index}`] && field === "recipeId") {
      const newErrors = { ...errors };
      delete newErrors[`output-${index}`];
      setErrors(newErrors);
    }

    if (errors[`output-quantity-${index}`] && field === "quantity") {
      const newErrors = { ...errors };
      delete newErrors[`output-quantity-${index}`];
      setErrors(newErrors);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const isValid = validateForm();
    if (!isValid) {
      toast.error("Vui lòng kiểm tra lại thông tin nhập");
      return;
    }

    setIsSubmitting(true);

    try {
      // Chuyển đổi ingredients sang định dạng "id:name:quantity"
      const ingredientsArray = formData.ingredients.map(
        (ing) => `${ing.recipeId}:${ing.recipeName}:${ing.quantity}`
      );

      // Chuyển đổi output sang định dạng "id:name:quantity"
      const outputArray = formData.output.map(
        (out) => `${out.recipeId}:${out.recipeName}:${out.quantity}`
      );

      const recipeData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        ingredients: ingredientsArray,
        output: outputArray,
        note: formData.note || "",
      };

      console.log("Saving recipe data:", recipeData);

      if (isEditing && id) {
        await updateItem(COLLECTION_IDS.recipes, id, recipeData);
        toast.success("Cập nhật công thức thành công");

        invalidateCache(`recipe_${id}`);
        invalidateCache("recipesList");

        navigate(`/recipes/${id}`);
      } else {
        const newRecipe = await createItem(COLLECTION_IDS.recipes, recipeData);
        toast.success("Thêm công thức mới thành công");

        invalidateCache("recipesList");

        navigate(`/recipes/${newRecipe.$id}`);
      }
    } catch (error) {
      console.error("Lỗi khi lưu công thức:", error);
      toast.error("Không thể lưu công thức");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (isEditing && id) {
      navigate(`/recipes/${id}`);
    } else {
      navigate("/recipes");
    }
  };

  // Hiển thị màn hình loading cho đến khi dữ liệu được tải xong và form có đầy đủ dữ liệu
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

  // Rest of the form UI code remains the same
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
            {isEditing ? "Chỉnh sửa công thức" : "Thêm công thức mới"}
          </h1>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
              {/* Thông tin cơ bản */}
              <div className="mb-4">
                <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <ChefHat className="h-5 w-5 mr-2 text-orange-600" />
                  Thông tin cơ bản
                </h2>
                <div className="border-b border-gray-200 pb-2 mb-4"></div>
              </div>

              {/* Tên công thức */}
              <div className="space-y-1">
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-gray-700"
                >
                  Tên công thức <span className="text-red-500">*</span>
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
                  placeholder="Nhập tên công thức"
                />
                {errors.name && (
                  <p className="text-red-500 text-xs mt-1">{errors.name}</p>
                )}
              </div>

              {/* Mô tả */}
              <div className="space-y-1">
                <label
                  htmlFor="description"
                  className="block text-sm font-medium text-gray-700"
                >
                  Mô tả công thức
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Nhập mô tả cho công thức..."
                />
              </div>

              {/* Nguyên liệu */}
              <div className="mt-6 mb-4">
                <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <Utensils className="h-5 w-5 mr-2 text-green-600" />
                  Nguyên liệu
                </h2>
                <div className="border-b border-gray-200 pb-2 mb-4"></div>
              </div>

              <div>
                {formData.ingredients.map((ingredient, index) => (
                  <div key={index} className="flex gap-4 items-center mb-4">
                    <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-orange-600 text-sm font-medium">
                        {index + 1}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="mb-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Chọn nguyên liệu
                        </label>
                        <select
                          value={ingredient.recipeId || ""}
                          onChange={(e) => {
                            const selectedValue = e.target.value;
                            const selectedProduct = allProducts.find(
                              (p) => p.$id === selectedValue
                            );
                            const selectedRecipe = allRecipes.find(
                              (r) => r.$id === selectedValue
                            );
                            const selectedItem =
                              selectedProduct || selectedRecipe;

                            if (selectedItem) {
                              updateIngredient(
                                index,
                                "recipeId",
                                selectedValue
                              );
                              updateIngredient(
                                index,
                                "recipeName",
                                selectedItem.name
                              );
                            }
                          }}
                          className={`w-full border ${
                            errors[`ingredient-${index}`]
                              ? "border-red-300"
                              : "border-gray-300"
                          } rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                        >
                          <option value="">Chọn nguyên liệu</option>
                          <optgroup label="Sản phẩm">
                            {allProducts.map((product) => (
                              <option
                                key={`product-${product.$id}`}
                                value={product.$id}
                              >
                                {product.name}
                              </option>
                            ))}
                          </optgroup>
                          <optgroup label="Công thức">
                            {allRecipes.map((recipe) => (
                              <option
                                key={`recipe-${recipe.$id}`}
                                value={recipe.$id}
                              >
                                {recipe.name}
                              </option>
                            ))}
                          </optgroup>
                        </select>
                        {errors[`ingredient-${index}`] && (
                          <p className="text-red-500 text-xs mt-1">
                            {errors[`ingredient-${index}`]}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Số lượng
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={ingredient.quantity}
                          onChange={(e) =>
                            updateIngredient(
                              index,
                              "quantity",
                              parseInt(e.target.value) || 1
                            )
                          }
                          className={`w-full border ${
                            errors[`ingredient-quantity-${index}`]
                              ? "border-red-300"
                              : "border-gray-300"
                          } rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                        />
                        {errors[`ingredient-quantity-${index}`] && (
                          <p className="text-red-500 text-xs mt-1">
                            {errors[`ingredient-quantity-${index}`]}
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeIngredient(index)}
                      className="p-2 text-red-600 hover:text-red-700"
                      disabled={formData.ingredients.length === 1}
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addIngredient}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Thêm nguyên liệu
                </button>
              </div>

              {/* Sản phẩm đầu ra */}
              <div className="mt-6 mb-4">
                <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <BookOpen className="h-5 w-5 mr-2 text-blue-600" />
                  Sản phẩm đầu ra
                </h2>
                <div className="border-b border-gray-200 pb-2 mb-4"></div>
              </div>

              <div>
                {formData.output.map((output, index) => (
                  <div key={index} className="flex gap-4 items-center mb-4">
                    <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-blue-600 text-sm font-medium">
                        {index + 1}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="mb-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Chọn sản phẩm đầu ra
                        </label>
                        <select
                          value={output.recipeId || ""}
                          onChange={(e) => {
                            const selectedValue = e.target.value;
                            const selectedProduct = allProducts.find(
                              (p) => p.$id === selectedValue
                            );

                            if (selectedProduct) {
                              updateOutput(index, "recipeId", selectedValue);
                              updateOutput(
                                index,
                                "recipeName",
                                selectedProduct.name
                              );
                            }
                          }}
                          className={`w-full border ${
                            errors[`output-${index}`]
                              ? "border-red-300"
                              : "border-gray-300"
                          } rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                        >
                          <option value="">Chọn sản phẩm</option>
                          {allProducts.map((product) => (
                            <option key={product.$id} value={product.$id}>
                              {product.name}
                            </option>
                          ))}
                        </select>
                        {errors[`output-${index}`] && (
                          <p className="text-red-500 text-xs mt-1">
                            {errors[`output-${index}`]}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Số lượng
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={output.quantity}
                          onChange={(e) =>
                            updateOutput(
                              index,
                              "quantity",
                              parseInt(e.target.value) || 1
                            )
                          }
                          className={`w-full border ${
                            errors[`output-quantity-${index}`]
                              ? "border-red-300"
                              : "border-gray-300"
                          } rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                        />
                        {errors[`output-quantity-${index}`] && (
                          <p className="text-red-500 text-xs mt-1">
                            {errors[`output-quantity-${index}`]}
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeOutput(index)}
                      className="p-2 text-red-600 hover:text-red-700"
                      disabled={formData.output.length === 1}
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addOutput}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Thêm sản phẩm đầu ra
                </button>
              </div>

              {/* Ghi chú */}
              <div className="mt-6 mb-4">
                <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <Clipboard className="h-5 w-5 mr-2 text-gray-600" />
                  Ghi chú bổ sung
                </h2>
                <div className="border-b border-gray-200 pb-2 mb-4"></div>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="note"
                  className="block text-sm font-medium text-gray-700"
                >
                  Ghi chú
                </label>
                <textarea
                  id="note"
                  name="note"
                  value={formData.note || ""}
                  onChange={handleInputChange}
                  rows={4}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Nhập ghi chú về công thức..."
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
    </div>
  );
};

export default RecipeForm;
