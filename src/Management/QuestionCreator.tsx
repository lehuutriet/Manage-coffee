import React, { useEffect, useState } from "react";
import {
  Plus,
  X,
  Save,
  AlertCircle,
  Upload,
  Trash2,
  Edit2,
} from "lucide-react";
import { ID, Models } from "appwrite";
import { useAuth } from "../contexts/auth/authProvider";
import { toast } from "react-hot-toast";
interface Question extends Models.Document {
  type: "select" | "translate";
  prompt: string;
  options?: string[];
  answer: string;
  level: "beginner" | "intermediate" | "advanced";
  category: string;
  createdBy: string;
  imageId?: string;
  bucketId?: string;
}

interface QuestionFormData {
  type: "select" | "translate";
  prompt: string;
  answer: string;
  options: string[];
  level: "beginner" | "intermediate" | "advanced";
  category: string;
  imageFile?: File;
  imagePreview?: string;
}

const LEVEL_MAPPING = {
  beginner: "Cơ bản",
  intermediate: "Trung cấp",
  advanced: "Nâng cao",
} as const;

const CATEGORY_MAPPING = {
  vocabulary: "Từ vựng",
  grammar: "Ngữ pháp",
  pronunciation: "Phát âm",
  conversation: "Hội thoại",
} as const;

const QuestionCreator = () => {
  const { databases, account, storage } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(
    null
  );
  const [selectedQuestionImage, setSelectedQuestionImage] = useState<
    string | null
  >(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [questionToDelete, setQuestionToDelete] = useState<string | null>(null);
  const DATABASE_ID = "674e5e7a0008e19d0ef0";
  const QUESTIONS_COLLECTION_ID = "6764ca50000079439b57";
  const BUCKET_questionsImage = "6764d934003858838718"; // Bucket ID cho ảnh câu hỏi
  const [editingId, setEditingId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [formData, setFormData] = useState<QuestionFormData>({
    type: "select",
    prompt: "",
    answer: "",
    options: ["", "", ""],
    level: "beginner",
    category: "vocabulary",
  });

  const fetchQuestions = async () => {
    try {
      const response = await databases.listDocuments<Question>(
        DATABASE_ID,
        QUESTIONS_COLLECTION_ID
      );
      setQuestions(response.documents as unknown as Question[]);
    } catch (error) {
      console.error("Error fetching questions:", error);
      setError("Không thể tải danh sách câu hỏi");
    }
  };
  const handleDeleteQuestion = async (questionId: string) => {
    try {
      setLoading(true);

      // Lấy thông tin câu hỏi để có thể xóa ảnh nếu có
      const question = questions.find((q) => q.$id === questionId);

      if (question?.imageId && question?.bucketId) {
        // Xóa ảnh từ storage nếu có
        await storage.deleteFile(question.bucketId, question.imageId);
      }

      // Xóa document câu hỏi
      await databases.deleteDocument(
        DATABASE_ID,
        QUESTIONS_COLLECTION_ID,
        questionId
      );

      // Cập nhật lại danh sách câu hỏi
      await fetchQuestions();
      toast.success("Xóa câu hỏi thành công!");
      setDeleteModalOpen(false);
      setQuestionToDelete(null);
    } catch (error) {
      console.error("Error deleting question:", error);
      setError("Không thể xóa câu hỏi");
    } finally {
      setLoading(false);
    }
  };
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Kiểm tra kích thước file (ví dụ: giới hạn 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError("Kích thước ảnh không được vượt quá 5MB");
        return;
      }

      // Kiểm tra định dạng file
      if (!file.type.startsWith("image/")) {
        setError("Vui lòng chọn file ảnh hợp lệ");
        return;
      }

      setFormData({
        ...formData,
        imageFile: file,
        imagePreview: URL.createObjectURL(file),
      });
    }
  };

  const handleQuestionClick = async (question: Question) => {
    setSelectedQuestion(question);
    setIsDetailModalOpen(true);

    // Tải ảnh nếu có
    if (question.imageId && question.bucketId) {
      try {
        const imageUrl = storage.getFilePreview(
          question.bucketId,
          question.imageId
        );
        setSelectedQuestionImage(imageUrl.toString());
      } catch (error) {
        console.error("Error loading question image:", error);
        setSelectedQuestionImage(null);
      }
    }
  };
  const handleEdit = async (question: Question) => {
    setFormData({
      type: question.type,
      prompt: question.prompt,
      answer: question.answer,
      options: question.options || ["", "", ""],
      level: question.level,
      category: question.category,
    });

    // Nếu có ảnh, lấy URL preview
    if (question.imageId && question.bucketId) {
      try {
        const imageUrl = storage.getFilePreview(
          question.bucketId,
          question.imageId
        );
        setFormData((prev) => ({
          ...prev,
          imagePreview: imageUrl.toString(),
        }));
      } catch (error) {
        console.error("Error loading question image:", error);
      }
    }

    setIsModalOpen(true);
    setEditingId(question.$id);
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setLoading(true);
      const user = await account.get();

      let imageId = null;
      let bucketId = null;

      // Upload ảnh nếu có
      if (formData.imageFile) {
        const uploadedFile = await storage.createFile(
          BUCKET_questionsImage,
          ID.unique(),
          formData.imageFile
        );
        imageId = uploadedFile.$id;
        bucketId = BUCKET_questionsImage;
      }

      const questionData = {
        ...formData,
        options:
          formData.type === "select"
            ? formData.options.filter((opt) => opt)
            : undefined,
        createdBy: user.$id,
        imageId,
        bucketId,
      };

      // Xóa các trường không cần thiết
      delete questionData.imageFile;
      delete questionData.imagePreview;

      if (editingId) {
        // Cập nhật câu hỏi
        await databases.updateDocument(
          DATABASE_ID,
          QUESTIONS_COLLECTION_ID,
          editingId,
          questionData
        );
        toast.success("Cập nhật câu hỏi thành công!");
      } else {
        // Thêm câu hỏi mới
        await databases.createDocument(
          DATABASE_ID,
          QUESTIONS_COLLECTION_ID,
          ID.unique(),
          {
            ...questionData,
            createdAt: new Date().toISOString(),
          }
        );
        toast.success("Thêm câu hỏi thành công!");
      }

      await fetchQuestions();
      setIsModalOpen(false);
      resetForm();
    } catch (error: any) {
      setError(error.message || "Không thể lưu câu hỏi");
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    if (!formData.prompt || !formData.answer) {
      setError("Vui lòng điền đầy đủ thông tin");
      return false;
    }
    if (
      formData.type === "select" &&
      formData.options.filter((opt) => opt).length < 2
    ) {
      setError("Cần ít nhất 2 lựa chọn cho câu hỏi trắc nghiệm");
      return false;
    }
    return true;
  };

  const resetForm = () => {
    if (formData.imagePreview) {
      URL.revokeObjectURL(formData.imagePreview);
    }
    setFormData({
      type: "select",
      prompt: "",
      answer: "",
      options: ["", "", ""],
      level: "beginner",
      category: "vocabulary",
    });

    setEditingId(null);
    setError("");
  };

  useEffect(() => {
    fetchQuestions();
    return () => {
      // Cleanup any image preview URLs
      if (formData.imagePreview) {
        URL.revokeObjectURL(formData.imagePreview);
      }
    };
  }, []);

  // Helper function để chuyển đổi từ tiếng Anh sang tiếng Việt
  const getVietnameseName = (
    key: keyof typeof LEVEL_MAPPING | keyof typeof CATEGORY_MAPPING,
    type: "level" | "category"
  ) => {
    return type === "level"
      ? LEVEL_MAPPING[key as keyof typeof LEVEL_MAPPING]
      : CATEGORY_MAPPING[key as keyof typeof CATEGORY_MAPPING];
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Ngân hàng câu hỏi
          </h1>
          <p className="mt-2 text-gray-600">
            Quản lý và tạo các câu hỏi trong hệ thống
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          {/* Header Actions */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-gray-900">
                  Danh sách câu hỏi
                </h2>
              </div>
              <button
                onClick={() => {
                  resetForm(); // Reset form trước
                  setEditingId(null); // Đảm bảo không còn trong chế độ edit
                  setIsModalOpen(true);
                }}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Tạo câu hỏi mới
              </button>
            </div>
          </div>

          {/* Content Grid */}
          <div className="p-6">
            {questions.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {questions.map((question) => (
                  <div
                    key={question.$id}
                    className="bg-white p-4 rounded-lg shadow cursor-pointer hover:shadow-md transition-shadow relative"
                    onClick={() => handleQuestionClick(question)}
                  >
                    <h3 className="font-medium">{question.prompt}</h3>
                    <div className="mt-2 flex gap-2">
                      <span className="text-sm text-gray-500">
                        {question.type === "select" ? "Trắc nghiệm" : "Dịch"}
                      </span>
                      <span className="text-sm text-gray-500">
                        {getVietnameseName(question.level, "level")}
                      </span>
                    </div>
                    <div className="absolute top-2 right-2 flex flex-col gap-2">
                      {" "}
                      {/* Thêm flex-col để xếp các nút dọc */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setQuestionToDelete(question.$id);
                          setDeleteModalOpen(true);
                        }}
                        className="p-1 text-red-600 hover:bg-red-50 rounded-full"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(question);
                        }}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded-full"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <AlertCircle className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900">
                  Chưa có câu hỏi nào
                </h3>
                <p className="mt-2 text-gray-500">
                  Bắt đầu bằng cách tạo câu hỏi đầu tiên
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && questionToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-medium text-gray-900">
                  Xác nhận xóa câu hỏi
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  Bạn có chắc chắn muốn xóa câu hỏi này? Hành động này không thể
                  hoàn tác.
                </p>
                <div className="mt-4 flex gap-3 justify-end">
                  <button
                    onClick={() => {
                      setDeleteModalOpen(false);
                      setQuestionToDelete(null);
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={() =>
                      questionToDelete && handleDeleteQuestion(questionToDelete)
                    }
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
                  >
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                        <span>Đang xóa...</span>
                      </div>
                    ) : (
                      "Xóa câu hỏi"
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Modal xem chi tiết câu hỏi */}
      {isDetailModalOpen && selectedQuestion && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Chi tiết câu hỏi</h2>
              <button
                onClick={() => {
                  setIsDetailModalOpen(false);
                  setSelectedQuestion(null);
                  setSelectedQuestionImage(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Câu hỏi:
                </label>
                <p className="mt-1 text-gray-900">{selectedQuestion.prompt}</p>
              </div>
              {selectedQuestionImage && (
                <div className="mb-4">
                  <img
                    src={selectedQuestionImage}
                    alt="Question"
                    className="max-h-64 mx-auto rounded-lg object-contain"
                  />
                </div>
              )}
              {selectedQuestion.type === "select" && (
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Các lựa chọn:
                  </label>
                  <ul className="mt-1 space-y-2">
                    {selectedQuestion.options?.map((option, index) => (
                      <li
                        key={index}
                        className={`p-2 rounded ${
                          option === selectedQuestion.answer
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-50"
                        }`}
                      >
                        {option}
                        {option === selectedQuestion.answer && " (Đáp án đúng)"}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedQuestion.type === "translate" && (
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Đáp án:
                  </label>
                  <p className="mt-1 text-gray-900">
                    {selectedQuestion.answer}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Độ khó:
                  </label>
                  <p className="mt-1 text-gray-900">
                    {getVietnameseName(selectedQuestion.level, "level")}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Phân loại:
                  </label>
                  <p className="mt-1 text-gray-900">
                    {getVietnameseName(
                      selectedQuestion.category as keyof typeof CATEGORY_MAPPING,
                      "category"
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">
                {editingId ? "Chỉnh sửa câu hỏi" : "Tạo câu hỏi mới"}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <p className="text-red-600">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Loại câu hỏi
                </label>
                <select
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      type: e.target.value as "select" | "translate",
                    })
                  }
                  className="w-full p-2 border rounded-lg"
                >
                  <option value="select">Trắc nghiệm</option>
                  <option value="translate">Dịch</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Câu hỏi
                </label>
                <input
                  type="text"
                  value={formData.prompt}
                  onChange={(e) =>
                    setFormData({ ...formData, prompt: e.target.value })
                  }
                  className="w-full p-2 border rounded-lg"
                  placeholder="Nhập câu hỏi..."
                />
              </div>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Phần upload ảnh */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hình ảnh (không bắt buộc)
                  </label>
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg">
                    <div className="space-y-1 text-center">
                      {formData.imagePreview ? (
                        <div className="relative">
                          <img
                            src={formData.imagePreview}
                            alt="Preview"
                            className="mx-auto h-32 w-auto object-cover rounded"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              URL.revokeObjectURL(formData.imagePreview!);
                              setFormData({
                                ...formData,
                                imageFile: undefined,
                                imagePreview: undefined,
                              });
                            }}
                            className="absolute -top-2 -right-2 bg-red-100 rounded-full p-1 hover:bg-red-200"
                          >
                            <X className="w-4 h-4 text-red-600" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <Upload className="mx-auto h-12 w-12 text-gray-400" />
                          <div className="flex text-sm text-gray-600">
                            <label className="relative cursor-pointer rounded-md font-medium text-blue-600 hover:text-blue-500">
                              <span>Tải ảnh lên</span>
                              <input
                                type="file"
                                className="sr-only"
                                onChange={handleImageUpload}
                                accept="image/*"
                              />
                            </label>
                            <p className="pl-1">hoặc kéo thả vào đây</p>
                          </div>
                          <p className="text-xs text-gray-500">
                            PNG, JPG, GIF lên đến 5MB
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </form>
              {formData.type === "select" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Các lựa chọn
                  </label>
                  {formData.options.map((option, index) => (
                    <input
                      key={index}
                      type="text"
                      value={option}
                      onChange={(e) => {
                        const newOptions = [...formData.options];
                        newOptions[index] = e.target.value;
                        setFormData({ ...formData, options: newOptions });
                      }}
                      className="w-full p-2 border rounded-lg mb-2"
                      placeholder={`Lựa chọn ${index + 1}`}
                    />
                  ))}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Đáp án đúng
                </label>
                <input
                  type="text"
                  value={formData.answer}
                  onChange={(e) =>
                    setFormData({ ...formData, answer: e.target.value })
                  }
                  className="w-full p-2 border rounded-lg"
                  placeholder="Nhập đáp án đúng..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Độ khó
                  </label>
                  <select
                    value={formData.level}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        level: e.target.value as keyof typeof LEVEL_MAPPING,
                      })
                    }
                    className="w-full p-2 border rounded-lg"
                  >
                    {Object.entries(LEVEL_MAPPING).map(([key, value]) => (
                      <option key={key} value={key}>
                        {value}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phân loại
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        category: e.target
                          .value as keyof typeof CATEGORY_MAPPING,
                      })
                    }
                    className="w-full p-2 border rounded-lg"
                  >
                    {Object.entries(CATEGORY_MAPPING).map(([key, value]) => (
                      <option key={key} value={key}>
                        {value}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                      <span>Đang xử lý...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>{editingId ? "Cập nhật" : "Tạo câu hỏi"}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuestionCreator;
