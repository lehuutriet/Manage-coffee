import { useState, useEffect } from "react";
import { useAuth } from "../contexts/auth/authProvider";
import { ID, Query } from "appwrite";
import {
  Loader2,
  Check,
  X,
  BookOpen,
  Award,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { toast } from "react-hot-toast";

interface Question {
  id: string;
  exerciseId: string;
  image: string;
  prompt: string;
  options: string[];
  answer: string;
  prefix: string;
  suffix: string;
  word: string;
  toneOptions: string[];
}

interface Exercise {
  id: string;
  type: "wordCompletion" | "wordSelection" | "toneMarking" | "wordWriting";
  title: string;
  content: string[];
  questions: Question[];
  grade: number;
  level: "beginner" | "intermediate" | "advanced";
}
interface HistoryItem {
  id: string;
  userId: string;
  exerciseTitle: string;
  score: number;
  totalQuestions: number;
  completedAt: string; // ISO date string
}
const VietnameseExercises = () => {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<{ [key: string]: string }>({});
  const [isChecking, setIsChecking] = useState(false);
  const [result, setResult] = useState<"correct" | "incorrect" | null>(null);
  const [loading, setLoading] = useState(true);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const { databases, storage, account } = useAuth();
  const DATABASE_ID = "674e5e7a0008e19d0ef0";
  const EXERCISES_COLLECTION_ID = "vietnamese_exercises_collection";
  const QUESTIONS_COLLECTION_ID = "vietnamese_questions_collection";
  const HISTORY_COLLECTION_ID = "user_exercises_history";
  const BUCKET_ID = "vietnamese_exercises_bucket";
  const [history, setHistory] = useState<HistoryItem[]>([]);
  // Thêm state mới
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [fullHistory, setFullHistory] = useState<HistoryItem[]>([]);

  // Thêm hàm để lấy lịch sử đầy đủ
  const fetchFullHistory = async () => {
    try {
      const user = await account.get();

      const response = await databases.listDocuments(
        DATABASE_ID,
        HISTORY_COLLECTION_ID,
        [
          Query.equal("userId", [user.$id]),
          Query.orderDesc("completedAt"),
          Query.limit(100), // Lấy nhiều hơn, hoặc bỏ giới hạn tùy nhu cầu
        ]
      );

      setFullHistory(
        response.documents.map((doc) => ({
          id: doc.$id,
          userId: doc.userId,
          exerciseTitle: doc.exerciseTitle,
          score: doc.score,
          totalQuestions: doc.totalQuestions,
          completedAt: doc.completedAt,
        }))
      );

      setShowHistoryModal(true);
    } catch (error) {
      console.error("Error fetching full history:", error);
      toast.error("Không thể tải lịch sử đầy đủ");
    }
  };

  // Thêm modal hiển thị lịch sử
  const HistoryModal = () => (
    <div className="fixed inset-0 bg-gray-800/75 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="p-6 border-b flex justify-between items-center">
          <h3 className="text-xl font-bold">Lịch sử làm bài tập</h3>
          <button
            onClick={() => setShowHistoryModal(false)}
            className="p-2 rounded-full hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {fullHistory.length > 0 ? (
            <div className="divide-y">
              {fullHistory.map((item) => (
                <div key={item.id} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-medium text-lg text-gray-900">
                      {item.exerciseTitle}
                    </h4>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        item.score / item.totalQuestions >= 0.7
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {item.score}/{item.totalQuestions}(
                      {Math.round((item.score / item.totalQuestions) * 100)}%)
                    </span>
                  </div>
                  <div className="text-gray-500 text-sm">
                    {new Date(item.completedAt).toLocaleString("vi-VN", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-8 h-8 text-blue-600" />
              </div>
              <h4 className="text-lg font-medium text-gray-800 mb-2">
                Chưa có lịch sử làm bài
              </h4>
              <p className="text-gray-600">
                Hãy hoàn thành một bài tập để xem lịch sử tại đây
              </p>
            </div>
          )}
        </div>

        <div className="p-6 border-t bg-gray-50">
          <button
            onClick={() => setShowHistoryModal(false)}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
  // Thêm hàm saveHistory
  const saveHistory = async (
    exerciseTitle: string,
    correctAnswers: number,
    totalQuestions: number
  ) => {
    try {
      const user = await account.get();

      // Tạo dữ liệu lịch sử mới
      const historyData = {
        userId: user.$id,
        exerciseTitle: exerciseTitle,
        score: correctAnswers,
        totalQuestions: totalQuestions,
        completedAt: new Date().toISOString(),
      };

      // Lưu vào database
      await databases.createDocument(
        DATABASE_ID,
        HISTORY_COLLECTION_ID,
        ID.unique(), // Tạo ID ngẫu nhiên cho document mới
        historyData
      );

      // Cập nhật state history để hiển thị ngay lập tức
      setHistory((prevHistory) => [
        {
          id: "temp-" + Date.now(), // ID tạm thời, sẽ được thay thế khi reload
          ...historyData,
        },
        ...prevHistory,
      ]);

      toast.success("Đã lưu kết quả vào lịch sử!");
    } catch (error) {
      console.error("Error saving history:", error);
      toast.error("Không thể lưu lịch sử bài tập");
    }
  };

  const fetchUserHistory = async () => {
    try {
      const user = await account.get(); // Giả sử bạn đã có account từ useAuth

      const response = await databases.listDocuments(
        DATABASE_ID,
        HISTORY_COLLECTION_ID, // Collection ID cho lịch sử bài tập
        [
          Query.equal("userId", [user.$id]),
          Query.orderDesc("completedAt"),
          Query.limit(5),
        ]
      );

      setHistory(
        response.documents.map((doc) => ({
          id: doc.$id,
          userId: doc.userId,
          exerciseTitle: doc.exerciseTitle,
          score: doc.score,
          totalQuestions: doc.totalQuestions,
          completedAt: doc.completedAt,
        }))
      );
    } catch (error) {
      console.error("Error fetching user history:", error);
    }
  };

  useEffect(() => {
    fetchExercises();
    fetchUserHistory();
  }, []);

  // Thêm useEffect để theo dõi khi isCompleted thay đổi
  useEffect(() => {
    if (isCompleted) {
      // Lưu kết quả tổng của tất cả bài tập
      saveHistory("Toàn bộ bài tập", score.correct, score.total);
    }
  }, [isCompleted, score]);

  const fetchExercises = async () => {
    try {
      setLoading(true);
      const response = await databases.listDocuments(
        DATABASE_ID,
        EXERCISES_COLLECTION_ID
      );

      const exercisesData = await Promise.all(
        response.documents.map(async (doc) => {
          // Lấy thông tin chi tiết câu hỏi từ collection riêng
          const questionsResponse = await databases.listDocuments(
            DATABASE_ID,
            QUESTIONS_COLLECTION_ID,
            [Query.equal("exerciseId", doc.$id)]
          );

          return {
            id: doc.$id,
            type: doc.type,
            title: doc.title,
            content: doc.content || [],
            questions: questionsResponse.documents.map((q) => ({
              id: q.$id,
              exerciseId: q.exerciseId || "",
              image: q.image || "",
              prompt: q.prompt || "",
              options: q.options || [],
              answer: q.answer || "",
              prefix: q.prefix || "",
              suffix: q.suffix || "",
              word: q.word || "",
              toneOptions: q.toneOptions || [],
            })),
            grade: doc.grade,
            level: doc.level,
          };
        })
      );

      setExercises(exercisesData);
    } catch (error) {
      console.error("Error fetching exercises:", error);
      toast.error("Không thể tải danh sách bài tập");
    } finally {
      setLoading(false);
    }
  };

  const getCurrentExercise = (): Exercise | undefined => {
    return exercises.length > 0 ? exercises[currentExerciseIndex] : undefined;
  };

  const getCurrentQuestion = (): Question | undefined => {
    const exercise = getCurrentExercise();
    return exercise?.questions.length &&
      exercise.questions.length > currentQuestionIndex
      ? exercise.questions[currentQuestionIndex]
      : undefined;
  };

  const handleAnswer = (answer: string) => {
    const question = getCurrentQuestion();
    if (!question) return;

    setUserAnswers((prev) => ({
      ...prev,
      [question.id]: answer,
    }));
  };

  const shuffleExercises = () => {
    setExercises((prevExercises) => {
      return prevExercises.map((exercise) => {
        const shuffledQuestions = [...exercise.questions].sort(
          () => Math.random() - 0.5
        );
        return {
          ...exercise,
          questions: shuffledQuestions,
        };
      });
    });

    // Reset các state
    setCurrentExerciseIndex(0);
    setCurrentQuestionIndex(0);
    setUserAnswers({});
    setResult(null);
    setShowFeedback(false);
    setIsCompleted(false);
    setScore({ correct: 0, total: 0 });

    toast.success("Bài tập đã được làm mới!");
  };

  const checkAnswer = async () => {
    const question = getCurrentQuestion();
    if (!question) return;

    const userAnswer = userAnswers[question.id];
    if (!userAnswer) {
      toast.error("Vui lòng chọn hoặc nhập câu trả lời");
      return;
    }

    setIsChecking(true);

    // Kiểm tra đáp án
    const isCorrect =
      userAnswer.trim().toLowerCase() === question.answer.trim().toLowerCase();
    setResult(isCorrect ? "correct" : "incorrect");
    setShowFeedback(true);

    // Cập nhật điểm số
    setScore((prev) => ({
      ...prev,
      correct: isCorrect ? prev.correct + 1 : prev.correct,
      total: prev.total + 1,
    }));

    // Hiển thị kết quả trong 1.5 giây
    setTimeout(async () => {
      setIsChecking(false);
      setResult(null);
      setShowFeedback(false);

      // Nếu đây là câu hỏi cuối cùng của bài tập hiện tại
      const currentExercise = getCurrentExercise();
      if (
        currentExercise &&
        currentQuestionIndex === currentExercise.questions.length - 1
      ) {
        // Lưu lịch sử khi hoàn thành bài tập
        await saveHistory(
          currentExercise.title,
          score.correct,
          currentExercise.questions.length
        );

        // Nếu đây là bài tập cuối cùng
        if (currentExerciseIndex === exercises.length - 1) {
          // Đánh dấu là đã hoàn thành
          setIsCompleted(true);
          toast.success("Chúc mừng! Bạn đã hoàn thành tất cả bài tập!");
        } else {
          // Chuyển sang bài tập tiếp theo
          setCurrentExerciseIndex(currentExerciseIndex + 1);
          setCurrentQuestionIndex(0);
        }
      } else {
        // Chuyển đến câu hỏi tiếp theo
        setCurrentQuestionIndex(currentQuestionIndex + 1);
      }
    }, 1500);
  };

  const getLevelLabel = (level: string) => {
    switch (level) {
      case "beginner":
        return "Cơ bản";
      case "intermediate":
        return "Trung cấp";
      case "advanced":
        return "Nâng cao";
      default:
        return level;
    }
  };

  const getExerciseTypeLabel = (type: string) => {
    switch (type) {
      case "wordCompletion":
        return "Điền từ";
      case "wordSelection":
        return "Chọn từ";
      case "toneMarking":
        return "Đánh dấu thanh điệu";
      case "wordWriting":
        return "Viết từ";
      default:
        return type;
    }
  };

  const renderExercise = () => {
    const exercise = getCurrentExercise();
    const question = getCurrentQuestion();

    if (isCompleted) {
      return (
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-green-600 to-teal-600 text-white p-8">
            <div className="flex flex-col items-center justify-center">
              <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center mb-4">
                <Award className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-3xl font-bold mb-2">Bài tập hoàn thành!</h2>
              <p className="text-white/80 text-center max-w-md">
                Chúc mừng! Bạn đã hoàn thành tất cả bài tập. Hãy thử làm lại để
                củng cố kiến thức.
              </p>
            </div>
          </div>

          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-blue-50 rounded-xl p-5 flex items-center justify-center flex-col">
                <p className="text-sm text-gray-500 mb-1">Tổng số câu</p>
                <p className="text-3xl font-bold text-blue-700">
                  {score.total}
                </p>
              </div>

              <div className="bg-green-50 rounded-xl p-5 flex items-center justify-center flex-col">
                <p className="text-sm text-gray-500 mb-1">Số câu đúng</p>
                <p className="text-3xl font-bold text-green-700">
                  {score.correct}
                </p>
              </div>

              <div className="bg-purple-50 rounded-xl p-5 flex items-center justify-center flex-col">
                <p className="text-sm text-gray-500 mb-1">Tỉ lệ đúng</p>
                <p className="text-3xl font-bold text-purple-700">
                  {score.total > 0
                    ? Math.round((score.correct / score.total) * 100)
                    : 0}
                  %
                </p>
              </div>
            </div>

            <button
              onClick={shuffleExercises}
              className="w-full py-4 bg-blue-600 text-white rounded-xl font-medium shadow-md hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-5 h-5" />
              Làm lại bài tập
            </button>
          </div>
        </div>
      );
    }

    if (!exercise || !question) {
      return (
        <div className="text-center p-8 bg-white rounded-xl shadow-lg">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <BookOpen className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">
            Chưa có bài tập
          </h3>
          <p className="text-gray-600">
            Không có bài tập nào hoặc đã hoàn thành tất cả bài tập.
          </p>
        </div>
      );
    }

    // Kiểm tra xem đây có phải là câu hỏi cuối cùng của bài tập cuối cùng không
    const isLastQuestion =
      currentQuestionIndex === exercise.questions.length - 1 &&
      currentExerciseIndex === exercises.length - 1;

    return (
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="px-3 py-1 text-xs font-medium bg-white/20 rounded-full">
              {getLevelLabel(exercise.level)} • Lớp {exercise.grade}
            </span>
            <span className="px-3 py-1 text-xs font-medium bg-white/20 rounded-full">
              {getExerciseTypeLabel(exercise.type)}
            </span>
          </div>
          <h2 className="text-2xl font-bold">{exercise.title}</h2>
        </div>

        {/* Progress bar */}
        <div className="w-full h-2 bg-gray-100">
          <div
            className="h-full bg-green-500 transition-all duration-300"
            style={{
              width: `${
                ((currentQuestionIndex + 1) / exercise.questions.length) * 100
              }%`,
            }}
          />
        </div>

        {/* Question area */}
        <div className="p-8">
          {/* Hiển thị hình ảnh nếu có */}
          {question.image && (
            <div className="flex justify-center mb-8">
              <div className="relative rounded-xl overflow-hidden shadow-lg border border-gray-100 bg-gray-50">
                <img
                  src={storage
                    .getFileView(BUCKET_ID, question.image)
                    .toString()}
                  alt="Illustration"
                  className="max-h-64 object-contain"
                  onError={(e) => {
                    e.currentTarget.src =
                      "https://via.placeholder.com/300x200?text=Không+tải+được+hình";
                  }}
                />
              </div>
            </div>
          )}

          {/* Hiển thị câu hỏi dựa trên type */}
          {exercise.type === "wordCompletion" && (
            <div className="bg-blue-50 p-6 rounded-xl mb-8">
              <div className="text-center text-2xl">
                <div className="inline-flex items-center">
                  <span className="text-gray-800">{question.prefix}</span>
                  <input
                    type="text"
                    className="w-32 mx-3 px-2 py-1 text-center bg-white border-b-4 border-blue-500 focus:outline-none focus:border-purple-500 transition-colors rounded-md"
                    value={userAnswers[question.id] || ""}
                    onChange={(e) => handleAnswer(e.target.value)}
                    placeholder="điền từ"
                  />
                  <span className="text-gray-800">{question.suffix}</span>
                </div>
              </div>
            </div>
          )}

          {exercise.type === "wordSelection" && (
            <div className="space-y-6">
              <div className="bg-blue-50 p-4 rounded-xl">
                <p className="text-lg font-medium text-gray-800">
                  {question.prompt || "Chọn từ phù hợp với hình ảnh:"}
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {question.options.map((option, idx) => (
                  <button
                    key={idx}
                    className={`py-4 px-6 rounded-xl font-medium text-lg transition-all transform hover:scale-105
                      ${
                        userAnswers[question.id] === option
                          ? "bg-blue-600 text-white shadow-lg"
                          : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                      }`}
                    onClick={() => handleAnswer(option)}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          )}

          {exercise.type === "toneMarking" && (
            <div className="space-y-6">
              <div className="bg-blue-50 p-4 rounded-xl">
                <p className="text-lg font-medium text-gray-800 text-center">
                  Đánh dấu thanh điệu cho từ:
                </p>
              </div>
              <div className="text-center py-6">
                <span className="text-4xl font-medium text-gray-900">
                  {question.word}
                </span>
              </div>
              <div className="flex flex-wrap justify-center gap-4">
                {question.toneOptions.map((tone, idx) => (
                  <button
                    key={idx}
                    className={`w-16 h-16 flex items-center justify-center rounded-full text-xl font-medium transition-all transform hover:scale-110
                      ${
                        userAnswers[question.id] === tone
                          ? "bg-blue-600 text-white shadow-lg"
                          : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                      }`}
                    onClick={() => handleAnswer(tone)}
                  >
                    {tone || "Không dấu"}
                  </button>
                ))}
              </div>
            </div>
          )}

          {exercise.type === "wordWriting" && (
            <div className="space-y-6">
              <div className="bg-blue-50 p-4 rounded-xl">
                <p className="text-lg font-medium text-gray-800">
                  {question.prompt || "Viết từ thích hợp cho hình ảnh:"}
                </p>
              </div>
              <div className="mt-4">
                <input
                  type="text"
                  className="w-full p-4 border-2 border-gray-200 rounded-xl text-lg focus:border-blue-500 focus:outline-none transition-colors"
                  value={userAnswers[question.id] || ""}
                  onChange={(e) => handleAnswer(e.target.value)}
                  placeholder="Nhập câu trả lời của bạn..."
                />
              </div>
            </div>
          )}

          {/* Feedback area */}
          {showFeedback && (
            <div
              className={`mt-8 flex items-center justify-center p-6 rounded-xl transition-all ${
                result === "correct" ? "bg-green-100" : "bg-red-100"
              }`}
            >
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center mr-4 ${
                  result === "correct" ? "bg-green-500" : "bg-red-500"
                }`}
              >
                {result === "correct" ? (
                  <Check className="w-6 h-6 text-white" />
                ) : (
                  <X className="w-6 h-6 text-white" />
                )}
              </div>
              <div>
                <h3
                  className={`text-lg font-bold ${
                    result === "correct" ? "text-green-800" : "text-red-800"
                  }`}
                >
                  {result === "correct" ? "Tuyệt vời!" : "Chưa đúng rồi!"}
                </h3>
                <p
                  className={`${
                    result === "correct" ? "text-green-700" : "text-red-700"
                  }`}
                >
                  {result === "correct"
                    ? "Câu trả lời của bạn hoàn toàn chính xác."
                    : `Đáp án đúng là: ${getCurrentQuestion()?.answer}`}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-6 border-t border-gray-100 flex justify-between items-center bg-gray-50">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-blue-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-gray-500">Câu hỏi</p>
              <p className="font-medium">
                {currentQuestionIndex + 1}/{exercise.questions.length}
              </p>
            </div>
          </div>

          <button
            onClick={checkAnswer}
            disabled={isChecking || !userAnswers[question.id]}
            className={`px-8 py-3 rounded-xl font-medium flex items-center gap-2 transition-all transform hover:scale-105
              ${
                isChecking || !userAnswers[question.id]
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-blue-600 text-white shadow-md hover:bg-blue-700"
              }`}
          >
            {isChecking ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <ChevronRight className="w-5 h-5" />
            )}
            {isChecking
              ? "Đang kiểm tra..."
              : isLastQuestion
              ? "Hoàn thành"
              : "Kiểm tra"}
          </button>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <div className="w-16 h-16 relative">
          <div className="absolute inset-0 rounded-full border-4 border-blue-200"></div>
          <div className="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"></div>
        </div>
        <p className="mt-4 text-lg text-gray-600">Đang tải bài tập...</p>
      </div>
    );
  }

  if (exercises.length === 0) {
    return (
      <div className="max-w-3xl mx-auto p-6 mt-12">
        <div className="text-center p-12 bg-white rounded-xl shadow-lg">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <BookOpen className="w-10 h-10 text-blue-600" />
          </div>
          <h3 className="text-2xl font-bold text-gray-800 mb-2">
            Chưa có bài tập
          </h3>
          <p className="text-gray-600 max-w-md mx-auto">
            Hiện tại chưa có bài tập nào được tạo. Vui lòng quay lại sau.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-purple-600 text-transparent bg-clip-text">
          Luyện tập tiếng Việt
        </h1>
        <p className="text-gray-600 mb-6">
          Hoàn thành các bài tập để nâng cao kỹ năng tiếng Việt
        </p>
      </div>

      {/* Main content with sidebar layout */}
      <div className="flex flex-col md:flex-row gap-6">
        {/* Left sidebar - Progress */}
        <div className="md:w-72 w-full">
          <div className="bg-white rounded-xl shadow-md overflow-hidden sticky top-24">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 text-white">
              <h2 className="font-medium">Tiến độ bài tập</h2>
            </div>
            <div className="p-4 space-y-4">
              <div className="bg-blue-50 rounded-xl p-4 flex items-center">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mr-4">
                  <Award className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Điểm số</p>
                  <p className="text-xl font-bold text-blue-700">
                    {score.correct}/{score.total}
                  </p>
                </div>
              </div>

              <div className="bg-purple-50 rounded-xl p-4 flex items-center">
                <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center mr-4">
                  <BookOpen className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Bài tập hiện tại</p>
                  <p className="text-xl font-bold text-purple-700">
                    {currentExerciseIndex + 1}/{exercises.length}
                  </p>
                </div>
              </div>

              <div className="bg-green-50 rounded-xl p-4 flex items-center">
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mr-4">
                  <Check className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Tỉ lệ đúng</p>
                  <p className="text-xl font-bold text-green-700">
                    {score.total > 0
                      ? Math.round((score.correct / score.total) * 100)
                      : 0}
                    %
                  </p>
                </div>
              </div>

              {/* Thay nút làm mới bài tập thành lịch sử làm bài */}
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 mr-1 text-blue-500"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Lịch sử làm bài
                </h3>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {history.length > 0 ? (
                    history.map((item) => (
                      <div
                        key={item.id}
                        className="p-2 bg-gray-50 rounded-lg border border-gray-100 text-xs"
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-medium text-gray-900">
                            {item.exerciseTitle}
                          </span>
                          <span className="text-green-600 font-medium">
                            {item.score}/{item.totalQuestions}
                          </span>
                        </div>
                        <div className="text-gray-500">
                          {new Date(item.completedAt).toLocaleString("vi-VN", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center p-3 text-gray-500 text-xs">
                      Chưa có lịch sử làm bài
                    </div>
                  )}
                </div>
                <button
                  className="w-full mt-3 py-2 text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg font-medium transition-colors"
                  onClick={fetchFullHistory} // Thêm event handler này
                >
                  Xem tất cả lịch sử
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main content - Exercise */}
        <div className="flex-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-96">
              <div className="w-16 h-16 relative">
                <div className="absolute inset-0 rounded-full border-4 border-blue-200"></div>
                <div className="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"></div>
              </div>
              <p className="mt-4 text-lg text-gray-600">Đang tải bài tập...</p>
            </div>
          ) : exercises.length === 0 ? (
            <div className="p-6">
              <div className="text-center p-12 bg-white rounded-xl shadow-lg">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <BookOpen className="w-10 h-10 text-blue-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">
                  Chưa có bài tập
                </h3>
                <p className="text-gray-600 max-w-md mx-auto">
                  Hiện tại chưa có bài tập nào được tạo. Vui lòng quay lại sau.
                </p>
              </div>
            </div>
          ) : (
            renderExercise()
          )}
        </div>
      </div>
      {showHistoryModal && <HistoryModal />}
    </div>
  );
};

export default VietnameseExercises;
