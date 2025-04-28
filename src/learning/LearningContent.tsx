import { useEffect, useState } from "react";
import Modal from "../components/Modal";
import {
  Star,
  Lock,
  LucideIcon,
  BookOpen,
  School,
  University,
  Brain,
  Headphones,
  Pencil,
} from "lucide-react";
import LessonExercise from "./LessonExercise";
import { useAuth } from "../contexts/auth/authProvider";
import { ID, Query } from "appwrite";
import WritingArea from "../Management/WritingArea";
// Định nghĩa interface cho bài học
interface Lesson {
  id: number;
  title: string;
  icon: LucideIcon;
  color: string;
  isLocked: boolean;
  isCompleted: boolean;
  requiredLevel: number;
  stars: number;
}

// Định nghĩa initial state cho lessons
const initialLessons: Lesson[] = [
  {
    id: 1,
    title: "Cơ bản",
    icon: BookOpen,
    color: "#58CC02",
    isLocked: false,
    isCompleted: false,
    requiredLevel: 1,
    stars: 0,
  },
  {
    id: 2,
    title: "Trung cấp",
    icon: School,
    color: "#58CC02",
    isLocked: false,
    isCompleted: false,
    requiredLevel: 1,
    stars: 0,
  },
  {
    id: 3,
    title: "Nâng cao",
    icon: University,
    color: "#CE82FF",
    isLocked: false,
    isCompleted: false,
    requiredLevel: 2,
    stars: 0,
  },
  {
    id: 4,
    title: "Tổng hợp",
    icon: Brain,
    color: "#FF9600",
    isLocked: false,
    isCompleted: false,
    requiredLevel: 3,
    stars: 0,
  },
];

const listeningLevels = [
  {
    id: 1,
    title: "Luyện nghe cơ bản",
    icon: Headphones,
    color: "#2563EB", // màu blue-600
    isLocked: false,
    isCompleted: false,
    stars: 0,
  },
  {
    id: 2,
    title: "Luyện nghe trung cấp",
    icon: Headphones,
    color: "#4F46E5", // màu indigo-600
    isLocked: false,
    isCompleted: false,
    stars: 0,
  },
  {
    id: 3,
    title: "Luyện nghe nâng cao",
    icon: Headphones,
    color: "#7C3AED", // màu violet-600
    isLocked: false,
    isCompleted: false,
    stars: 0,
  },
  {
    id: 4,
    title: "Luyện nghe tổng hợp", // Sửa lại title cho đúng
    icon: Headphones,
    color: "#9333EA",
    isLocked: true,
    isCompleted: false,
    stars: 0,
    requiredLevel: 3,
  },
];
const LearningContent = () => {
  const [lessons, setLessons] = useState<Lesson[]>(initialLessons);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [lessonStars, setLessonStars] = useState<{ [key: number]: number }>({});
  const [isListeningModalOpen, setIsListeningModalOpen] = useState(false);
  const [isWritingModalOpen, setIsWritingModalOpen] = useState(false);
  const [selectedListeningLevel, setSelectedListeningLevel] = useState("");
  const [selectedListeningId, setSelectedListeningId] = useState(0);

  const [listeningLevelsState, setListeningLevelsState] =
    useState(listeningLevels);
  const [unlockedLevels] = useState<{
    [key: string]: boolean;
  }>(() => {
    const saved = localStorage.getItem("unlockedLevels");
    return saved ? JSON.parse(saved) : {};
  });
  const { databases, account } = useAuth();
  const DATABASE_ID = "674e5e7a0008e19d0ef0";
  const USER_PROGRESS_COLLECTION_ID = "67651970003a2f138575";
  // Sửa lại hàm handleListeningClick
  const handleListeningClick = (levelId: number) => {
    let levelName = "";
    switch (levelId) {
      case 1:
        levelName = "cơ bản";
        break;
      case 2:
        levelName = "trung cấp";
        break;
      case 3:
        levelName = "nâng cao";
        break;
      case 4:
        levelName = "tổng hợp";
        break;
    }
    setSelectedListeningLevel(levelName);
    setSelectedListeningId(levelId + 9); // ID từ 10-13 cho các cấp độ nghe
    setIsListeningModalOpen(true);
  };

  useEffect(() => {
    const fetchUserProgress = async () => {
      try {
        const user = await account.get();
        const response = await databases.listDocuments(
          DATABASE_ID,
          USER_PROGRESS_COLLECTION_ID,
          [Query.equal("userId", [user.$id])]
        );

        const progressMap: { [key: number]: number } = {};
        response.documents.forEach((doc) => {
          progressMap[doc.lessonId] = doc.stars;
        });

        // Sửa hàm kiểm tra điều kiện mở khóa
        const checkUnlock = (type: string) => {
          const baseId = type === "normal" ? 0 : type === "writing" ? 5 : 9;
          return [1, 2, 3].every(
            (id) => (progressMap[id + baseId] || 0) >= 1 // Yêu cầu ít nhất 1 sao
          );
        };

        // Cập nhật lessons thông thường
        const updatedLessons = lessons.map((lesson) => {
          if (lesson.id === 4) {
            const isUnlocked = checkUnlock("normal");
            return {
              ...lesson,
              isCompleted: !!progressMap[lesson.id],
              stars: progressMap[lesson.id] || 0,
              isLocked: !isUnlocked,
            };
          }
          return {
            ...lesson,
            isCompleted: !!progressMap[lesson.id],
            stars: progressMap[lesson.id] || 0,
          };
        });
        setLessons(updatedLessons);

        // Cập nhật listening levels
        const updatedListeningLevels = listeningLevelsState.map((level) => {
          if (level.id === 4) {
            const isUnlocked = checkUnlock("listening");
            return {
              ...level,
              stars: progressMap[level.id + 9] || 0,
              isLocked: !isUnlocked,
            };
          }
          return {
            ...level,
            stars: progressMap[level.id + 9] || 0,
          };
        });
        setListeningLevelsState(updatedListeningLevels);
      } catch (error) {
        console.error("Error fetching user progress:", error);
      }
    };

    fetchUserProgress();
  }, []);

  useEffect(() => {
    localStorage.setItem("unlockedLevels", JSON.stringify(unlockedLevels));
  }, [unlockedLevels]);

  const handleLessonClick = (lesson: Lesson) => {
    if (!lesson.isLocked) {
      setSelectedLesson(lesson);
      setIsModalOpen(true);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedLesson(null);
  };

  const updateLessonStars = async (
    lessonId: number,
    stars: number,
    score: number,
    timeSpent: number
  ) => {
    try {
      const user = await account.get();

      const existingProgress = await databases.listDocuments(
        DATABASE_ID,
        USER_PROGRESS_COLLECTION_ID,
        [Query.equal("userId", [user.$id]), Query.equal("lessonId", [lessonId])]
      );

      const progressData = {
        userId: user.$id,
        lessonId: lessonId,
        stars: stars,
        score: score,
        timeSpent: timeSpent,
        isCompleted: true,
        completedAt: new Date().toISOString(),
      };

      if (existingProgress.documents.length > 0) {
        await databases.updateDocument(
          DATABASE_ID,
          USER_PROGRESS_COLLECTION_ID,
          existingProgress.documents[0].$id,
          progressData
        );
      } else {
        await databases.createDocument(
          DATABASE_ID,
          USER_PROGRESS_COLLECTION_ID,
          ID.unique(),
          progressData
        );
      }

      // Cập nhật state local
      setLessonStars((prev) => ({
        ...prev,
        [lessonId]: stars,
      }));

      // Cập nhật lessons state và kiểm tra điều kiện mở khóa
      setLessons((prevLessons) => {
        const updatedLessons = prevLessons.map((lesson) => {
          if (lesson.id === lessonId) {
            return { ...lesson, isCompleted: true, stars: stars };
          }
          // Kiểm tra và cập nhật trạng thái khóa cho cấp độ tổng hợp
          if (lesson.id === 4) {
            const basicCompleted =
              prevLessons.find((l) => l.id === 1)?.isCompleted ||
              lessonId === 1;
            const intermediateCompleted =
              prevLessons.find((l) => l.id === 2)?.isCompleted ||
              lessonId === 2;
            const advancedCompleted =
              prevLessons.find((l) => l.id === 3)?.isCompleted ||
              lessonId === 3;

            const shouldUnlock =
              basicCompleted && intermediateCompleted && advancedCompleted;
            return { ...lesson, isLocked: !shouldUnlock };
          }
          return lesson;
        });
        return updatedLessons;
      });

      // Cập nhật listening levels với logic tương tự
      if (lessonId >= 10 && lessonId <= 13) {
        setListeningLevelsState((prevLevels) => {
          const updatedLevels = prevLevels.map((level) => {
            if (level.id === lessonId - 9) {
              return { ...level, stars };
            }
            // Kiểm tra và cập nhật khóa cho cấp độ tổng hợp
            if (level.id === 4) {
              const allPreviousCompleted = [1, 2, 3].every(
                (id) =>
                  (prevLevels.find((l) => l.id === id)?.stars ?? 0) > 0 ||
                  id === lessonId - 9
              );
              return { ...level, isLocked: !allPreviousCompleted };
            }
            return level;
          });
          return updatedLevels;
        });
      }
    } catch (error) {
      console.error("Error updating progress:", error);
    }
  };
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-6xl mx-auto px-4">
        {/* Main Learning Section */}
        <section className="mb-16">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Lộ trình học tập
            </h1>
            <p className="text-lg text-gray-600">
              Bắt đầu hành trình học tập của bạn với các bài học theo cấp độ
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {lessons.map((lesson) => (
              <div
                key={lesson.id}
                className={`bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300 ${
                  !lesson.isLocked && "transform hover:-translate-y-1"
                }`}
              >
                <div className="flex flex-col gap-4">
                  <div
                    onClick={() =>
                      !lesson.isLocked && handleLessonClick(lesson)
                    }
                    className={`w-16 h-16 rounded-xl flex items-center justify-center mb-2 mx-auto
                      ${lesson.isLocked ? "bg-gray-100" : "cursor-pointer"}`}
                    style={{
                      backgroundColor: lesson.isLocked
                        ? undefined
                        : `${lesson.color}15`,
                    }}
                  >
                    {lesson.isLocked ? (
                      <Lock className="w-7 h-7 text-gray-400" />
                    ) : (
                      <lesson.icon
                        className="w-8 h-8"
                        style={{ color: lesson.color }}
                      />
                    )}
                  </div>

                  <div className="text-center">
                    <h3 className="text-xl font-semibold text-gray-800 mb-3">
                      {lesson.title}
                    </h3>
                    <div className="flex justify-center gap-2">
                      {[1, 2, 3].map((star) => (
                        <Star
                          key={star}
                          className={`w-6 h-6 ${
                            star <= (lessonStars[lesson.id] || lesson.stars)
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-gray-200"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Listening Section */}
        <section className="mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Luyện kỹ năng nghe
            </h2>
            <p className="text-lg text-gray-600">
              Nâng cao khả năng nghe hiểu qua các bài tập tương tác
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {listeningLevelsState.map((level) => (
              <div
                key={level.id}
                className={`bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300 
                  ${!level.isLocked && "transform hover:-translate-y-1"}`}
              >
                <div className="flex flex-col gap-4">
                  <div
                    onClick={() =>
                      !level.isLocked && handleListeningClick(level.id)
                    }
                    className={`w-16 h-16 rounded-xl flex items-center justify-center mb-2 mx-auto
                      ${level.isLocked ? "bg-gray-100" : "cursor-pointer"}`}
                    style={{
                      backgroundColor: level.isLocked
                        ? undefined
                        : `${level.color}15`,
                    }}
                  >
                    {level.isLocked ? (
                      <Lock className="w-7 h-7 text-gray-400" />
                    ) : (
                      <level.icon
                        className="w-8 h-8"
                        style={{ color: level.color }}
                      />
                    )}
                  </div>

                  <div className="text-center">
                    <h3 className="text-lg font-semibold text-gray-800 mb-3">
                      {level.title}
                    </h3>
                    <div className="flex justify-center gap-2">
                      {[1, 2, 3].map((star) => (
                        <Star
                          key={star}
                          className={`w-6 h-6 ${
                            star <= level.stars
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-gray-200"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Writing Section */}
        <section className="mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Luyện kỹ năng viết
            </h2>
            <p className="text-lg text-gray-600">
              Thực hành viết chữ thông qua các bài tập tương tác
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex flex-col items-center gap-4">
              <div
                className="w-16 h-16 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: "#9333EA15" }}
              >
                <Pencil className="w-8 h-8" style={{ color: "#9333EA" }} />
              </div>

              <div className="text-center">
                <h3 className="text-xl font-semibold text-gray-800 mb-3">
                  Luyện viết chữ
                </h3>
                <p className="text-gray-600 mb-4">
                  Thực hành viết chữ với công cụ tương tác
                </p>
                <button
                  onClick={() => setIsWritingModalOpen(true)}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Bắt đầu luyện tập
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Modal cho cấp độ học */}
      <Modal isOpen={isModalOpen} onClose={handleCloseModal}>
        {selectedLesson && (
          <LessonExercise
            level={selectedLesson.title}
            lessonId={selectedLesson.id}
            onComplete={updateLessonStars}
            onClose={() => setIsModalOpen(false)}
          />
        )}
      </Modal>

      {/* Modal cho luyện nghe */}
      <Modal
        isOpen={isListeningModalOpen}
        onClose={() => setIsListeningModalOpen(false)}
      >
        <LessonExercise
          level={`Luyện nghe ${selectedListeningLevel}`}
          lessonId={selectedListeningId}
          onComplete={updateLessonStars}
          onClose={() => setIsListeningModalOpen(false)}
        />
      </Modal>
      {/* Modal cho luyện viết */}
      <Modal
        isOpen={isWritingModalOpen}
        onClose={() => setIsWritingModalOpen(false)}
      >
        <WritingArea />
      </Modal>
    </div>
  );
};

export default LearningContent;
