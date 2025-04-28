import { useState } from "react";
import { X, FileText, Image, Upload, Trash2 } from "lucide-react";
import { ID } from "appwrite";
interface Slide {
  id: string;
  type: "cover" | "content" | "image" | "video";
  title: string;
  content?: string;
  imageUrl?: string;
  videoUrl?: string;
  order: number;
  file?: File;
}
import { useAuth } from "../contexts/auth/authProvider";
interface CreateLectureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
}
const CreateLectureModal = ({
  isOpen,
  onClose,
  onSubmit,
}: CreateLectureModalProps) => {
  const [step, setStep] = useState("basicInfo"); // basicInfo or slides
  const [formData, setFormData] = useState({
    title: "",
    subject: "",
    grade: "",
    description: "",
    thumbnail: null as File | null,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting] = useState(false);
  const BUCKET_Lectures = "6768c2e9001eabc5618f"; // Thay thế bằng ID bucket thực tế
  const { storage } = useAuth();
  const [newLecture, setNewLecture] = useState<{
    slides: Slide[];
    currentSlide: number;
  }>({
    slides: [],
    currentSlide: 0,
  });

  const handleBasicInfoSubmit = (e: any) => {
    e.preventDefault();
    if (!formData.title || !formData.subject || !formData.grade) {
      // Validate required fields
      return;
    }
    setStep("slides"); // Move to slides step
  };

  const handleAddSlide = (type: any) => {
    setNewLecture((prev) => ({
      ...prev,
      slides: [
        ...prev.slides,
        {
          id: Date.now().toString(),
          type,
          title: "",
          content: "",
          order: prev.slides.length,
        },
      ],
    }));
  };

  const handleFinalSubmit = async () => {
    if (isSubmitting) return;
    try {
      setIsSubmitting(true);
      // Upload thumbnail first if exists
      let thumbnailFileId = null;
      if (formData.thumbnail) {
        const uploadedThumbnail = await storage.createFile(
          BUCKET_Lectures,
          ID.unique(),
          formData.thumbnail
        );
        thumbnailFileId = uploadedThumbnail.$id;
      }

      // Upload files for each slide that has image/video
      const processedSlides = await Promise.all(
        newLecture.slides.map(async (slide) => {
          // Nếu slide có chứa file
          if (slide.file) {
            let fileId = null;
            try {
              const uploadedFile = await storage.createFile(
                BUCKET_Lectures,
                ID.unique(),
                slide.file
              );
              fileId = uploadedFile.$id;
            } catch (error) {
              console.error("Error uploading file for slide:", error);
              throw error;
            }

            // Return slide with fileId from storage
            return {
              ...slide,
              fileId, // Thêm fileId từ storage
              // Xóa các trường không cần thiết
              file: undefined,
              imageUrl: undefined,
              videoUrl: undefined,
            };
          }
          return slide;
        })
      );

      // Combine all data
      const finalData = {
        ...formData,
        thumbnailFileId,
        slides: processedSlides,
      };

      // Submit to database
      await onSubmit(finalData);
      onClose();
    } catch (error) {
      console.error("Error saving lecture:", error);
      // Có thể thêm xử lý lỗi ở đây (hiển thị thông báo lỗi...)
    } finally {
      setIsSubmitting(false); // Kết thúc loading
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-4xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-semibold">
            {step === "basicInfo" ? "Thông tin bài giảng" : "Tạo nội dung"}
          </h2>
          <button onClick={onClose} className="hover:bg-gray-100 p-1 rounded">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {step === "basicInfo" ? (
            // Basic Info Form
            <form onSubmit={handleBasicInfoSubmit} className="p-6 space-y-6">
              <div>
                <label className="block mb-1">Tiêu đề bài giảng</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  className="w-full border rounded p-2"
                />
              </div>

              <div>
                <label className="block mb-1">Môn học</label>
                <select
                  required
                  value={formData.subject}
                  onChange={(e) =>
                    setFormData({ ...formData, subject: e.target.value })
                  }
                  className="w-full border rounded p-2"
                >
                  <option value="">Chọn môn học</option>
                  <option>Tiếng Việt</option>
                  <option>Toán</option>
                  <option>Tiếng Anh</option>
                  <option>Ngôn ngữ kí hiệu</option>
                </select>
              </div>

              <div>
                <label className="block mb-1">Khối lớp</label>
                <select
                  required
                  value={formData.grade}
                  onChange={(e) =>
                    setFormData({ ...formData, grade: e.target.value })
                  }
                  className="w-full border rounded p-2"
                >
                  <option value="">Chọn khối lớp</option>
                  <option>Lớp 1</option>
                  <option>Lớp 2</option>
                  <option>Lớp 3</option>
                  <option>Lớp 4</option>
                  <option>Lớp 5</option>
                </select>
              </div>

              <div>
                <label className="block mb-1">Mô tả</label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full border rounded p-2"
                  rows={4}
                />
              </div>

              <div>
                <label className="block mb-1">Ảnh thumbnail</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      thumbnail: e.target.files?.[0] || null,
                    })
                  }
                  className="w-full"
                />
              </div>

              <div className="flex justify-end gap-4 mt-6">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-gray-100 rounded hover:bg-gray-200"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Tiếp tục
                </button>
              </div>
            </form>
          ) : (
            // Slides Editor
            <div className="flex h-full">
              {/* Slide List Sidebar */}
              <div className="w-64 border-r bg-gray-50 p-4">
                <div className="space-y-4">
                  <button
                    onClick={() => handleAddSlide("content")}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-lg flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    Thêm slide nội dung
                  </button>

                  <button
                    onClick={() => handleAddSlide("image")}
                    className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg flex items-center gap-2"
                  >
                    <Image className="w-4 h-4" />
                    Thêm slide hình ảnh
                  </button>
                </div>

                {/* Slide List */}
                <div className="mt-6 space-y-2">
                  {newLecture.slides.map((slide, index) => (
                    <div
                      key={slide.id}
                      className={`p-3 rounded-lg cursor-pointer ${
                        newLecture.currentSlide === index
                          ? "bg-blue-100"
                          : "hover:bg-gray-100"
                      }`}
                      onClick={() =>
                        setNewLecture((prev) => ({
                          ...prev,
                          currentSlide: index,
                        }))
                      }
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">
                          {slide.title || `Slide ${index + 1}`}{" "}
                          {/* Sử dụng slide.title nếu có, nếu không thì hiện Slide số */}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setNewLecture((prev) => ({
                              ...prev,
                              slides: prev.slides.filter((_, i) => i !== index),
                            }));
                          }}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Slide Editor */}
              <div className="flex-1 p-6">
                {newLecture.slides[newLecture.currentSlide] ? (
                  <div className="space-y-6">
                    <input
                      type="text"
                      value={
                        newLecture.slides[newLecture.currentSlide].title || ""
                      }
                      onChange={(e) => {
                        const updatedSlides = [...newLecture.slides];
                        updatedSlides[newLecture.currentSlide] = {
                          ...updatedSlides[newLecture.currentSlide],
                          title: e.target.value,
                        };
                        setNewLecture((prev) => ({
                          ...prev,
                          slides: updatedSlides,
                        }));
                      }}
                      placeholder="Tiêu đề slide"
                      className="w-full px-4 py-2 text-xl font-medium border-b focus:outline-none focus:border-blue-500"
                    />

                    {newLecture.slides[newLecture.currentSlide].type ===
                      "content" && (
                      <textarea
                        value={
                          newLecture.slides[newLecture.currentSlide].content ||
                          ""
                        }
                        onChange={(e) => {
                          const updatedSlides = [...newLecture.slides];
                          updatedSlides[newLecture.currentSlide] = {
                            ...updatedSlides[newLecture.currentSlide],
                            content: e.target.value,
                          };
                          setNewLecture((prev) => ({
                            ...prev,
                            slides: updatedSlides,
                          }));
                        }}
                        placeholder="Nhập nội dung slide..."
                        className="w-full h-64 p-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    )}

                    {(newLecture.slides[newLecture.currentSlide].type ===
                      "image" ||
                      newLecture.slides[newLecture.currentSlide].type ===
                        "video") && (
                      <div className="border-2 border-dashed rounded-lg p-8 text-center">
                        <input
                          type="file"
                          accept={
                            newLecture.slides[newLecture.currentSlide].type ===
                            "image"
                              ? "image/*"
                              : "video/*"
                          }
                          className="hidden"
                          id="file-upload"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              // Tạo URL tạm thời cho file
                              const fileUrl = URL.createObjectURL(file);

                              // Cập nhật slide hiện tại với URL của file
                              const updatedSlides = [...newLecture.slides];
                              updatedSlides[newLecture.currentSlide] = {
                                ...updatedSlides[newLecture.currentSlide],
                                [newLecture.slides[newLecture.currentSlide]
                                  .type === "image"
                                  ? "imageUrl"
                                  : "videoUrl"]: fileUrl,
                                file: file, // Lưu file để sau này upload
                              };

                              setNewLecture((prev) => ({
                                ...prev,
                                slides: updatedSlides,
                              }));
                            }
                          }}
                        />

                        <label
                          htmlFor="file-upload"
                          className="cursor-pointer flex flex-col items-center"
                        >
                          {/* Hiển thị preview nếu đã chọn file */}
                          {newLecture.slides[newLecture.currentSlide]
                            .imageUrl ? (
                            <img
                              src={
                                newLecture.slides[newLecture.currentSlide]
                                  .imageUrl
                              }
                              alt="Preview"
                              className="max-h-48 mb-4 rounded"
                            />
                          ) : newLecture.slides[newLecture.currentSlide]
                              .videoUrl ? (
                            <video
                              src={
                                newLecture.slides[newLecture.currentSlide]
                                  .videoUrl
                              }
                              className="max-h-48 mb-4 rounded"
                              controls
                            />
                          ) : (
                            <>
                              <Upload className="w-12 h-12 text-gray-400 mb-4" />
                              <span className="text-gray-600">
                                Tải lên{" "}
                                {newLecture.slides[newLecture.currentSlide]
                                  .type === "image"
                                  ? "hình ảnh"
                                  : "video"}
                              </span>
                            </>
                          )}
                        </label>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-gray-500">
                    <FileText className="w-12 h-12 mb-4" />
                    <p>Chọn hoặc tạo slide mới để bắt đầu</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {step === "slides" && (
          <div className="p-4 border-t flex justify-between">
            <button
              onClick={() => setStep("basicInfo")}
              className="px-4 py-2 text-gray-600 hover:text-gray-900"
            >
              Quay lại
            </button>
            <div className="flex gap-4">
              <button
                onClick={onClose}
                disabled={isSubmitting || isDeleting}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Hủy
              </button>
              <button
                onClick={handleFinalSubmit}
                disabled={isSubmitting || isDeleting}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    <span>Đang lưu...</span>
                  </>
                ) : (
                  "Lưu bài giảng"
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateLectureModal;
