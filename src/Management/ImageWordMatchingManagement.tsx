import React, { useState, useEffect } from "react";
import {
  Upload,
  Loader2,
  Plus,
  Trash2,
  Edit2,
  X,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "../contexts/auth/authProvider";
import { ID } from "appwrite";
import { toast } from "react-hot-toast";

interface WordMatch {
  $id?: string;
  word: string;
  imageId: string;
  level: "beginner" | "intermediate" | "advanced";
  description?: string;
  category: string;
}

const ImageWordMatchingManagement = () => {
  const { databases, storage } = useAuth();
  const [wordMatches, setWordMatches] = useState<WordMatch[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<WordMatch | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  const DATABASE_ID = "674e5e7a0008e19d0ef0";
  const COLLECTION_ID = "imagewordmatching";
  const BUCKET_ID = "imagewordmatchingbucket";
  const [formData, setFormData] = useState<{
    word: string;
    imageFile: File | null;
    level: "beginner" | "intermediate" | "advanced";
    description: string;
    category: string;
  }>({
    word: "",
    imageFile: null,
    level: "beginner",
    description: "",
    category: "animals",
  });

  const categories = [
    { id: "animals", name: "Động vật" },
    { id: "foods", name: "Thức ăn" },
    { id: "colors", name: "Màu sắc" },
    { id: "objects", name: "Đồ vật" },
    { id: "nature", name: "Thiên nhiên" },
    { id: "vehicles", name: "Phương tiện" },
  ];

  const levels = [
    { id: "beginner", name: "Cơ bản" },
    { id: "intermediate", name: "Trung cấp" },
    { id: "advanced", name: "Nâng cao" },
  ];

  useEffect(() => {
    fetchWordMatches();
  }, []);

  const fetchWordMatches = async () => {
    setIsLoading(true);
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTION_ID
      );
      setWordMatches(response.documents as unknown as WordMatch[]);
    } catch (error) {
      console.error("Error fetching word matches:", error);
      toast.error("Không thể tải dữ liệu ghép từ");
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError("Hình ảnh không được vượt quá 5MB");
        return;
      }

      setFormData({ ...formData, imageFile: file });
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
    }
  };

  const resetForm = () => {
    setFormData({
      word: "",
      imageFile: null,
      level: "beginner",
      description: "",
      category: "animals",
    });
    setImagePreview(null);
    setError(null);
    setSelectedMatch(null);
  };

  const validateForm = () => {
    if (!formData.word.trim()) {
      setError("Vui lòng nhập từ");
      return false;
    }
    if (!formData.imageFile && !isEditMode) {
      setError("Vui lòng chọn hình ảnh");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsUploading(true);
    setError(null);

    try {
      let imageId = "";

      // Upload image if there's a new one
      if (formData.imageFile) {
        // Delete old image if in edit mode
        if (isEditMode && selectedMatch?.imageId) {
          try {
            await storage.deleteFile(BUCKET_ID, selectedMatch.imageId);
          } catch (err) {
            console.error("Error deleting old image:", err);
            // Continue even if old image deletion fails
          }
        }

        // Upload new image
        const uploadResult = await storage.createFile(
          BUCKET_ID,
          ID.unique(),
          formData.imageFile
        );
        imageId = uploadResult.$id;
      } else if (isEditMode && selectedMatch) {
        // Keep existing image if in edit mode and no new image
        imageId = selectedMatch.imageId;
      }

      if (isEditMode && selectedMatch?.$id) {
        // Update existing record
        await databases.updateDocument(
          DATABASE_ID,
          COLLECTION_ID,
          selectedMatch.$id,
          {
            word: formData.word,
            imageId: imageId,
            level: formData.level,
            description: formData.description,
            category: formData.category,
          }
        );
        toast.success("Cập nhật thành công!");
      } else {
        // Create new record
        await databases.createDocument(
          DATABASE_ID,
          COLLECTION_ID,
          ID.unique(),
          {
            word: formData.word,
            imageId: imageId,
            level: formData.level,
            description: formData.description,
            category: formData.category,
          }
        );
        toast.success("Thêm mới thành công!");
      }

      // Refresh data and close modal
      fetchWordMatches();
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error saving word match:", error);
      setError("Có lỗi xảy ra khi lưu dữ liệu");
    } finally {
      setIsUploading(false);
    }
  };

  const handleEdit = async (item: WordMatch) => {
    setSelectedMatch(item);
    setIsEditMode(true);

    setFormData({
      word: item.word,
      imageFile: null,
      level: item.level,
      description: item.description || "",
      category: item.category,
    });

    try {
      // Get image preview
      const imageUrl = storage.getFilePreview(BUCKET_ID, item.imageId);
      setImagePreview(imageUrl.toString());
    } catch (error) {
      console.error("Error getting image preview:", error);
    }

    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    setItemToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;

    setIsLoading(true);
    try {
      // Find the item to get the imageId
      const itemToDeleteData = wordMatches.find(
        (item) => item.$id === itemToDelete
      );

      if (itemToDeleteData) {
        // Delete the database document
        await databases.deleteDocument(
          DATABASE_ID,
          COLLECTION_ID,
          itemToDelete
        );

        // Delete the associated image
        await storage.deleteFile(BUCKET_ID, itemToDeleteData.imageId);

        toast.success("Xóa thành công!");
        // Update local state
        setWordMatches(wordMatches.filter((item) => item.$id !== itemToDelete));
      }
    } catch (error) {
      console.error("Error deleting:", error);
      toast.error("Có lỗi xảy ra khi xóa");
    } finally {
      setIsLoading(false);
      setDeleteConfirmOpen(false);
      setItemToDelete(null);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-semibold">
            Quản lý ghép từ với hình ảnh
          </h2>
          <p className="text-gray-600">
            Thêm, sửa, xóa từ và hình ảnh tương ứng
          </p>
        </div>
        <button
          onClick={() => {
            setIsModalOpen(true);
            setIsEditMode(false);
            resetForm();
          }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Thêm mới
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {wordMatches.map((item) => (
            <div
              key={item.$id}
              className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden"
            >
              <div className="relative aspect-square">
                <img
                  src={storage
                    .getFilePreview(BUCKET_ID, item.imageId)
                    .toString()}
                  alt={item.word}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      "https://via.placeholder.com/400?text=Image+Error";
                  }}
                />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent py-2 px-4">
                  <h3 className="text-white text-xl font-bold">{item.word}</h3>
                </div>
              </div>
              <div className="p-4">
                <div className="flex gap-2 mb-3">
                  <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700">
                    {levels.find((l) => l.id === item.level)?.name ||
                      item.level}
                  </span>
                  <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">
                    {categories.find((c) => c.id === item.category)?.name ||
                      item.category}
                  </span>
                </div>
                {item.description && (
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {item.description}
                  </p>
                )}
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => handleEdit(item)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => item.$id && handleDelete(item.$id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {wordMatches.length === 0 && (
            <div className="col-span-full py-12 text-center bg-gray-50 rounded-lg">
              <p className="text-gray-500">
                Chưa có dữ liệu ghép từ nào. Hãy thêm mới!
              </p>
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">
                {isEditMode
                  ? "Cập nhật từ với hình ảnh"
                  : "Thêm từ với hình ảnh"}
              </h3>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  resetForm();
                }}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                <div>
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Từ
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  value={formData.word}
                  onChange={(e) =>
                    setFormData({ ...formData, word: e.target.value })
                  }
                  placeholder="Nhập từ cần ghép"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mô tả (tùy chọn)
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  rows={3}
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Nhập mô tả nếu cần"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cấp độ
                  </label>
                  <select
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    value={formData.level}
                    onChange={(e) =>
                      setFormData({ ...formData, level: e.target.value as any })
                    }
                  >
                    {levels.map((level) => (
                      <option key={level.id} value={level.id}>
                        {level.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Danh mục
                  </label>
                  <select
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                  >
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hình ảnh
                </label>

                {/* Image Preview */}
                {imagePreview && (
                  <div className="mb-3">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="h-48 object-contain border rounded-lg"
                    />
                  </div>
                )}

                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                    id="image-upload"
                  />
                  <label htmlFor="image-upload" className="cursor-pointer">
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">
                      {formData.imageFile
                        ? formData.imageFile.name
                        : isEditMode
                        ? "Chọn hình ảnh mới (không bắt buộc)"
                        : "Kéo thả hình ảnh hoặc click để chọn file"}
                    </p>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    resetForm();
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                  disabled={isUploading}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Đang xử lý...
                    </>
                  ) : isEditMode ? (
                    "Cập nhật"
                  ) : (
                    "Thêm mới"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h3 className="text-xl font-semibold mb-4">Xác nhận xóa</h3>
            <p className="text-gray-600 mb-6">
              Bạn có chắc chắn muốn xóa mục này? Hành động này không thể hoàn
              tác.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirmOpen(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                disabled={isLoading}
              >
                Hủy
              </button>
              <button
                onClick={confirmDelete}
                disabled={isLoading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Đang xóa...
                  </>
                ) : (
                  "Xóa"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageWordMatchingManagement;
