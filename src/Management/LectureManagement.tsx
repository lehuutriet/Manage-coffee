import React, { useEffect, useState } from "react";
import {
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  X,
  FileText,
  Trash2,
  Play,
  Download,
  MoveLeft,
  Pause,
} from "lucide-react";
import { useAuth } from "../contexts/auth/authProvider";
import { ID, Query } from "appwrite";
import CreateLectureModal from "../components/CreateLectureModal";
import IconEdu from "../image/IconEdu.jpg";
import SlidePreview from "../learning/SlidePreview";
import SlideThumbnails from "../learning/SlideThumbnails";
interface Slide {
  id: string;
  type: "cover" | "content" | "image" | "video";
  title?: string;
  content?: string;
  imageUrl?: string | null;
  videoUrl?: string | null;
  order?: number; // Make order optional
}

interface Lecture {
  id: string;
  title: string;
  subject: string;
  grade: string;
  description: string;
  thumbnailUrl?: string | null; // Adding null as possible type
  slides: Slide[];
  createdAt: string;
  status: "draft" | "published";
}

// Component PresentationMode
const PresentationMode: React.FC<{ slides: Slide[]; onClose: () => void }> = ({
  slides,
  onClose,
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);

  // Thêm useEffect để xử lý auto play
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (isPlaying) {
      intervalId = setInterval(() => {
        setCurrentSlide((prev) => {
          if (prev < slides.length - 1) {
            return prev + 1;
          } else {
            setIsPlaying(false); // Dừng lại khi đến slide cuối
            return prev;
          }
        });
      }, 3000); // Chuyển slide sau mỗi 5 giây
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isPlaying, slides.length]);
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowRight":
        case "Space":
          if (currentSlide < slides.length - 1) {
            nextSlide();
          }
          break;
        case "ArrowLeft":
          if (currentSlide > 0) {
            previousSlide();
          }
          break;
        case "Escape":
          onClose();
          break;
      }
    };

    document.addEventListener("keydown", handleKeyPress);
    return () => document.removeEventListener("keydown", handleKeyPress);
  }, [currentSlide, slides.length, onClose]);

  const nextSlide = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setCurrentSlide((prev) => Math.min(slides.length - 1, prev + 1));
    setTimeout(() => setIsAnimating(false), 500);
  };

  const previousSlide = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setCurrentSlide((prev) => Math.max(0, prev - 1));
    setTimeout(() => setIsAnimating(false), 500);
  };

  const renderSlideContent = (slide: Slide) => {
    switch (slide.type) {
      case "image":
        return (
          <div className="flex items-center justify-center h-full">
            <img
              src={slide.imageUrl || ""}
              alt={slide.title || ""}
              className="max-w-[95vw] max-h-[90vh] object-contain animate-fadeIn"
            />
          </div>
        );

      case "content":
        return (
          <div className="flex flex-col items-center justify-center h-full p-8 animate-slideIn">
            {slide.title && (
              <h2 className="text-4xl font-bold mb-8 text-center">
                {slide.title}
              </h2>
            )}
            <div className="prose prose-xl max-w-4xl text-center">
              {slide.content}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-50 text-white">
      <button
        onClick={() => setIsPlaying(!isPlaying)}
        className="absolute bottom-4 left-4 p-2 hover:bg-white/10 rounded-full transition-colors"
      >
        {isPlaying ? (
          <Pause className="w-6 h-6" /> // Thêm icon Pause từ lucide-react
        ) : (
          <Play className="w-6 h-6" /> // Thêm icon Play từ lucide-react
        )}
      </button>
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full transition-colors"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Slide content */}
      <div className="h-full flex items-center justify-center">
        {renderSlideContent(slides[currentSlide])}
      </div>

      {/* Navigation buttons */}
      <div className="absolute bottom-4 right-4 flex gap-4">
        <button
          onClick={previousSlide}
          disabled={currentSlide === 0}
          className="p-2 hover:bg-white/10 rounded-full transition-colors disabled:opacity-50"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="flex items-center text-sm">
          {currentSlide + 1} / {slides.length}
        </div>
        <button
          onClick={nextSlide}
          disabled={currentSlide === slides.length - 1}
          className="p-2 hover:bg-white/10 rounded-full transition-colors disabled:opacity-50"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};

const LectureManagement: React.FC = () => {
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [selectedLecture, setSelectedLecture] = useState<Lecture | null>(null);
  const [isPresentationMode, setIsPresentationMode] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentSlide, setCurrentSlide] = useState(0);
  const { storage, databases } = useAuth();
  const DATABASE_ID = "674e5e7a0008e19d0ef0";
  const LECTURES_COLLECTION_ID = "6768c2bc003540d2819a"; // Thay thế bằng ID collection thực tế
  const SLIDES_COLLECTION_ID = "6768c2d20028b42e6942"; // Thay thế bằng ID collection thực tế
  const BUCKET_Lectures = "6768c2e9001eabc5618f"; // Thay thế bằng ID bucket thực tế
  const [newLecture] = useState<Lecture>({
    id: ID.unique(),
    title: "",
    subject: "",
    grade: "",
    description: "",
    slides: [],
    createdAt: new Date().toISOString(),
    status: "draft",
  });

  // Fix handleCreateLecture to handle File objects correctly
  const handleCreateLecture = async (lectureData: any) => {
    try {
      // 1. Tạo lecture document trước
      const createdLecture = await databases.createDocument(
        DATABASE_ID,
        LECTURES_COLLECTION_ID,
        ID.unique(),
        {
          title: lectureData.title,
          subject: lectureData.subject,
          grade: lectureData.grade,
          description: lectureData.description,
          thumbnailFileId: lectureData.thumbnailFileId,
          status: "draft",
          createdAt: new Date().toISOString(),
        }
      );

      // 2. Tạo slides cho lecture đó
      const slidePromises = lectureData.slides.map((slide: any) =>
        databases.createDocument(
          DATABASE_ID,
          SLIDES_COLLECTION_ID, // Collection slides
          ID.unique(),
          {
            lectureId: createdLecture.$id, // ID của lecture vừa tạo
            type: slide.type,
            title: slide.title || "",
            content: slide.content || "",
            fileId: slide.fileId, // FileId đã được upload từ CreateLectureModal
            order: slide.order,
          }
        )
      );

      await Promise.all(slidePromises);
      await fetchLectures(); // Refresh danh sách bài giảng
      setIsCreateModalOpen(false);
    } catch (error) {
      console.error("Error creating lecture:", error);
      throw error;
    }
  };
  const filterLectures = () => {
    return lectures.filter((lecture) => {
      const searchLower = searchQuery.toLowerCase();
      return (
        lecture.title.toLowerCase().includes(searchLower) ||
        lecture.subject.toLowerCase().includes(searchLower) ||
        lecture.grade.toLowerCase().includes(searchLower) ||
        lecture.description.toLowerCase().includes(searchLower)
      );
    });
  };
  // Hàm fetch lectures từ database
  const fetchLectures = async () => {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        LECTURES_COLLECTION_ID
      );

      // Transform data và lấy thêm thông tin slides
      const lecturesWithSlides = await Promise.all(
        response.documents.map(async (lecture) => {
          // Fetch slides cho mỗi lecture
          const slidesResponse = await databases.listDocuments(
            DATABASE_ID,
            SLIDES_COLLECTION_ID,
            [Query.equal("lectureId", [lecture.$id])]
          );

          // Transform slides data
          const slides = await Promise.all(
            slidesResponse.documents.map(async (slide) => {
              let fileUrl = null;
              if (slide.fileId) {
                fileUrl = storage.getFilePreview(BUCKET_Lectures, slide.fileId);
              }

              return {
                id: slide.$id,
                type: slide.type,
                title: slide.title,
                content: slide.content,
                imageUrl: slide.type === "image" ? fileUrl : null,
                videoUrl: slide.type === "video" ? fileUrl : null,
                order: slide.order,
              };
            })
          );

          // Get thumbnail URL if exists
          let thumbnailUrl = null;
          if (lecture.thumbnailFileId) {
            thumbnailUrl = storage
              .getFileView(BUCKET_Lectures, lecture.thumbnailFileId)
              .toString();
            console.log("Thumbnail URL:", thumbnailUrl); // Log để kiểm tra URL
          }

          console.log("thumbnailUrl:", thumbnailUrl);
          return {
            id: lecture.$id,
            title: lecture.title,
            subject: lecture.subject,
            grade: lecture.grade,
            description: lecture.description,
            thumbnailUrl, // Thêm trường này
            slides: slides.sort((a, b) => a.order - b.order),
            createdAt: lecture.createdAt,
            status: lecture.status,
          };
        })
      );

      setLectures(lecturesWithSlides);
    } catch (error) {
      console.error("Error fetching lectures:", error);
    }
  };

  // Hàm xóa lecture
  const handleDeleteLecture = async (lectureId: string) => {
    try {
      // 1. Xóa tất cả slides của lecture
      const slidesResponse = await databases.listDocuments(
        DATABASE_ID,
        SLIDES_COLLECTION_ID,
        [Query.equal("lectureId", [lectureId])]
      );

      // Xóa files từ storage và slides từ database
      await Promise.all(
        slidesResponse.documents.map(async (slide) => {
          if (slide.fileId) {
            await storage.deleteFile(BUCKET_Lectures, slide.fileId);
          }
          await databases.deleteDocument(
            DATABASE_ID,
            SLIDES_COLLECTION_ID,
            slide.$id
          );
        })
      );

      // 2. Xóa thumbnail nếu có
      const lecture = await databases.getDocument(
        DATABASE_ID,
        LECTURES_COLLECTION_ID,
        lectureId
      );
      if (lecture.thumbnailFileId) {
        await storage.deleteFile(BUCKET_Lectures, lecture.thumbnailFileId);
      }

      // 3. Xóa lecture
      await databases.deleteDocument(
        DATABASE_ID,
        LECTURES_COLLECTION_ID,
        lectureId
      );

      // 4. Refresh danh sách
      await fetchLectures();
    } catch (error) {
      console.error("Error deleting lecture:", error);
    }
  };

  // Thêm useEffect để fetch lectures khi component mount
  useEffect(() => {
    fetchLectures();
  }, []);

  const renderCreateModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-4xl h-[90vh] flex flex-col">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-semibold">Tạo bài giảng mới</h2>
          <button
            onClick={() => setIsCreateModalOpen(false)}
            className="hover:bg-gray-100 p-1 rounded"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {isCreateModalOpen && (
          <CreateLectureModal
            isOpen={isCreateModalOpen}
            onClose={() => setIsCreateModalOpen(false)}
            onSubmit={handleCreateLecture}
          />
        )}
        {/* Footer Actions */}
        <div className="p-4 border-t flex justify-end gap-4">
          <button
            onClick={() => setIsCreateModalOpen(false)}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            Hủy
          </button>
          <button
            onClick={() => {
              setLectures((prev) => [...prev, newLecture]);
              setIsCreateModalOpen(false);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Lưu bài giảng
          </button>
        </div>
      </div>
    </div>
  );

  const renderPreviewModal = () => {
    if (!selectedLecture) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white w-full h-full flex flex-col">
          {/* Header */}
          <div className="h-16 bg-gray-800 flex items-center px-4 justify-between text-white">
            <div className="flex items-center">
              <button
                onClick={() => setIsPreviewModalOpen(false)}
                className="flex items-center hover:text-gray-300"
              >
                <MoveLeft className="w-5 h-5 mr-2" />
              </button>
              <h1 className="ml-4 text-4xl font-bold">
                {selectedLecture.title}
              </h1>
            </div>
            <div className="text-lg">
              {`Slide ${currentSlide + 1}/${selectedLecture.slides.length}`}
            </div>
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-4">
                <button
                  className="px-3 py-1 bg-blue-600 rounded-md hover:bg-blue-700 flex items-center gap-2"
                  onClick={startPresentation}
                >
                  <Play className="w-4 h-4" />
                  Trình chiếu
                </button>
                <button className="px-3 py-1 bg-green-600 rounded-md hover:bg-green-700 flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  Tải xuống
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 flex">
            {/* Main content */}
            <div className="flex flex-1">
              {/* Sidebar */}
              <div className="w-64 bg-gray-800">
                <SlideThumbnails
                  slides={selectedLecture.slides}
                  currentSlide={currentSlide}
                  onSlideClick={(index) => setCurrentSlide(index)}
                />
              </div>

              {/* Main Content */}
              <div className="flex-1 bg-white flex flex-col">
                <SlidePreview slide={selectedLecture.slides[currentSlide]} />
                {/* Navigation controls */}
                <div className="h-16 border-t flex items-center justify-between px-8">
                  <button
                    onClick={() =>
                      setCurrentSlide((prev) => Math.max(0, prev - 1))
                    }
                    disabled={currentSlide === 0}
                    className="px-4 py-2 bg-gray-800 text-white rounded-lg disabled:opacity-50"
                  >
                    Slide trước
                  </button>
                  <button
                    onClick={() =>
                      setCurrentSlide((prev) =>
                        Math.min(selectedLecture.slides.length - 1, prev + 1)
                      )
                    }
                    disabled={
                      currentSlide === selectedLecture.slides.length - 1
                    }
                    className="px-4 py-2 bg-gray-800 text-white rounded-lg disabled:opacity-50"
                  >
                    Slide tiếp theo
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const startPresentation = () => {
    if (!selectedLecture) return;
    setIsPresentationMode(true);
    document.documentElement.requestFullscreen();
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Quản lý bài giảng</h1>
        <p className="text-gray-600 mt-2">
          Tạo và quản lý nội dung bài giảng của bạn
        </p>
      </div>

      {/* Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Tìm kiếm bài giảng..."
                value={searchQuery}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setSearchQuery(e.target.value)
                }
                className="w-full pl-10 pr-4 py-2 border rounded-lg"
              />
              <Search className="absolute left-3 top-2.5 text-gray-400 w-5 h-5" />
            </div>

            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              Tạo bài giảng mới
            </button>
          </div>
        </div>

        {/* Lectures Grid */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filterLectures().map((lecture) => (
              <div
                key={lecture.id}
                className="bg-white rounded-lg shadow overflow-hidden border"
              >
                {/* Thumbnail */}
                <div className="aspect-video bg-gray-100 relative">
                  {lecture.thumbnailUrl ? (
                    <img
                      src={lecture.thumbnailUrl}
                      alt={lecture.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = IconEdu; // Ảnh mặc định
                      }}
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                      <FileText className="w-12 h-12 text-gray-400" />
                      <span className="text-gray-500 text-sm mt-2">
                        No thumbnail
                      </span>
                    </div>
                  )}

                  <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-40 transition-opacity flex items-center justify-center opacity-0 hover:opacity-100">
                    <button
                      onClick={() => {
                        setSelectedLecture(lecture);
                        setIsPreviewModalOpen(true);
                        setCurrentSlide(0);
                      }}
                      className="px-4 py-2 bg-white rounded-lg flex items-center gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      Xem trước
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4">
                  <h3 className="font-medium text-lg mb-2">{lecture.title}</h3>
                  <div className="flex items-center text-sm text-gray-500 mb-4 ">
                    <span className="mr-4 text-sm px-2 py-1 rounded-full bg-green-100">
                      {lecture.subject}
                    </span>
                    <span className="mr-4 text-sm px-2 py-1 rounded-full bg-blue-100">
                      {lecture.grade}
                    </span>
                  </div>

                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {lecture.description}
                  </p>

                  <div className="flex items-center justify-between">
                    <span
                      className={`text-sm px-2 py-1 rounded-full ${
                        lecture.status === "published" ? "" : ""
                      }`}
                    ></span>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSelectedLecture(lecture);
                          setIsPreviewModalOpen(true);
                          setCurrentSlide(0);
                        }}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-full"
                        title="Xem trước"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      <button
                        onClick={async () => {
                          if (deletingId) return; // Ngăn chặn bấm khi đang xóa
                          setDeletingId(lecture.id);
                          try {
                            await handleDeleteLecture(lecture.id);
                          } finally {
                            setDeletingId(null);
                          }
                        }}
                        disabled={deletingId === lecture.id}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Xóa"
                      >
                        {deletingId === lecture.id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-red-600 border-t-transparent" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {lectures.length === 0 && (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Chưa có bài giảng nào
              </h3>
              <p className="text-gray-500">
                Bắt đầu bằng cách tạo bài giảng đầu tiên của bạn
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {isCreateModalOpen && renderCreateModal()}
      {isPreviewModalOpen && renderPreviewModal()}
      {isPresentationMode && selectedLecture && (
        <PresentationMode
          slides={selectedLecture.slides}
          onClose={() => {
            setIsPresentationMode(false);
            document.exitFullscreen().catch(console.error);
          }}
        />
      )}
    </div>
  );
};

export default LectureManagement;
