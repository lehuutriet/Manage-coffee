import { useState, useEffect } from "react";
import { useAuth } from "../contexts/auth/authProvider";
import {
  FileText,
  Image as ImageIcon,
  Video,
  File,
  Folder,
  Upload,
  Plus,
  X,
  AlertCircle,
  Trash2,
  Book,
  Headphones,
  CheckSquare,
  Square,
} from "lucide-react";
import { Models } from "appwrite";
import { ID, Query } from "appwrite";

// Định nghĩa types cho contentType và level
type ContentType = "story" | "reading" | "writing" | "listening" | "exercise";

interface ContentTypeInfo {
  id: ContentType;
  name: string;
  icon: React.ReactNode;
  description: string;
}

const contentTypes: ContentTypeInfo[] = [
  {
    id: "story",
    name: "Truyện kể",
    icon: <Book className="w-5 h-5" />,
    description: "Nội dung truyện kể cho trẻ",
  },
  {
    id: "reading",
    name: "Tập đọc",
    icon: <FileText className="w-5 h-5" />,
    description: "Bài tập đọc",
  },
  {
    id: "writing",
    name: "Tập viết",
    icon: <FileText className="w-5 h-5" />,
    description: "Bài tập viết",
  },
  {
    id: "listening",
    name: "Tập nghe",
    icon: <Headphones className="w-5 h-5" />,
    description: "Bài tập nghe",
  },
  {
    id: "exercise",
    name: "Bài tập",
    icon: <Book className="w-5 h-5" />,
    description: "Bài tập tổng hợp",
  },
];

interface FileIconProps {
  type: string;
}

const FileIcon = ({ type }: FileIconProps) => {
  if (type.startsWith("image"))
    return <ImageIcon className="w-5 h-5 text-blue-500" />;
  if (type.startsWith("video"))
    return <Video className="w-5 h-5 text-red-500" />;
  if (type === "application/pdf")
    return <FileText className="w-5 h-5 text-orange-500" />;
  return <File className="w-5 h-5 text-gray-500" />;
};

interface StoredFile extends Models.Document {
  name: string;
  path: string;
  type: string;
  uploadedBy: string;
  uploadedAt: string;
  status: string;
  fileId: string;
  bucketId: string;
  contentType: ContentType;

  description: string;
  soundType?: "consonant" | "vowel" | null; // Thêm trường này
}

const Exercise = () => {
  const [storedFiles, setStoredFiles] = useState<StoredFile[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedContentType, setSelectedContentType] = useState<
    ContentType | ""
  >("");
  const [isUploading, setIsUploading] = useState(false);

  const [uploadProgress, setUploadProgress] = useState({
    current: 0,
    total: 0,
    currentFile: "",
  });
  const [soundType, setSoundType] = useState<"consonant" | "vowel" | "">("");
  const { storage, databases, account } = useAuth();

  const [formData, setFormData] = useState<{
    contentType: ContentType;

    description: string;
  }>({
    contentType: "story",

    description: "",
  });

  const DATABASE_ID = "674e5e7a0008e19d0ef0";
  const FILES_COLLECTION_ID = "6757aef2001ea2c6930a";
  const BUCKET_ID = "675fa4df00276e666e01";
  const toggleFileSelection = (fileId: string) => {
    setSelectedFiles((prev) => {
      const newSelection = new Set(prev);
      if (newSelection.has(fileId)) {
        newSelection.delete(fileId);
      } else {
        newSelection.add(fileId);
      }
      return newSelection;
    });
  };

  const selectAll = () => {
    if (selectedFiles.size === storedFiles.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(storedFiles.map((file) => file.$id)));
    }
  };

  const loadFiles = async () => {
    setLoading(true);
    setError("");

    try {
      let queries = [Query.orderDesc("$createdAt"), Query.limit(10000)];

      if (selectedContentType) {
        queries.push(Query.equal("contentType", selectedContentType));
      }

      // Thêm điều kiện filter cho soundType
      if (selectedContentType === "reading" && soundType) {
        queries.push(Query.equal("soundType", soundType));
      }

      const response = await databases.listDocuments<StoredFile>(
        DATABASE_ID,
        FILES_COLLECTION_ID,
        queries
      );

      setStoredFiles(response.documents);
    } catch (error: any) {
      console.error("Error loading files:", error);
      setError(error.message || "Không thể tải danh sách tệp tin");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFiles();
  }, [selectedContentType, soundType]); // Thêm soundType vào dependencies

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setIsUploading(true);
    const files = event.target.files;
    if (!files?.length) return;

    setUploadProgress({
      current: 0,
      total: files.length,
      currentFile: "",
    });

    try {
      const user = await account.get();
      const errors: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadProgress({
          current: i + 1,
          total: files.length,
          currentFile: file.name,
        });

        try {
          const uploadedFile = await storage.createFile(
            BUCKET_ID,
            ID.unique(),
            file
          );

          await databases.createDocument(
            DATABASE_ID,
            FILES_COLLECTION_ID,
            ID.unique(),
            {
              name: file.name,
              path: file.webkitRelativePath || file.name,
              type: file.type,
              uploadedBy: user.name,
              uploadedAt: new Date().toISOString(),
              status: "active",
              fileId: uploadedFile.$id,
              bucketId: BUCKET_ID,
              contentType: formData.contentType,

              description: formData.description,
              soundType: formData.contentType === "reading" ? soundType : null,
            }
          );
        } catch (error: any) {
          console.error(`Error processing file ${file.name}:`, error);
          errors.push(`Lỗi xử lý ${file.name}: ${error.message}`);
          continue;
        }
      }

      await loadFiles();
      setIsModalOpen(false);
      setFormData({
        contentType: "story",

        description: "",
      });
      setSoundType("");
      if (errors.length > 0) {
        setError(`Tải lên hoàn tất với một số lỗi:\n${errors.join("\n")}`);
      }
    } catch (error: any) {
      console.error("Error in upload process:", error);
      setError(error.message || "Lỗi tải lên tệp tin");
    } finally {
      setIsUploading(false);
      setUploadProgress({
        current: 0,
        total: 0,
        currentFile: "",
      });
    }
  };

  // Thêm các hàm xử lý xóa
  const handleDelete = async (file: StoredFile) => {
    setSelectedFiles(new Set([file.$id]));
    setDeleteModalOpen(true);
  };

  const handleBulkDelete = () => {
    if (selectedFiles.size === 0) return;
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (selectedFiles.size === 0) return;

    try {
      const filesToDelete = storedFiles.filter((file) =>
        selectedFiles.has(file.$id)
      );

      // Find any additional files that might be in subdirectories
      const additionalFiles = storedFiles.filter((file) =>
        filesToDelete.some(
          (selectedFile) =>
            file.path.startsWith(selectedFile.path) &&
            !selectedFiles.has(file.$id)
        )
      );

      const allFilesToDelete = [...filesToDelete, ...additionalFiles];

      // Create an array of promises for all delete operations
      const deletePromises = allFilesToDelete.map(async (file) => {
        try {
          // Delete from Storage first
          if (file.fileId && file.bucketId) {
            await storage.deleteFile(file.bucketId, file.fileId);
          }

          // Then delete from Database
          await databases.deleteDocument(
            DATABASE_ID,
            FILES_COLLECTION_ID,
            file.$id
          );
        } catch (error) {
          console.error(`Error deleting file ${file.name}:`, error);
          throw error;
        }
      });

      // Execute all delete operations
      await Promise.all(deletePromises);

      // Reset states
      setSelectedFiles(new Set());
      setDeleteModalOpen(false);

      // Show success message
      setError(`Đã xóa thành công ${allFilesToDelete.length} tập tin`);
      setTimeout(() => setError(""), 1500);

      // Refresh the file list
      await loadFiles();
    } catch (error: any) {
      console.error("Error deleting files:", error);
      setError(`Không thể xóa tập tin: ${error.message}`);
      setDeleteModalOpen(false);
    }
  };

  const handleContentTypeChange = (value: string) => {
    setSelectedContentType(value as ContentType | "");
  };

  return (
    <div className="bg-gray-50 min-h-screen p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Quản lý nội dung học tập
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Tổ chức và quản lý tài liệu học tập
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Tải lên
          </button>
        </div>

        {/* Filters Bar */}
        <div className="bg-white rounded-lg shadow p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <select
              value={selectedContentType}
              onChange={(e) => handleContentTypeChange(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tất cả loại nội dung</option>
              {contentTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
            {selectedContentType === "reading" && (
              <select
                value={soundType}
                onChange={(e) =>
                  setSoundType(e.target.value as "consonant" | "vowel")
                }
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Tất cả loại âm</option>
                <option value="consonant">Phụ âm</option>
                <option value="vowel">Nguyên âm</option>
              </select>
            )}

            {selectedFiles.size > 0 && (
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setSelectedFiles(new Set())}
                  className="px-4 py-2 text-gray-600 hover:text-gray-900"
                >
                  Bỏ chọn ({selectedFiles.size})
                </button>
                <button
                  onClick={handleBulkDelete}
                  className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Xóa
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-4 items-center">
          {storedFiles.length > 0 && (
            <button
              onClick={selectAll}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              {selectedFiles.size === storedFiles.length ? (
                <CheckSquare className="w-5 h-5" />
              ) : (
                <Square className="w-5 h-5" />
              )}
              Chọn tất cả
            </button>
          )}
        </div>
        {/* Content Grid */}
        <div className="bg-white rounded-lg shadow">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin h-8 w-8 border-b-2 border-blue-600 rounded-full mx-auto"></div>
              <p className="mt-4 text-gray-500">Đang tải...</p>
            </div>
          ) : storedFiles.length === 0 ? (
            <div className="p-8 text-center">
              <Folder className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Chưa có nội dung nào</p>
            </div>
          ) : (
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {storedFiles.map((file) => (
                  <div
                    key={file.$id}
                    className={`relative group rounded-lg border p-4 transition-all ${
                      selectedFiles.has(file.$id)
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-blue-300"
                    }`}
                  >
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => toggleFileSelection(file.$id)}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        {selectedFiles.has(file.$id) ? (
                          <CheckSquare className="w-5 h-5 text-blue-600" />
                        ) : (
                          <Square className="w-5 h-5 text-gray-400" />
                        )}
                      </button>
                    </div>

                    <div className="flex items-start gap-3">
                      <FileIcon type={file.type} />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 truncate">
                          {file.name}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          {new Date(file.uploadedAt).toLocaleDateString(
                            "vi-VN"
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                        {
                          contentTypes.find((t) => t.id === file.contentType)
                            ?.name
                        }
                      </span>

                      {/* Thêm hiển thị loại âm nếu là tập đọc */}
                      {file.contentType === "reading" && file.soundType && (
                        <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800">
                          {file.soundType === "consonant"
                            ? "Phụ âm"
                            : "Nguyên âm"}
                        </span>
                      )}
                    </div>

                    {file.description && (
                      <p className="mt-3 text-sm text-gray-600 line-clamp-2">
                        {file.description}
                      </p>
                    )}

                    <div className="mt-4 pt-4 border-t flex justify-between items-center">
                      <button
                        onClick={() =>
                          window.open(
                            storage
                              .getFileView(file.bucketId, file.fileId)
                              .toString(),
                            "_blank"
                          )
                        }
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Xem nội dung
                      </button>
                      <button
                        onClick={() => handleDelete(file)}
                        className="p-1 text-red-600 hover:text-red-800 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Keep existing modals and toast code */}
        {/* Upload Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">Tải lên nội dung mới</h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Loại nội dung
                  </label>
                  <select
                    value={formData.contentType}
                    disabled={isUploading}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        contentType: e.target.value as ContentType,
                      })
                    }
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {contentTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                </div>
                {formData.contentType === "reading" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Loại âm
                    </label>
                    <select
                      value={soundType}
                      onChange={(e) =>
                        setSoundType(e.target.value as "consonant" | "vowel")
                      }
                      className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Chọn loại âm</option>
                      <option value="consonant">Phụ âm</option>
                      <option value="vowel">Nguyên âm</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mô tả
                  </label>
                  <textarea
                    disabled={isUploading}
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Nhập mô tả về nội dung..."
                  />
                </div>

                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                  <div className="text-center">
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="mt-4 flex text-sm leading-6 text-gray-600 justify-center">
                      <label
                        htmlFor="file-upload"
                        className="relative cursor-pointer rounded-md bg-white font-semibold text-blue-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-blue-600 focus-within:ring-offset-2 hover:text-blue-500"
                      >
                        <span>Tải lên tệp tin</span>
                        <input
                          id="file-upload"
                          type="file"
                          className="sr-only"
                          onChange={handleFileUpload}
                          disabled={isUploading}
                          multiple
                        />
                      </label>
                      <p className="pl-1">hoặc kéo thả vào đây</p>
                    </div>
                    <p className="text-xs leading-5 text-gray-600 mt-2">
                      PDF, Word, Excel, PowerPoint, Audio và Video
                    </p>
                  </div>
                </div>

                {uploadProgress.total > 0 && (
                  <div className="mt-4">
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                        style={{
                          width: `${
                            (uploadProgress.current / uploadProgress.total) *
                            100
                          }%`,
                        }}
                      />
                    </div>
                    <p className="mt-2 text-sm text-gray-600">
                      Đang tải {uploadProgress.current} / {uploadProgress.total}{" "}
                      tệp tin
                    </p>
                    {uploadProgress.currentFile && (
                      <p className="text-sm text-gray-500 truncate">
                        Đang xử lý: {uploadProgress.currentFile}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteModalOpen && selectedFiles.size > 0 && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">Xác nhận xóa</h2>
                <button
                  onClick={() => setDeleteModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-600">
                    Bạn có chắc chắn muốn xóa{" "}
                    {selectedFiles.size === 1
                      ? "tập tin này"
                      : `${selectedFiles.size} tập tin`}
                    ?
                  </p>
                  <p className="mt-2 text-sm text-red-500">
                    Không thể hoàn tác hành động này
                  </p>
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => {
                      setDeleteModalOpen(false);
                      setSelectedFiles(new Set());
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={confirmDelete}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Xóa
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error Toast */}
        {error && (
          <div className="fixed bottom-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2 max-w-md animate-fade-in">
            <AlertCircle className="w-5 h-5" />
            <p>{error}</p>
            <button
              onClick={() => setError("")}
              className="ml-auto text-red-700 hover:text-red-900"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Exercise;
