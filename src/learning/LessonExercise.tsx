import { useState, useEffect } from "react";
import { Heart, Circle, AlertCircle, Headphones } from "lucide-react";
import { useAuth } from "../contexts/auth/authProvider";
import { Models } from "appwrite";
import { Query } from "appwrite";

interface Question extends Models.Document {
  type: "select" | "translate";
  prompt: string;
  options?: string[];
  answer: string;
  level: "beginner" | "intermediate" | "advanced";
  category: string;
  imageId?: string;
  bucketId?: string;
}
interface LessonStats {
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  remainingLives: number;
  timeSpent: number;
}
interface LessonExerciseProps {
  level: string;
  lessonId: number;
  onComplete: (
    lessonId: number,
    stars: number,
    score: number,
    timeSpent: number
  ) => void;
  onClose: () => void;
}
interface WritingListeningContent extends Models.Document {
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
const LessonExercise: React.FC<LessonExerciseProps> = ({
  level,
  lessonId,
  onComplete,
  onClose,
}) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selected, setSelected] = useState<string>("");
  const [lives, setLives] = useState(3);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [questionImage, setQuestionImage] = useState<string | null>(null);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const [showContinueButton, setShowContinueButton] = useState(false);
  const [startTime] = useState<number>(Date.now());

  const { databases, storage } = useAuth();
  const DATABASE_ID = "674e5e7a0008e19d0ef0";
  const QUESTIONS_COLLECTION_ID = "6764ca50000079439b57";
  const WRITINGLISTEN_CONLLECTION_ID = "677ccf910016bee396ad";
  useEffect(() => {
    fetchQuestions();
  }, []);
  const calculateStats = (): LessonStats => {
    const endTime = Date.now(); // Lưu thời điểm kết thúc
    const timeSpent = Math.floor((endTime - startTime) / 1000); // Tính thời gian một lần

    return {
      totalQuestions: questions.length,
      correctAnswers: correctAnswers,
      wrongAnswers: questions.length - correctAnswers,
      remainingLives: lives,
      timeSpent: timeSpent,
    };
  };
  useEffect(() => {
    // Load image for current question if it exists
    loadQuestionImage();
  }, [currentQuestion]);

  const loadQuestionImage = async () => {
    const currentQ = questions[currentQuestion];
    if (currentQ?.imageId && currentQ?.bucketId) {
      try {
        const imageUrl = storage.getFilePreview(
          currentQ.bucketId,
          currentQ.imageId
        );
        setQuestionImage(imageUrl.toString());
      } catch (error) {
        console.error("Error loading question image:", error);
        setQuestionImage(null);
      }
    } else {
      setQuestionImage(null);
    }
  };

  const shuffleArray = (array: any[]) => {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  };

  const fetchQuestions = async () => {
    try {
      setLoading(true);

      // Xác định level cần lọc và loại bài tập
      let levelToFilter = "";
      const isListening = level.includes("Luyện nghe");
      const isWriting = level.includes("Luyện viết");

      if (level.includes("cơ bản")) {
        levelToFilter = "beginner";
      } else if (level.includes("trung cấp")) {
        levelToFilter = "intermediate";
      } else if (level.includes("nâng cao")) {
        levelToFilter = "advanced";
      }

      if (isListening || isWriting) {
        // Xử lý cho luyện nghe và luyện viết
        const response = await databases.listDocuments<WritingListeningContent>(
          DATABASE_ID,
          WRITINGLISTEN_CONLLECTION_ID,
          [
            Query.equal("type", isListening ? "listening" : "writing"),
            ...(level.includes("tổng hợp")
              ? []
              : [Query.equal("level", levelToFilter)]),
          ]
        );

        // Convert WritingListeningContent thành Question
        const convertedQuestions = response.documents.map((doc) => ({
          $id: doc.$id,
          type: "select",
          prompt: doc.title || doc.description,
          options: doc.options || [],
          answer: doc.answer || "",
          category: doc.category,
          level: doc.level,
          imageId: doc.imageFileId,
          bucketId: doc.bucketId,
          fileId: doc.fileId,
          $createdAt: doc.$createdAt,
          $updatedAt: doc.$updatedAt,
          $permissions: doc.$permissions,
          $collectionId: doc.$collectionId,
          $databaseId: doc.$databaseId,
        }));

        // Random và giới hạn số câu
        const randomizedQuestions = shuffleArray(convertedQuestions).slice(
          0,
          100
        );
        setQuestions(randomizedQuestions);
      } else {
        // Xử lý cho các level thông thường
        const levelMapping: { [key: string]: string } = {
          "Cơ bản": "beginner",
          "Trung cấp": "intermediate",
          "Nâng cao": "advanced",
        };

        const response = await databases.listDocuments<Question>(
          DATABASE_ID,
          QUESTIONS_COLLECTION_ID,
          level === "Tổng hợp"
            ? []
            : [Query.equal("level", levelMapping[level])]
        );

        // Random và giới hạn số câu cho câu hỏi thông thường
        const randomizedQuestions = shuffleArray(response.documents).slice(
          0,
          100
        );
        setQuestions(randomizedQuestions);
      }
    } catch (error) {
      console.error("Error fetching questions:", error);
      setError("Không thể tải câu hỏi");
    } finally {
      setLoading(false);
    }
  };

  const resetExercise = () => {
    setLives(3);
    setCurrentQuestion(0);
    setCorrectAnswers(0);
    setSelected("");
    setShowFeedback(false);
    setIsCompleted(false);
    setShowAnswer(false); // Thêm dòng này để reset state showAnswer
    fetchQuestions();
  };

  // Thêm useEffect để xử lý feedback timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (showFeedback) {
      timer = setTimeout(() => {
        setShowFeedback(false);
        setShowContinueButton(true);
      }, 1000); // 5000ms = 5 giây
    }

    // Cleanup function để tránh memory leak
    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [showFeedback]);

  // Sửa lại hàm handleAnswer
  const handleAnswer = () => {
    const correct = selected === questions[currentQuestion].answer;
    setIsCorrect(correct);
    setShowFeedback(true);
    // Xóa dòng này vì nó sẽ được set trong useEffect
    // setShowContinueButton(true);

    if (!correct) {
      setShowAnswer(true);
      const newLives = lives - 1;
      setLives(newLives);
    } else {
      setCorrectAnswers((prev) => prev + 1);
    }
  };

  const handleContinue = async () => {
    setShowFeedback(false);
    setShowAnswer(false);
    setShowContinueButton(false);
    setSelected("");

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      const stars = calculateStars(correctAnswers, questions.length);
      const stats = calculateStats();
      const score = Math.round((correctAnswers / questions.length) * 100);
      // Pass score and timeSpent to onComplete
      onComplete(lessonId, stars, score, stats.timeSpent);
      setIsCompleted(true);
    }
  };

  const calculateStars = (correct: number, total: number) => {
    const percentage = (correct / total) * 100;
    if (percentage >= 90) return 3;
    if (percentage >= 70) return 2;
    if (percentage >= 50) return 1;
    return 0;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="bg-red-50 p-4 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  if (isCompleted) {
    // Tính toán số sao đạt được
    const stars = calculateStars(correctAnswers, questions.length);
    const stats = calculateStats();
    const accuracy = Math.round(
      (stats.correctAnswers / stats.totalQuestions) * 100
    );

    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
        <div className="bg-white p-8 rounded-xl max-w-lg w-full mx-4">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              Chúc mừng bạn đã hoàn thành!
            </h2>

            {/* Hiển thị số sao */}
            <div className="flex justify-center gap-2 mb-8">
              {[...Array(3)].map((_, index) => (
                <svg
                  key={index}
                  className={`w-12 h-12 ${
                    index < stars
                      ? "text-yellow-400 fill-current"
                      : "text-gray-300"
                  }`}
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 .587l3.668 7.431 8.332 1.21-6.001 5.848 1.416 8.255-7.415-3.897-7.415 3.897 1.416-8.255-6.001-5.848 8.332-1.21z" />
                </svg>
              ))}
            </div>

            {/* Thống kê chi tiết */}
            <div className="bg-gray-50 rounded-xl p-6 mb-6 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Độ chính xác:</span>
                <span className="font-bold text-lg">{accuracy}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Số câu đúng:</span>
                <span className="font-bold text-lg text-green-600">
                  {stats.correctAnswers}/{stats.totalQuestions}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Mạng còn lại:</span>
                <span className="font-bold text-lg text-red-600">
                  {stats.remainingLives}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Thời gian hoàn thành:</span>
                <span className="font-bold text-lg">
                  {Math.floor(stats.timeSpent / 60)}:
                  {(stats.timeSpent % 60).toString().padStart(2, "0")}
                </span>
              </div>
            </div>

            {/* Nút điều hướng */}
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => {
                  resetExercise();
                  setIsCompleted(false);
                }}
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
              >
                Làm lại
              </button>
              <button
                onClick={() => {
                  // Đóng modal và kết thúc
                  setIsCompleted(false);
                  onClose();
                  // Có thể thêm hàm để đóng modal nếu cần
                }}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                Tiếp tục
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (lives === 0) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
        <div className="bg-white p-8 rounded-xl max-w-md w-full mx-4">
          <h2 className="text-2xl font-bold text-red-600 mb-4">
            Bài học kết thúc
          </h2>
          <p className="text-gray-600 mb-6">Bạn đã hết số lượt thử</p>
          <div className="flex gap-4">
            <button
              onClick={() => {
                resetExercise();
                setIsCompleted(false);
              }}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Thử lại
            </button>
            <button
              onClick={() => {
                // Đóng modal và kết thúc
                setIsCompleted(false);
                onClose();
                // Có thể thêm hàm để đóng modal nếu cần
              }}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Kết thúc
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Progress Bar and Lives */}
      <div className="fixed top-0 left-0 right-0 bg-white p-4 shadow-md">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="w-full mr-4">
            <div className="h-3 bg-gray-200 rounded-full">
              <div
                className="h-full bg-green-500 rounded-full transition-all"
                style={{
                  width: `${((currentQuestion + 1) / questions.length) * 100}%`,
                }}
              />
            </div>
          </div>
          <div className="flex gap-1">
            {[...Array(lives)].map((_, i) => (
              <Heart key={i} className="w-6 h-6 fill-red-500 text-red-500" />
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 mt-20 max-w-3xl mx-auto w-full px-4">
        {questions.length > 0 && (
          <>
            <div className="text-2xl font-bold mb-8 text-center">
              {questions[currentQuestion].prompt}
            </div>
            {/* Show correct answer when wrong */}
            {showAnswer && (
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-blue-800 font-medium">Đáp án đúng:</p>
                <p className="text-blue-600 text-lg">
                  {questions[currentQuestion].answer}
                </p>
              </div>
            )}
            {/* Question Image */}
            {questionImage && (
              <div className="mb-8 flex justify-center">
                <img
                  src={questionImage}
                  alt="Question"
                  className="max-h-64 rounded-lg object-contain"
                />
              </div>
            )}

            {level.includes("Luyện nghe") &&
              questions[currentQuestion].fileId && (
                <div className="mb-8 flex justify-center">
                  <div className="audio-player bg-blue-500 rounded-xl p-4 flex items-center gap-4 text-white">
                    <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                      <Headphones className="w-6 h-6 text-white" />
                    </div>
                    <audio
                      controls
                      className="hidden"
                      src={
                        questions[currentQuestion].bucketId &&
                        questions[currentQuestion].fileId
                          ? storage
                              .getFileView(
                                questions[currentQuestion].bucketId,
                                questions[currentQuestion].fileId
                              )
                              .toString()
                          : ""
                      }
                      id="questionAudio"
                      preload="auto" // Thêm preload để load sẵn audio
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault(); // Ngăn event bubbling
                        const audio = document.getElementById(
                          "questionAudio"
                        ) as HTMLAudioElement;
                        if (audio) {
                          audio
                            .play()
                            .catch((err) =>
                              console.error("Lỗi phát audio:", err)
                            );
                        }
                      }}
                      className="text-lg font-medium px-4 py-2 hover:bg-blue-600 rounded-lg transition-colors"
                    >
                      Nghe câu hỏi
                    </button>
                  </div>
                </div>
              )}
            {questions[currentQuestion].type === "select" && (
              <div className="grid grid-cols-1 gap-4">
                {questions[currentQuestion].options?.map((option) => (
                  <button
                    key={option}
                    onClick={() => setSelected(option)}
                    className={`p-4 text-lg rounded-xl border-2 transition-all
                      ${
                        selected === option
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <Circle
                        className={`w-5 h-5 ${
                          selected === option
                            ? "text-blue-500"
                            : "text-gray-400"
                        }`}
                        fill={selected === option ? "currentColor" : "none"}
                      />
                      {option}
                    </div>
                  </button>
                ))}
              </div>
            )}
            {questions[currentQuestion].type === "translate" && (
              <input
                type="text"
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
                className="w-full p-4 text-lg border-2 rounded-xl focus:border-blue-500 outline-none"
                placeholder="Nhập câu trả lời của bạn..."
              />
            )}
          </>
        )}
      </div>

      {/* Button Area */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t">
        <div className="max-w-3xl mx-auto">
          {showContinueButton ? (
            <button
              onClick={handleContinue}
              className="w-full p-4 rounded-xl text-white text-xl font-bold bg-blue-500 hover:bg-blue-600"
            >
              Tiếp tục
            </button>
          ) : (
            <button
              onClick={handleAnswer}
              disabled={!selected || showFeedback}
              className={`w-full p-4 rounded-xl text-white text-xl font-bold transition-all
                ${
                  !selected ? "bg-gray-300" : "bg-green-500 hover:bg-green-600"
                }`}
            >
              Kiểm tra
            </button>
          )}
        </div>
      </div>

      {/* Feedback Overlay */}
      {showFeedback && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div
            className={`text-4xl font-bold p-8 rounded-2xl ${
              isCorrect ? "bg-green-500 text-white" : "bg-red-500 text-white"
            }`}
          >
            {isCorrect ? "Chính xác! 🎉" : "Đáp án sai  😢"}
          </div>
        </div>
      )}
    </div>
  );
};

export default LessonExercise;
