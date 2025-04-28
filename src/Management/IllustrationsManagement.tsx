import React, { useState, useEffect } from "react";
import {
  Upload,
  Plus,
  Trash2,
  Loader2,
  X,
  Edit2,
  Search,
  Filter,
} from "lucide-react";
import { useAuth } from "../contexts/auth/authProvider";
import { ID } from "appwrite";
import { toast } from "react-hot-toast";

interface Illustration {
  $id: string;
  title: string;
  category: string;
  description: string;
  keywords: string[];
  imageId: string;
  bucketId: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  createdAt: string;
}

const IllustrationsManagement = () => {
  const { storage, databases } = useAuth();
  const [illustrations, setIllustrations] = useState<Illustration[]>([]);
  const [filteredIllustrations, setFilteredIllustrations] = useState<
    Illustration[]
  >([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Tất cả");
  const [isEditing, setIsEditing] = useState(false);
  const [selectedIllustration, setSelectedIllustration] =
    useState<Illustration | null>(null);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState("");

  const DATABASE_ID = "674e5e7a0008e19d0ef0";
  const ILLUSTRATIONS_COLLECTION_ID = "ILLUSTRATIONS";
  const BUCKET_ID = "ILLUSTRATIONS";

  const [formData, setFormData] = useState({
    title: "",
    category: "Đồ vật",
    description: "",
    keywords: "",
    difficulty: "beginner",
    imageFile: null as File | null,
  });

  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{
    isOpen: boolean;
    illustrationId: string | null;
    imageId: string | null;
  }>({
    isOpen: false,
    illustrationId: null,
    imageId: null,
  });

  const categories = [
    "Đồ vật",
    "Động vật",
    "Thực phẩm",
    "Hoạt động",
    "Nghề nghiệp",
    "Phương tiện",
    "Gia đình",
    "Thời tiết",
    "Màu sắc",
    "Số đếm",
    "Khác",
  ];

  const difficultiesMap = {
    beginner: "Cơ bản",
    intermediate: "Trung cấp",
    advanced: "Nâng cao",
  };

  const resetForm = () => {
    setFormData({
      title: "",
      category: "Đồ vật",
      description: "",
      keywords: "",
      difficulty: "beginner",
      imageFile: null,
    });
    setIsEditing(false);
    setSelectedIllustration(null);
  };

  useEffect(() => {
    fetchIllustrations();
  }, []);

  useEffect(() => {
    filterIllustrations();
  }, [searchQuery, selectedCategory, illustrations]);

  const fetchIllustrations = async () => {
    try {
      setIsLoading(true);
      const response = await databases.listDocuments(
        DATABASE_ID,
        ILLUSTRATIONS_COLLECTION_ID
      );

      const fetchedIllustrations =
        response.documents as unknown as Illustration[];
      setIllustrations(fetchedIllustrations);
      setFilteredIllustrations(fetchedIllustrations);
    } catch (error) {
      console.error("Lỗi khi tải hình ảnh:", error);
      toast.error("Không thể tải danh sách hình ảnh");
    } finally {
      setIsLoading(false);
    }
  };

  const filterIllustrations = () => {
    let filtered = [...illustrations];

    // Lọc theo từ khóa tìm kiếm
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (item) =>
          item.title.toLowerCase().includes(query) ||
          item.description.toLowerCase().includes(query) ||
          (item.keywords &&
            item.keywords.some((keyword) =>
              keyword.toLowerCase().includes(query)
            ))
      );
    }

    // Lọc theo danh mục
    if (selectedCategory !== "Tất cả") {
      filtered = filtered.filter((item) => item.category === selectedCategory);
    }

    setFilteredIllustrations(filtered);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (!formData.imageFile || !formData.title) {
        throw new Error("Vui lòng điền đầy đủ thông tin và tải lên hình ảnh");
      }

      // Upload hình ảnh
      const uploadedImage = await storage.createFile(
        BUCKET_ID,
        ID.unique(),
        formData.imageFile
      );

      // Xử lý keywords: chuyển từ chuỗi thành mảng
      const keywordsArray = formData.keywords
        .split(",")
        .map((k) => k.trim())
        .filter((k) => k.length > 0);

      // Tạo document trong database
      const document = await databases.createDocument(
        DATABASE_ID,
        ILLUSTRATIONS_COLLECTION_ID,
        ID.unique(),
        {
          title: formData.title,
          category: formData.category,
          description: formData.description,
          keywords: keywordsArray,
          imageId: uploadedImage.$id,
          bucketId: BUCKET_ID,
          difficulty: formData.difficulty,
          createdAt: new Date().toISOString(),
        }
      );

      // Cập nhật state
      const newIllustration: Illustration = {
        $id: document.$id,
        title: document.title,
        category: document.category,
        description: document.description,
        keywords: document.keywords,
        imageId: uploadedImage.$id,
        bucketId: BUCKET_ID,
        difficulty: document.difficulty,
        createdAt: document.createdAt,
      };

      setIllustrations((prev) => [...prev, newIllustration]);
      resetForm();
      setIsModalOpen(false);
      toast.success("Thêm hình ảnh thành công!");
    } catch (error) {
      console.error("Lỗi khi thêm hình ảnh:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Có lỗi xảy ra khi thêm hình ảnh"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (!selectedIllustration) return;

      const updateData: any = {
        title: formData.title,
        category: formData.category,
        description: formData.description,
        difficulty: formData.difficulty,
        // Xử lý keywords
        keywords: formData.keywords
          .split(",")
          .map((k) => k.trim())
          .filter((k) => k.length > 0),
      };

      // Upload hình ảnh mới nếu có
      if (formData.imageFile) {
        // Xóa hình ảnh cũ
        if (selectedIllustration.imageId) {
          try {
            await storage.deleteFile(
              selectedIllustration.bucketId,
              selectedIllustration.imageId
            );
          } catch (error) {
            console.error("Lỗi khi xóa hình ảnh cũ:", error);
          }
        }

        // Upload hình ảnh mới
        const uploadedImage = await storage.createFile(
          BUCKET_ID,
          ID.unique(),
          formData.imageFile
        );

        updateData.imageId = uploadedImage.$id;
      }

      // Cập nhật document
      await databases.updateDocument(
        DATABASE_ID,
        ILLUSTRATIONS_COLLECTION_ID,
        selectedIllustration.$id,
        updateData
      );

      // Cập nhật UI
      setIllustrations((prevIllustrations) =>
        prevIllustrations.map((illust) =>
          illust.$id === selectedIllustration.$id
            ? { ...illust, ...updateData }
            : illust
        )
      );

      setIsModalOpen(false);
      setIsEditing(false);
      setSelectedIllustration(null);
      resetForm();
      toast.success("Cập nhật hình ảnh thành công!");
    } catch (error) {
      console.error("Lỗi khi cập nhật:", error);
      toast.error("Có lỗi xảy ra khi cập nhật hình ảnh");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = (illustrationId: string, imageId: string) => {
    setDeleteConfirmModal({
      isOpen: true,
      illustrationId,
      imageId,
    });
  };

  const confirmDelete = async () => {
    if (!deleteConfirmModal.illustrationId || !deleteConfirmModal.imageId)
      return;

    setIsDeleting(true);
    try {
      // Xóa hình ảnh
      await storage.deleteFile(BUCKET_ID, deleteConfirmModal.imageId);

      // Xóa document
      await databases.deleteDocument(
        DATABASE_ID,
        ILLUSTRATIONS_COLLECTION_ID,
        deleteConfirmModal.illustrationId
      );

      // Cập nhật UI
      setIllustrations((prev) =>
        prev.filter((item) => item.$id !== deleteConfirmModal.illustrationId)
      );

      toast.success("Xóa hình ảnh thành công!");
    } catch (error) {
      console.error("Lỗi khi xóa:", error);
      toast.error("Có lỗi xảy ra khi xóa hình ảnh");
    } finally {
      setIsDeleting(false);
      setDeleteConfirmModal({
        isOpen: false,
        illustrationId: null,
        imageId: null,
      });
    }
  };

  const showPreview = (bucketId: string, imageId: string) => {
    const imageUrl = storage.getFilePreview(bucketId, imageId).toString();
    setPreviewImageUrl(imageUrl);
    setShowImagePreview(true);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-semibold">Quản lý hình ảnh minh họa</h2>
          <p className="text-gray-600">
            Thêm và quản lý các hình ảnh minh họa cho việc học tiếng Việt
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Thêm hình ảnh mới
        </button>
      </div>

      {/* Search and Filter section */}
      <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Tìm kiếm hình ảnh..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
            />
            <Search
              className="absolute left-3 top-2.5 text-gray-400"
              size={18}
            />
          </div>

          <div className="relative w-64">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg appearance-none"
            >
              <option value="Tất cả">Tất cả danh mục</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            <Filter
              className="absolute left-3 top-2.5 text-gray-400"
              size={18}
            />
          </div>
        </div>
      </div>

      {/* Illustrations Grid/Table */}
      {isLoading && illustrations.length === 0 ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Hình ảnh
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Tiêu đề
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Danh mục
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Cấp độ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Ngày tạo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredIllustrations.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-12 text-center text-gray-500"
                    >
                      Không tìm thấy hình ảnh nào
                    </td>
                  </tr>
                ) : (
                  filteredIllustrations.map((illustration) => (
                    <tr key={illustration.$id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div
                          className="w-16 h-16 rounded-md overflow-hidden cursor-pointer"
                          onClick={() =>
                            showPreview(
                              illustration.bucketId,
                              illustration.imageId
                            )
                          }
                        >
                          <img
                            src={storage
                              .getFilePreview(
                                illustration.bucketId,
                                illustration.imageId
                              )
                              .toString()}
                            alt={illustration.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">
                          {illustration.title}
                        </div>
                        <div className="text-sm text-gray-500 truncate max-w-xs">
                          {illustration.description}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {illustration.category}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                          ${
                            illustration.difficulty === "beginner"
                              ? "bg-green-100 text-green-800"
                              : illustration.difficulty === "intermediate"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {difficultiesMap[illustration.difficulty]}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {formatDate(illustration.createdAt)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => {
                              setSelectedIllustration(illustration);
                              setFormData({
                                title: illustration.title,
                                category: illustration.category,
                                description: illustration.description,
                                keywords: illustration.keywords.join(", "),
                                difficulty: illustration.difficulty,
                                imageFile: null,
                              });
                              setIsEditing(true);
                              setIsModalOpen(true);
                            }}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() =>
                              handleDelete(
                                illustration.$id,
                                illustration.imageId
                              )
                            }
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-xl p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold mb-4">
              {isEditing ? "Chỉnh sửa hình ảnh" : "Thêm hình ảnh mới"}
            </h3>
            <form
              onSubmit={isEditing ? handleEdit : handleSubmit}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tiêu đề
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                />
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
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mô tả
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  rows={3}
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Từ khóa (ngăn cách bằng dấu phẩy)
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  value={formData.keywords}
                  onChange={(e) =>
                    setFormData({ ...formData, keywords: e.target.value })
                  }
                  placeholder="Ví dụ: cây cối, thực vật, môi trường"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cấp độ
                </label>
                <select
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  value={formData.difficulty}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      difficulty: e.target.value as
                        | "beginner"
                        | "intermediate"
                        | "advanced",
                    })
                  }
                >
                  <option value="beginner">Cơ bản</option>
                  <option value="intermediate">Trung cấp</option>
                  <option value="advanced">Nâng cao</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hình ảnh {!isEditing && "(bắt buộc)"}
                </label>

                {/* Hiển thị hình ảnh hiện tại khi chỉnh sửa */}
                {isEditing && selectedIllustration && !formData.imageFile && (
                  <div className="mb-2">
                    <img
                      src={storage
                        .getFilePreview(
                          selectedIllustration.bucketId,
                          selectedIllustration.imageId
                        )
                        .toString()}
                      alt="Current image"
                      className="w-32 h-32 object-cover rounded-lg"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Hình ảnh hiện tại
                    </p>
                  </div>
                )}

                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setFormData({ ...formData, imageFile: file });
                      }
                    }}
                    className="hidden"
                    id="image-upload"
                    required={!isEditing}
                  />
                  <label htmlFor="image-upload" className="cursor-pointer">
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">
                      {formData.imageFile
                        ? formData.imageFile.name
                        : isEditing
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
                    setIsEditing(false);
                    setSelectedIllustration(null);
                    resetForm();
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                  disabled={isLoading}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Đang xử lý...
                    </>
                  ) : isEditing ? (
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
      {deleteConfirmModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h3 className="text-xl font-semibold mb-4">Xác nhận xóa</h3>
            <p className="text-gray-600 mb-6">
              Bạn có chắc chắn muốn xóa hình ảnh này? Hành động này không thể
              hoàn tác.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() =>
                  setDeleteConfirmModal({
                    isOpen: false,
                    illustrationId: null,
                    imageId: null,
                  })
                }
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                disabled={isDeleting}
              >
                Hủy
              </button>
              <button
                onClick={confirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
              >
                {isDeleting ? (
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

      {/* Image Preview Modal */}
      {showImagePreview && (
        <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center">
          <div className="relative w-[80vw] max-w-[900px]">
            <img
              src={previewImageUrl}
              alt="Preview"
              className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
            />
            <button
              onClick={() => setShowImagePreview(false)}
              className="absolute -top-12 right-0 w-10 h-10 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center transition-colors"
            >
              <X className="w-6 h-6 text-white" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default IllustrationsManagement;
