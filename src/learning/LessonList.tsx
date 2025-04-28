import { useEffect, useState } from "react";
import { Download, Eye, MoveLeft, Play, Search } from "lucide-react";
import { Query } from "appwrite";
import { useAuth } from "../contexts/auth/authProvider";
import pptxgen from "pptxgenjs"; // Add this import at the top

import SlideThumbnails from "./SlideThumbnails";
import SlidePreview from "./SlidePreview";
import PresentationMode from "../components/PresentationMode";

interface Slide {
  id: string;
  type: "cover" | "content" | "image" | "video";
  title?: string;
  content?: string;
  imageUrl?: string | null;
  videoUrl?: string | null;
  order?: number;
}
interface FullScreenModalProps {
  lesson: Lecture | null;
  onClose: () => void;
}

interface Lecture {
  id: string;
  title: string;
  subject: string;
  grade: string;
  description: string;
  thumbnailUrl?: string | null;
  slides: Slide[];
  createdAt: string;
  status: "draft" | "published";
}

// Thêm component FullScreenModal
const FullScreenModal: React.FC<FullScreenModalProps> = ({
  lesson,
  onClose,
}) => {
  if (!lesson) return null;
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPresentationMode, setIsPresentationMode] = useState(false); // Thêm state này

  const handleDownload = async (lecture: Lecture): Promise<void> => {
    try {
      const pptx = new pptxgen();

      // Set presentation properties
      pptx.author = "Education Learn";
      pptx.title = lecture.title;

      // Convert slides to PowerPoint
      for (const slide of lecture.slides) {
        const pptSlide = pptx.addSlide();

        // Add title if exists
        if (slide.title) {
          pptSlide.addText(slide.title, {
            x: 0.5,
            y: 0.5,
            w: "90%",
            fontSize: 24,
            bold: true,
          });
        }

        switch (slide.type) {
          case "content":
            // Add content text
            if (slide.content) {
              pptSlide.addText(slide.content, {
                x: 0.5,
                y: slide.title ? 1.5 : 0.5,
                w: "90%",
                fontSize: 18,
                bullet: true,
              });
            }
            break;

          case "image":
            // Add image
            if (slide.imageUrl) {
              try {
                // Convert image URL to base64
                const response = await fetch(slide.imageUrl);
                const blob = await response.blob();
                const reader = new FileReader();

                await new Promise((resolve) => {
                  reader.onloadend = () => {
                    if (typeof reader.result === "string") {
                      pptSlide.addImage({
                        data: reader.result,
                        x: 0.5,
                        y: slide.title ? 1.5 : 0.5,
                        w: "90%",
                        h: "70%",
                      });
                    }
                    resolve(null);
                  };
                  reader.readAsDataURL(blob);
                });
              } catch (error) {
                console.error("Error adding image to slide:", error);
              }
            }
            break;
        }
      }

      // Save the PowerPoint file
      await pptx.writeFile({ fileName: `${lecture.title}.pptx` });
    } catch (error) {
      console.error("Error creating PowerPoint:", error);
    }
  };

  const startPresentation = () => {
    setIsPresentationMode(true);
    document.documentElement.requestFullscreen().catch(console.error);
  };

  return (
    <>
      <div className="fixed inset-0 bg-gray-900/95 backdrop-blur-sm z-50">
        <div className="h-screen w-full flex flex-col">
          {/* Header */}
          <div className="h-16 bg-gradient-to-r from-blue-600 to-blue-800 flex items-center px-6 justify-between text-white">
            <div className="flex items-center space-x-4">
              <button
                onClick={onClose}
                className="hover:bg-white/10 p-2 rounded-full transition-colors"
              >
                <MoveLeft className="w-5 h-5" />
              </button>
              <h1 className="text-2xl font-bold">{lesson?.title}</h1>
            </div>

            <div className="flex items-center space-x-4">
              <span className="text-sm">
                Slide {currentSlide + 1}/{lesson?.slides.length}
              </span>
              <button
                onClick={startPresentation}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors flex items-center gap-2"
              >
                <Play className="w-4 h-4" />
                Trình chiếu
              </button>
              <button
                onClick={() => handleDownload(lesson)}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Tải xuống
              </button>
            </div>
          </div>

          {/* Main content area with updated styling */}
          <div className="flex-1 flex">
            <div className="w-72 bg-gray-900">
              <SlideThumbnails
                slides={lesson.slides}
                currentSlide={currentSlide}
                onSlideClick={setCurrentSlide}
              />
            </div>

            <div className="flex-1 bg-white flex flex-col">
              <SlidePreview slide={lesson?.slides[currentSlide]} />
              <div className="h-20 border-t flex items-center justify-between px-8 bg-gray-50">
                <button
                  onClick={() =>
                    setCurrentSlide((prev) => Math.max(0, prev - 1))
                  }
                  disabled={currentSlide === 0}
                  className="px-6 py-3 bg-blue-600 text-white rounded-full disabled:opacity-50 transition-all hover:bg-blue-700"
                >
                  Slide trước
                </button>
                <button
                  onClick={() =>
                    setCurrentSlide((prev) =>
                      Math.min(lesson.slides.length - 1, prev + 1)
                    )
                  }
                  disabled={currentSlide === (lesson?.slides.length || 1) - 1}
                  className="px-6 py-3 bg-blue-600 text-white rounded-full disabled:opacity-50 transition-all hover:bg-blue-700"
                >
                  Slide tiếp theo
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Thêm PresentationMode */}
      {isPresentationMode && (
        <PresentationMode
          slides={lesson.slides}
          onClose={() => {
            setIsPresentationMode(false);
            document.exitFullscreen().catch(console.error);
          }}
        />
      )}
    </>
  );
};

// Component hiển thị chi tiết bài học

// Component hiển thị danh sách bài học
const LessonList = () => {
  const [lectures, setLectures] = useState<Lecture[]>([]);

  const [quickViewLesson, setQuickViewLesson] = useState<Lecture | null>(null);
  const [selectedSubject, setSelectedSubject] = useState("Tất cả");
  const [searchQuery, setSearchQuery] = useState("");

  const { storage, databases } = useAuth();
  const DATABASE_ID = "674e5e7a0008e19d0ef0";
  const LECTURES_COLLECTION_ID = "6768c2bc003540d2819a";
  const SLIDES_COLLECTION_ID = "6768c2d20028b42e6942";
  const BUCKET_Lectures = "6768c2e9001eabc5618f";
  const [selectedGrade, setSelectedGrade] = useState<number>(0);
  const [isPresentationMode, setIsPresentationMode] = useState(false);

  const grades = [
    { id: 0, name: "Tất cả" },
    { id: 1, name: "Lớp 1" },
    { id: 2, name: "Lớp 2" },
    { id: 3, name: "Lớp 3" },
    { id: 4, name: "Lớp 4" },
    { id: 5, name: "Lớp 5" },
    { id: 6, name: "Lớp 6" },
    { id: 7, name: "Lớp 7" },
    { id: 8, name: "Lớp 8" },
    { id: 9, name: "Lớp 9" },
    { id: 10, name: "Lớp 10" },
    { id: 11, name: "Lớp 11" },
    { id: 12, name: "Lớp 12" },
  ];

  const fetchLectures = async () => {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        LECTURES_COLLECTION_ID
      );

      // Xử lý lấy thông tin lectures và slides
      const lecturesWithSlides = await Promise.all(
        response.documents.map(async (lecture) => {
          // Fetch slides cho mỗi lecture
          const slidesResponse = await databases.listDocuments(
            DATABASE_ID,
            SLIDES_COLLECTION_ID,
            [Query.equal("lectureId", [lecture.$id])]
          );

          // Xử lý file URLs cho mỗi slide
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

                order: slide.order,
              };
            })
          );

          // Lấy URL thumbnail nếu có
          let thumbnailUrl = null;
          if (lecture.thumbnailFileId) {
            thumbnailUrl = storage
              .getFileView(BUCKET_Lectures, lecture.thumbnailFileId)
              .toString();
          }

          return {
            id: lecture.$id,
            title: lecture.title,
            subject: lecture.subject,
            grade: lecture.grade,
            description: lecture.description,
            thumbnailUrl,
            slides: slides.sort((a, b) => (a.order || 0) - (b.order || 0)),
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

  useEffect(() => {
    fetchLectures();
  }, []);

  const filteredLectures = lectures.filter((lecture) => {
    // Lọc theo từ khóa tìm kiếm
    const matchesSearch = lecture.title
      .toLowerCase()
      .includes(searchQuery.toLowerCase());

    // Lọc theo môn học
    const matchesSubject =
      selectedSubject === "Tất cả" || lecture.subject === selectedSubject;

    // Lọc theo lớp
    const matchesGrade =
      selectedGrade === 0 || lecture.grade === `Lớp ${selectedGrade}`;

    return matchesSearch && matchesSubject && matchesGrade;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-8">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold mb-4">Bài giảng</h1>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Tìm kiếm bài giảng..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-5 py-3 pr-12 rounded-full text-gray-900 focus:ring-2 focus:ring-blue-400 focus:outline-none"
                />
                <Search
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
                  size={20}
                />
              </div>
            </div>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="px-5 py-3 rounded-full bg-white text-gray-900 border-white/20 focus:outline-none"
            >
              <option value="Tất cả">Tất cả môn học</option>
              <option value="Tiếng Việt">Tiếng Việt</option>
              <option value="Toán">Toán</option>
              <option value="Tiếng Anh">Tiếng Anh</option>
              <option value="Ngôn ngữ kí hiệu">Ngôn ngữ kí hiệu</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grade selection */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4">
          <div className="flex overflow-x-auto py-2 gap-2">
            {grades.map((grade) => (
              <button
                key={grade.id}
                onClick={() => setSelectedGrade(grade.id)}
                className={`px-6 py-2 rounded-full whitespace-nowrap transition-all
                  ${
                    selectedGrade === grade.id
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
              >
                {grade.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Lessons grid */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredLectures.map((lecture) => (
            <div
              key={lecture.id}
              className="bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-lg transition-shadow"
            >
              <div className="relative group">
                <img
                  src={lecture.thumbnailUrl || "/api/placeholder/400/200"}
                  alt=""
                  className="w-full h-48 object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => setQuickViewLesson(lecture)}
                    className="absolute bottom-4 left-4 flex items-center gap-2 px-4 py-2 bg-white/90 text-gray-900 rounded-full hover:bg-white"
                  >
                    <Eye className="w-4 h-4" />
                    Xem nhanh
                  </button>
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-lg mb-2 line-clamp-2">
                  {lecture.title}
                </h3>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-700">
                    {lecture.subject}
                  </span>
                  <span className="px-3 py-1 rounded-full text-sm bg-green-100 text-green-700">
                    {lecture.grade}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modals */}
      {quickViewLesson && (
        <FullScreenModal
          lesson={quickViewLesson}
          onClose={() => setQuickViewLesson(null)}
        />
      )}
      {isPresentationMode && quickViewLesson && (
        <PresentationMode
          slides={quickViewLesson.slides}
          onClose={() => {
            setIsPresentationMode(false);
            document.exitFullscreen().catch(console.error);
          }}
        />
      )}
    </div>
  );
};

export default LessonList;
