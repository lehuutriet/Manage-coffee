import { useState, useEffect } from "react";
import { useAuth } from "../contexts/auth/authProvider";
import {
  Plus,
  Search,
  Trash2,
  X,
  Music,
  Video,
  Headphones,
  Pencil,
  Upload,
  Eye,
  EyeOff,
  AlertCircle,
  Edit2,
} from "lucide-react";
import { ID } from "appwrite";
import toast from "react-hot-toast";

interface WritingListeningContent {
  $id: string;
  title: string;
  type: "listening" | "writing";
  level: "beginner" | "intermediate" | "advanced";
  category: string;
  description: string;
  transcript?: string;
  instructions?: string;
  fileId: string;
  bucketId: string;
  uploadedBy: string;
  uploadedAt: string;
  options?: string[];
  answer?: string;
  numberOfQuestions?: number;
  writingTemplate?: string;
  imageFileId?: string;
}

const Listen = () => {
  const [contents, setContents] = useState<WritingListeningContent[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<"listening" | "writing">(
    "listening"
  );
  const [, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [optionPreviews, setOptionPreviews] = useState<string[]>([]);
  const [showAnswers, setShowAnswers] = useState<Set<string>>(new Set());
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [contentToDelete, setContentToDelete] =
    useState<WritingListeningContent | null>(null);

  const { databases, storage, account } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editingContent, setEditingContent] =
    useState<WritingListeningContent | null>(null);
  const DATABASE_ID = "674e5e7a0008e19d0ef0";
  const SPEAKING_LISTENING_COLLECTION = "677ccf910016bee396ad";
  const MEDIA_BUCKET = "677cd047002021f64596";
  const [currentFileName, setCurrentFileName] = useState<string>("");
  const [formData, setFormData] = useState({
    title: "",
    type: "listening" as "listening" | "writing",
    level: "beginner" as "beginner" | "intermediate" | "advanced",
    category: "",
    description: "",
    transcript: "",
    instructions: "",
    mediaFile: null as File | null,
    options: ["", "", "", ""],
    answer: "",
    numberOfQuestions: 1,
    writingTemplate: "",
    imageFile: null as File | null,
    // Thêm các trường mới cho writing
    writingPrompt: "",
    writingInstructions: "",
    sampleAnswer: "",
    wordLimit: 0,
    scoringCriteria: "",
  });

  useEffect(() => {
    fetchContents();
  }, []);

  const fetchContents = async () => {
    setIsLoading(true);
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        SPEAKING_LISTENING_COLLECTION
      );
      setContents(response.documents as unknown as WritingListeningContent[]);
    } catch (error) {
      console.error("Error fetching contents:", error);
      setError("Không thể tải dữ liệu");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOptionImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    index: number
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        if (file.size > 5 * 1024 * 1024) {
          setError("Kích thước ảnh không được vượt quá 5MB");
          return;
        }

        if (!file.type.startsWith("image/")) {
          setError("Vui lòng chọn file ảnh hợp lệ");
          return;
        }

        if (optionPreviews[index]) {
          URL.revokeObjectURL(optionPreviews[index]);
        }

        const preview = URL.createObjectURL(file);
        const newPreviews = [...optionPreviews];
        newPreviews[index] = preview;
        setOptionPreviews(newPreviews);

        const uploadedFile = await storage.createFile(
          MEDIA_BUCKET,
          ID.unique(),
          file
        );

        const newOptions = [...formData.options];
        newOptions[index] = uploadedFile.$id;
        setFormData({
          ...formData,
          options: newOptions,
        });
      } catch (error) {
        console.error("Error uploading option image:", error);
        setError("Không thể upload ảnh. Vui lòng thử lại");
      }
    }
  };

  const removeOptionImage = async (index: number) => {
    try {
      const fileId = formData.options[index];
      if (fileId && fileId.match(/^[a-zA-Z0-9]{20,}$/)) {
        await storage.deleteFile(MEDIA_BUCKET, fileId);
      }

      const optionInput = document.getElementById(
        `option-image-${index}`
      ) as HTMLInputElement;
      if (optionInput) {
        optionInput.value = "";
      }

      const newPreviews = [...optionPreviews];
      if (newPreviews[index]) {
        URL.revokeObjectURL(newPreviews[index]);
      }
      newPreviews[index] = "";
      setOptionPreviews(newPreviews);

      const newOptions = [...formData.options];
      newOptions[index] = "";
      setFormData({
        ...formData,
        options: newOptions,
      });
    } catch (error) {
      console.error("Error removing image:", error);
      setError("Không thể xóa ảnh. Vui lòng thử lại");
    }
  };
  const handleEdit = async (content: WritingListeningContent) => {
    try {
      // Lấy thông tin file từ storage
      const fileInfo = await storage.getFile(content.bucketId, content.fileId);
      setCurrentFileName(fileInfo.name); // Lưu tên file

      setFormData({
        title: content.title,
        type: content.type,
        level: content.level,
        category: content.category || "",
        description: content.description,
        transcript: content.transcript || "",
        instructions: content.instructions || "",
        options: content.options || ["", "", "", ""],
        answer: content.answer || "",
        numberOfQuestions: content.numberOfQuestions || 1,
        writingTemplate: content.writingTemplate || "",
        mediaFile: null,
        imageFile: null,
        writingPrompt: "",
        writingInstructions: "",
        sampleAnswer: "",
        wordLimit: 0,
        scoringCriteria: "",
      });

      setIsEditing(true);
      setEditingContent(content);
      setIsModalOpen(true);
    } catch (error) {
      console.error("Error getting file info:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const user = await account.get();

      // Xử lý file mới nếu có
      let fileId = null;
      if (formData.mediaFile) {
        const uploadedFile = await storage.createFile(
          MEDIA_BUCKET,
          ID.unique(),
          formData.mediaFile
        );
        fileId = uploadedFile.$id;

        // Nếu đang edit và có file cũ thì xóa file cũ
        if (isEditing && editingContent?.fileId) {
          await storage.deleteFile(
            editingContent.bucketId,
            editingContent.fileId
          );
        }
      }

      const documentData = {
        title: formData.title,
        type: formData.type,
        level: formData.level,
        category: formData.category,
        description: formData.description,
        uploadedBy: user.$id,
        uploadedAt: new Date().toISOString(),
        transcript: formData.transcript,
        instructions: formData.instructions,
        fileId: fileId || (isEditing ? editingContent?.fileId : null),
        bucketId: MEDIA_BUCKET,
        options: formData.options,
        answer: formData.answer,
        numberOfQuestions: formData.numberOfQuestions,
      };

      if (isEditing && editingContent) {
        // Cập nhật document hiện có
        await databases.updateDocument(
          DATABASE_ID,
          SPEAKING_LISTENING_COLLECTION,
          editingContent.$id,
          documentData
        );
        toast.success("Cập nhật bài tập thành công!");
      } else {
        // Tạo document mới
        await databases.createDocument(
          DATABASE_ID,
          SPEAKING_LISTENING_COLLECTION,
          ID.unique(),
          documentData
        );
        toast.success("Thêm bài tập mới thành công!");
      }

      await fetchContents();
      setIsModalOpen(false);
      resetForm();
      setIsEditing(false);
      setEditingContent(null);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Sửa lại hàm handleDelete
  const handleDelete = async (content: WritingListeningContent) => {
    setContentToDelete(content);
    setIsDeleteModalOpen(true);
  };

  // Thêm hàm confirmDelete để xử lý khi xác nhận xóa
  const confirmDelete = async () => {
    if (!contentToDelete) return;

    try {
      setIsLoading(true);
      // Delete main file
      await storage.deleteFile(
        contentToDelete.bucketId,
        contentToDelete.fileId
      );

      // Delete image file if exists
      if (contentToDelete.imageFileId) {
        await storage.deleteFile(
          contentToDelete.bucketId,
          contentToDelete.imageFileId
        );
      }

      // Delete option images if exists
      if (contentToDelete.options) {
        for (const option of contentToDelete.options) {
          if (option.match(/^[a-zA-Z0-9]{20,}$/)) {
            try {
              await storage.deleteFile(contentToDelete.bucketId, option);
            } catch (error) {
              console.error("Error deleting option image:", error);
            }
          }
        }
      }

      await databases.deleteDocument(
        DATABASE_ID,
        SPEAKING_LISTENING_COLLECTION,
        contentToDelete.$id
      );
      await fetchContents();
      setIsDeleteModalOpen(false);
      setContentToDelete(null);
      toast.success("Xóa bài tập thành công!");
    } catch (error) {
      console.error("Error deleting content:", error);
      setError("Không thể xóa nội dung");
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      type: "listening",
      level: "beginner",
      category: "",
      description: "",
      transcript: "",
      instructions: "",
      mediaFile: null,
      options: ["", "", "", ""],
      answer: "",
      numberOfQuestions: 1,
      writingTemplate: "",
      imageFile: null,
      writingPrompt: "",
      writingInstructions: "",
      sampleAnswer: "",
      wordLimit: 0,
      scoringCriteria: "",
    });
    setError(null);
    setIsEditing(false);
    setEditingContent(null);
    setOptionPreviews([]);
  };
  const renderOption = (option: string, index: number) => {
    if (option.match(/^[a-zA-Z0-9]{20,}$/)) {
      return (
        <div className="relative">
          <img
            src={storage.getFileView(MEDIA_BUCKET, option).toString()}
            alt={`Option ${index + 1}`}
            className="w-full h-32 object-contain rounded-lg"
          />
        </div>
      );
    }
    return option;
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Quản lý bài tập nghe</h1>
          <p className="text-gray-600">Tạo và quản lý các bài tập luyện nghe</p>
        </div>
        <button
          onClick={() => {
            setIsEditing(false); // Reset trạng thái edit
            setEditingContent(null); // Xóa content đang edit
            resetForm(); // Reset form về trạng thái ban đầu
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg"
        >
          <Plus className="w-4 h-4" />
          Thêm bài tập mới
        </button>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Tìm kiếm bài tập..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg"
          />
          <Search className="absolute left-3 top-2.5 text-gray-400 w-5 h-5" />
        </div>
        <select
          value={selectedType}
          onChange={(e) =>
            setSelectedType(e.target.value as "listening" | "writing")
          }
          className="px-4 py-2 border rounded-lg"
        >
          <option value="listening">Luyện nghe</option>
        </select>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {contents
          .filter(
            (content) =>
              content.type === selectedType &&
              (content.title
                .toLowerCase()
                .includes(searchQuery.toLowerCase()) ||
                content.description
                  .toLowerCase()
                  .includes(searchQuery.toLowerCase()))
          )
          .map((content) => (
            <div
              key={content.$id}
              className="bg-white rounded-xl shadow-sm p-6"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  {content.type === "listening" ? (
                    <Headphones className="w-6 h-6 text-blue-500" />
                  ) : (
                    <Pencil className="w-6 h-6 text-purple-500" />
                  )}
                  <div>
                    <h3 className="font-semibold text-lg">{content.title}</h3>
                    <span className="text-sm text-gray-500">
                      {content.category}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  {" "}
                  {/* Thêm div để chứa cả 2 nút */}
                  <button
                    onClick={() => handleEdit(content)}
                    className="text-gray-400 hover:text-blue-500"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(content)}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <p className="text-gray-600 mb-4">{content.description}</p>

              {content.type === "listening" && content.options && (
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-medium">Đáp án:</h4>
                    <button
                      onClick={() => {
                        const newSet = new Set(showAnswers);
                        if (newSet.has(content.$id)) {
                          newSet.delete(content.$id);
                        } else {
                          newSet.add(content.$id);
                        }
                        setShowAnswers(newSet);
                      }}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      {showAnswers.has(content.$id) ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  {showAnswers.has(content.$id) && (
                    <div className="grid grid-cols-2 gap-2">
                      {content.options.map((option, index) => (
                        <div
                          key={index}
                          className={`p-2 rounded-lg border ${
                            content.answer === option
                              ? "border-green-500 bg-green-50"
                              : "border-gray-200"
                          }`}
                        >
                          {renderOption(option, index)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {content.type === "writing" && content.writingTemplate && (
                <div className="mb-4">
                  <h4 className="font-medium mb-2">Template:</h4>
                  <p className="text-gray-600 bg-gray-50 p-3 rounded-lg">
                    {content.writingTemplate}
                  </p>
                </div>
              )}

              <div className="flex flex-wrap gap-2 mb-4">
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                  {content.level === "beginner"
                    ? "Cơ bản"
                    : content.level === "intermediate"
                    ? "Trung cấp"
                    : "Nâng cao"}
                </span>
                <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm">
                  {new Date(content.uploadedAt).toLocaleDateString("vi-VN")}
                </span>
              </div>

              <button
                onClick={() => {
                  const url = storage.getFileView(
                    content.bucketId,
                    content.fileId
                  );
                  window.open(url.toString(), "_blank");
                }}
                className="w-full py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center justify-center gap-2"
              >
                {content.type === "listening" ? (
                  <Music className="w-4 h-4" />
                ) : (
                  <Video className="w-4 h-4" />
                )}
                Xem bài tập
              </button>
            </div>
          ))}
      </div>

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">
                {isEditing ? "Chỉnh sửa bài tập" : "Thêm bài tập mới"}
              </h2>
              <button onClick={() => setIsModalOpen(false)}>
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Loại bài tập
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        type: e.target.value as "listening" | "writing",
                      })
                    }
                    className="w-full p-2 border rounded-lg"
                  >
                    <option value="listening">Luyện nghe</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Cấp độ
                  </label>
                  <select
                    value={formData.level}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        level: e.target.value as
                          | "beginner"
                          | "intermediate"
                          | "advanced",
                      })
                    }
                    className="w-full p-2 border rounded-lg"
                  >
                    <option value="beginner">Cơ bản</option>
                    <option value="intermediate">Trung cấp</option>
                    <option value="advanced">Nâng cao</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Tiêu đề
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  className="w-full p-2 border rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Mô tả</label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full p-2 border rounded-lg"
                  rows={3}
                  required
                />
              </div>

              {formData.type === "listening" && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      File âm thanh{" "}
                      {isEditing
                        ? "(Chọn file mới nếu muốn thay đổi)"
                        : "(Bắt buộc)"}
                    </label>
                    {/* Hiển thị file hiện tại nếu đang edit */}
                    {isEditing && editingContent && (
                      <div className="mb-3 p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600">
                          File âm thanh hiện tại:
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Music className="w-4 h-4 text-blue-500" />
                          <span className="text-sm font-medium">
                            {currentFileName}
                          </span>
                        </div>
                        <audio controls className="mt-2 w-full">
                          <source
                            src={storage.getFileView(
                              editingContent.bucketId,
                              editingContent.fileId
                            )}
                            type="audio/mpeg"
                          />
                        </audio>
                      </div>
                    )}

                    {/* Input chọn file mới */}
                    <input
                      type="file"
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          mediaFile: e.target.files ? e.target.files[0] : null,
                        })
                      }
                      accept="audio/*,video/*"
                      className="w-full"
                      required={!isEditing}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {formData.options.map((option, index) => (
                      <div key={index}>
                        <label className="block text-sm font-medium mb-2">
                          Đáp án {index + 1}
                        </label>
                        <input
                          type="text"
                          value={option}
                          onChange={(e) => {
                            const newOptions = [...formData.options];
                            newOptions[index] = e.target.value;
                            setFormData({ ...formData, options: newOptions });
                          }}
                          className="w-full p-2 border rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            document
                              .getElementById(`option-image-${index}`)
                              ?.click()
                          }
                          className="mt-2 w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg flex items-center justify-center gap-2"
                        >
                          <Upload className="w-4 h-4" />
                          Thêm ảnh cho đáp án
                        </button>
                        <input
                          id={`option-image-${index}`}
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={(e) => handleOptionImageUpload(e, index)}
                        />
                        {optionPreviews[index] && (
                          <div className="mt-2 relative">
                            <img
                              src={optionPreviews[index]}
                              alt={`Preview ${index + 1}`}
                              className="w-full h-32 object-contain rounded-lg"
                            />
                            <button
                              type="button"
                              onClick={() => removeOptionImage(index)}
                              className="absolute top-2 right-2 p-1 bg-white rounded-full shadow-lg"
                            >
                              <X className="w-4 h-4 text-gray-600" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Đáp án đúng
                    </label>
                    <select
                      value={formData.answer}
                      onChange={(e) =>
                        setFormData({ ...formData, answer: e.target.value })
                      }
                      className="w-full p-2 border rounded-lg"
                      required
                    >
                      <option value="">Chọn đáp án đúng</option>
                      {formData.options.map((option, index) => (
                        <option key={index} value={option}>
                          Đáp án {index + 1}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              <div className="flex justify-end gap-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
                >
                  {isLoading
                    ? "Đang xử lý..."
                    : isEditing
                    ? "Cập nhật"
                    : "Tạo bài tập"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {isDeleteModalOpen && contentToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-medium text-gray-900">
                  Xác nhận xóa nội dung
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  Bạn có chắc chắn muốn xóa nội dung này? Hành động này không
                  thể hoàn tác.
                </p>
                <div className="mt-4 flex gap-3 justify-end">
                  <button
                    onClick={() => {
                      setIsDeleteModalOpen(false);
                      setContentToDelete(null);
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={confirmDelete}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                        <span>Đang xóa...</span>
                      </div>
                    ) : (
                      "Xóa nội dung"
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Listen;
