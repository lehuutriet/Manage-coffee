import { useState, useEffect } from "react";
import {
  Plus,
  Search,
  Trash2,
  AlertCircle,
  X,
  Clock,
  ChevronLeft,
  ChevronRight,
  Upload,
} from "lucide-react";
import { ID, Models, Query } from "appwrite";
import { useAuth } from "../contexts/auth/authProvider";
import ResultModal from "./ResultModal";
import Navigation from "../Navigation/Navigation";
import React from "react";
import EducationalFooter from "../EducationalFooter/EducationalFooter";

interface Question extends Models.Document {
  type: "select" | "translate";
  prompt: string;
  options?: string[];
  answer: string;
  category: string;
  createdBy: string;
  imageId?: string;
  bucketId?: string;
}

interface Exam {
  id: string;
  title: string;
  description: string;
  subject: string;
  grade: string;
  type: "multiple_choice" | "file_upload";
  questions?: Question[];
  duration: number;
  startTime: string;
  endTime: string;

  maxScore: number;
}
interface Question extends Models.Document {
  prompt: string;
  options?: string[];
  answer: string;

  category: string;
  createdBy: string;
  imageId?: string;
  bucketId?: string;
}

interface FormData {
  title: string;
  description: string;
  subject: string;
  grade: string;
  type: "multiple_choice" | "file_upload";
  duration: number;
  startTime: string;
  endTime: string;
  maxScore: number;
  prompt: string;
  answer: string;
  options: string[];
  imageFile?: File | undefined; // Thêm optional chaining
  imagePreview?: string | undefined; // Thêm optional chaining
  numberOfQuestions: number; // Thêm trường này
  currentQuestionIndex: number; // Thêm để theo dõi câu hỏi hiện tại
  questions: Question[]; // Mảng lưu các câu hỏi
}

interface ExamHistoryDocument extends Models.Document {
  examId: string;
  userId: string;
  submitTime: string;
  duration: number;
  score: number;
  totalScore: number;
  correctAnswers: number;
  totalQuestions: number;
  answers: string[]; // Lưu câu trả lời của user
  passed: boolean;
}
interface ExamInterfaceProps {
  exam: Exam;
  onClose: () => void;
  onSubmit: (answers: string[]) => void;
}

const ExamInterface: React.FC<ExamInterfaceProps> = ({
  exam,
  onClose,
  onSubmit,
}) => {
  const [hasStarted, setHasStarted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>(
    Array(exam.questions?.length || 0).fill("")
  );
  const [timeLeft, setTimeLeft] = useState(exam.duration * 60);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [examHistories, setExamHistories] = useState<ExamHistoryDocument[]>([]);
  const { account, databases, storage } = useAuth();
  const [showTimeUpModal, setShowTimeUpModal] = useState(false);
  const BUCKET_questionsImageforExam = "676e2b060006efae803e";
  const DATABASE_ID = "674e5e7a0008e19d0ef0";
  const exam_histories = "67724339003d8cfec955";
  const [showResult, setShowResult] = useState(false);
  const [examResult, setExamResult] = useState({
    score: 0,
    totalScore: 0,
    correctAnswers: 0,
    totalQuestions: 0,
    duration: 0,
  });
  const fetchExamHistory = async (examId: string) => {
    try {
      const { $id: currentUserId } = await account.get();
      const response = await databases.listDocuments(
        DATABASE_ID,
        exam_histories,
        [Query.equal("examId", examId), Query.equal("userId", currentUserId)]
      );
      setExamHistories(
        response.documents.map((doc) => ({
          $id: doc.$id,
          $createdAt: doc.$createdAt,
          $updatedAt: doc.$updatedAt,
          $permissions: doc.$permissions,
          $collectionId: doc.$collectionId,
          $databaseId: doc.$databaseId,
          examId: doc.examId,
          userId: doc.userId,
          submitTime: doc.submitTime,
          duration: doc.duration,
          score: doc.score,
          totalScore: doc.totalScore,
          correctAnswers: doc.correctAnswers,
          totalQuestions: doc.totalQuestions,
          answers: doc.answers,
          passed: doc.passed,
        }))
      );
    } catch (error) {
      console.error("Error fetching exam history:", error);
    }
  };

  useEffect(() => {
    if (exam && exam.id) {
      fetchExamHistory(exam.id);
    }
  }, [exam.id]);

  useEffect(() => {
    if (!hasStarted) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0) {
          clearInterval(timer);
          setShowTimeUpModal(true); // Hiện modal thông báo
          setTimeout(() => {
            handleSubmit(); // Tự động nộp bài sau 3 giây
          }, 3000);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [hasStarted]);

  const renderOption = (option: string, index: number) => {
    if (option && option.match(/^[a-zA-Z0-9]{20,}$/)) {
      try {
        return (
          <div className="flex flex-col space-y-2">
            <div className="flex items-center space-x-2">
              <input
                type="radio"
                name="answer"
                value={option}
                checked={selectedAnswers[currentQuestion] === option}
                onChange={() => {
                  const newAnswers = [...selectedAnswers];
                  newAnswers[currentQuestion] = option;
                  setSelectedAnswers(newAnswers);
                }}
                className="w-4 h-4 text-blue-600"
              />
              <label className="text-sm font-medium">Đáp án {index + 1}</label>
            </div>
            <div className="relative group">
              <img
                src={storage.getFileView(BUCKET_questionsImageforExam, option)}
                alt={`Đáp án ${index + 1}`}
                className="w-full h-[130px] object-contain rounded-lg cursor-pointer hover:scale-105 transition-transform"
                onClick={() => {
                  window.open(
                    storage.getFileView(BUCKET_questionsImageforExam, option),
                    "_blank"
                  );
                }}
                onError={(e) => {
                  console.error("Lỗi tải ảnh:", option);
                  e.currentTarget.src = "đường_dẫn_ảnh_mặc_định";
                }}
              />
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-200 rounded-lg"></div>
              <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-all duration-200">
                <button
                  onClick={() => {
                    window.open(
                      storage.getFileView(BUCKET_questionsImageforExam, option),
                      "_blank"
                    );
                  }}
                  className="px-3 py-1 bg-white rounded-full text-xs shadow-lg hover:bg-gray-100"
                >
                  Xem đầy đủ
                </button>
              </div>
            </div>
          </div>
        );
      } catch (error) {
        console.error("Lỗi render ảnh:", error);
        return option;
      }
    }
    return (
      <div className="flex items-center space-x-2">
        <input
          type="radio"
          name="answer"
          value={option}
          checked={selectedAnswers[currentQuestion] === option}
          onChange={() => {
            const newAnswers = [...selectedAnswers];
            newAnswers[currentQuestion] = option;
            setSelectedAnswers(newAnswers);
          }}
          className="w-4 h-4 text-blue-600"
        />
        <label className="text-sm font-medium">{option}</label>
      </div>
    );
  };
  const resetExam = () => {
    setCurrentQuestion(0);
    setSelectedAnswers(Array(exam.questions?.length || 0).fill(""));
    setTimeLeft(exam.duration * 60);
    setHasStarted(true);
    setShowResult(false);
    setShowConfirmSubmit(false); // Thêm dòng này để reset modal nộp bài
  };
  const calculateScore = (
    selectedAnswers: string[],
    questions: Question[]
  ): number => {
    let correctAnswers = 0;
    questions.forEach((question, index) => {
      if (selectedAnswers[index] === question.answer) {
        correctAnswers++;
      }
    });
    // Tính điểm dựa trên tỷ lệ số câu đúng và maxScore
    return Math.round((correctAnswers / questions.length) * exam.maxScore);
  };

  const countCorrectAnswers = (
    selectedAnswers: string[],
    questions: Question[]
  ): number => {
    return selectedAnswers.filter(
      (answer, index) => answer === questions[index].answer
    ).length;
  };

  const calculatePassed = (score: number, totalQuestions: number): boolean => {
    const passPercentage = 0.7;
    return score / totalQuestions >= passPercentage;
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const { $id: userId } = await account.get();

      const score = calculateScore(selectedAnswers, exam.questions || []);
      const correctAnswers = countCorrectAnswers(
        selectedAnswers,
        exam.questions || []
      );
      const passed = calculatePassed(score, exam.questions?.length || 0);
      const timeSpent = exam.duration - Math.floor(timeLeft / 60);

      const historyData = {
        examId: exam.id,
        userId,
        submitTime: new Date().toISOString(),
        duration: timeSpent,
        score,
        totalScore: exam.maxScore,
        correctAnswers,
        totalQuestions: exam.questions?.length || 0,
        answers: selectedAnswers,
        passed,
      };

      await databases.createDocument(
        DATABASE_ID,
        exam_histories,
        ID.unique(),
        historyData
      );

      // Cập nhật state để hiển thị ResultModal
      setExamResult({
        score,
        totalScore: exam.maxScore,
        correctAnswers,
        totalQuestions: exam.questions?.length || 0,
        duration: timeSpent,
      });
      setShowResult(true);

      await onSubmit(selectedAnswers);
    } catch (error) {
      console.error("Error submitting exam:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!exam.questions || exam.questions.length === 0) {
    return (
      <div className="text-center p-8">
        <p>Không có câu hỏi nào trong đề thi này</p>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg mt-4"
        >
          Quay lại
        </button>
      </div>
    );
  }

  if (!hasStarted) {
    return (
      <div className="max-w-2xl mx-auto mt-20 p-8 bg-white rounded-xl shadow-lg">
        <h2 className="text-2xl font-bold mb-4">{exam.title}</h2>

        <div className="space-y-4 mb-8">
          <div className="flex items-center gap-2 text-gray-600">
            <Clock className="w-5 h-5" />
            <span>Thời gian làm bài: {exam.duration} phút</span>
          </div>

          <p>
            <strong>Số câu hỏi:</strong> {exam.questions?.length || 0} câu
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-blue-800 font-medium">
              Lưu ý: Thời gian sẽ bắt đầu tính khi bạn nhấn "Bắt đầu làm bài"
            </p>
          </div>

          <div className="mt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-3">
              Lịch sử làm bài
            </h3>
            {examHistories.length > 0 ? (
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {examHistories.map((history, index) => (
                  <div
                    key={index}
                    className="bg-white p-4 rounded-lg border border-gray-200"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm text-gray-600">
                          Thời gian nộp:{" "}
                          {new Date(history.submitTime).toLocaleString("vi-VN")}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          Thời gian làm: {history.duration} phút
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">
                          Điểm: {history.score}/{history.totalScore}
                        </p>
                        <p className="text-sm text-gray-600">
                          Số câu đúng: {history.correctAnswers}/
                          {history.totalQuestions}
                        </p>
                        <span
                          className={`inline-block px-2 py-1 rounded text-xs mt-1 ${
                            history.passed
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {history.passed ? "Đạt" : "Chưa đạt"}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm italic">
                Chưa có lần làm bài nào
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-4">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            Quay lại
          </button>
          <button
            onClick={() => setHasStarted(true)}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Bắt đầu làm bài
          </button>
        </div>
      </div>
    );
  }

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="fixed inset-0 bg-gray-50">
      {/* Header cố định */}
      <div className="fixed top-0 left-0 right-0 bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button
              onClick={onClose}
              className="hover:bg-gray-100 p-2 rounded-full transition-colors"
            >
              <ChevronLeft className="w-6 h-6 text-gray-600" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-800">{exam.title}</h1>
              <div className="flex items-center gap-3 mt-1">
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                  Lớp {exam.grade}
                </span>
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                  Môn {exam.subject}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-8">
            {/* Đồng hồ đếm ngược */}
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-yellow-500" />
              <div className="bg-yellow-500 text-white px-5 py-2 rounded-lg font-mono text-lg">
                {String(minutes).padStart(2, "0")}:
                {String(seconds).padStart(2, "0")}
              </div>
            </div>

            {/* Tiến độ làm bài */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full border-4 border-gray-200 overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-300"
                  style={{
                    width: `${
                      (selectedAnswers.filter(Boolean).length /
                        exam.questions.length) *
                      100
                    }%`,
                  }}
                />
              </div>
              <span className="text-sm font-semibold text-gray-700">
                {selectedAnswers.filter(Boolean).length}/{exam.questions.length}{" "}
                câu
              </span>
            </div>
          </div>
        </div>
      </div>
      {showTimeUpModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-8 max-w-md w-full mx-4">
            <div className="text-center">
              <h3 className="text-2xl font-bold text-red-600 mb-4">
                Đã hết thời gian làm bài!
              </h3>
              <p className="text-gray-600 mb-4">
                Bài làm của bạn sẽ được tự động nộp sau 3 giây...
              </p>
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
            </div>
          </div>
        </div>
      )}
      {/* Khu vực nội dung chính */}
      <div className="mt-24 max-w-5xl mx-auto px-6 py-8">
        {/* Phần câu hỏi */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
          <div className="flex items-center gap-4 mb-6">
            <span className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold">
              Câu {currentQuestion + 1}
            </span>
            <div className="h-1 flex-1 bg-gray-200 rounded-full">
              <div
                className="h-full bg-blue-600 rounded-full transition-all duration-300"
                style={{
                  width: `${
                    ((currentQuestion + 1) / exam.questions.length) * 100
                  }%`,
                }}
              />
            </div>
            <span className="text-gray-500 font-medium">
              {exam.questions.length} câu
            </span>
          </div>

          <p className="text-2xl font-medium text-gray-800 leading-relaxed p-6 bg-blue-50 rounded-lg border-l-4 border-blue-500 shadow-sm hover:shadow-md transition-all duration-200">
            {exam.questions[currentQuestion].prompt}
          </p>
        </div>

        {/* Phần trả lời */}
        {exam.type === "file_upload" ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <textarea
              value={selectedAnswers[currentQuestion]}
              onChange={(e) => {
                const newAnswers = [...selectedAnswers];
                newAnswers[currentQuestion] = e.target.value;
                setSelectedAnswers(newAnswers);
              }}
              rows={8}
              className="w-full p-4 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
              placeholder="Nhập câu trả lời của bạn..."
            />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-6">
            {exam.questions[currentQuestion].options?.map((option, idx) => (
              <button
                key={idx}
                onClick={() => {
                  const newAnswers = [...selectedAnswers];
                  newAnswers[currentQuestion] = option;
                  setSelectedAnswers(newAnswers);
                }}
                className={`p-8 rounded-xl border-2 transition-all duration-200 hover:shadow-md
                  ${
                    selectedAnswers[currentQuestion] === option
                      ? "border-blue-500 bg-blue-50 shadow-sm"
                      : "border-gray-200 hover:border-gray-300 bg-white"
                  }`}
              >
                {renderOption(option, idx)}
              </button>
            ))}
          </div>
        )}

        {/* Thanh điều hướng câu hỏi */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              {/* Container cho phân trang và điều hướng */}
              <div className="flex-1 flex items-center justify-center gap-4">
                {/* Nút điều hướng trái */}
                <button
                  onClick={() =>
                    setCurrentQuestion((prev) => Math.max(0, prev - 1))
                  }
                  disabled={currentQuestion === 0}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:hover:bg-transparent"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>

                {/* Phân trang - đã được căn giữa */}
                <div className="flex items-center">
                  <div className="hidden md:flex flex-wrap justify-center gap-2">
                    {exam.questions.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentQuestion(idx)}
                        className={`w-10 h-10 rounded-lg text-sm font-medium transition-all duration-200
                  ${
                    selectedAnswers[idx]
                      ? "bg-blue-500 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }
                  ${
                    currentQuestion === idx
                      ? "ring-2 ring-blue-500 ring-offset-2"
                      : ""
                  }
                `}
                      >
                        {idx + 1}
                      </button>
                    ))}
                  </div>
                  <div className="flex md:hidden items-center gap-2 text-sm text-gray-600">
                    <span>
                      Câu {currentQuestion + 1}/{exam.questions.length}
                    </span>
                  </div>
                </div>

                {/* Nút điều hướng phải */}
                <button
                  onClick={() =>
                    setCurrentQuestion((prev) =>
                      Math.min((exam.questions?.length || 0) - 1, prev + 1)
                    )
                  }
                  disabled={currentQuestion === exam.questions.length - 1}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:hover:bg-transparent"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </div>

              {/* Nút nộp bài */}
              <button
                onClick={() => setShowConfirmSubmit(true)}
                className="px-6 py-2.5 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors shadow-sm"
              >
                Nộp bài
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal xác nhận nộp bài */}
      {showConfirmSubmit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-xl p-8 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-gray-800 mb-4">
              Xác nhận nộp bài
            </h3>
            <p className="text-gray-600 mb-8 text-lg">
              Bạn đã trả lời {selectedAnswers.filter(Boolean).length}/
              {exam.questions.length} câu hỏi. Bạn có chắc chắn muốn nộp bài?
            </p>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setShowConfirmSubmit(false)}
                className="px-6 py-3 text-gray-700 bg-gray-100 rounded-lg font-medium hover:bg-gray-200"
              >
                Tiếp tục làm bài
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-6 py-3 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 disabled:opacity-70"
              >
                {isSubmitting ? "Đang nộp..." : "Xác nhận nộp bài"}
              </button>
            </div>
          </div>
        </div>
      )}
      <ResultModal
        isOpen={showResult}
        onClose={() => {
          setShowResult(false);
          onClose();
        }}
        score={examResult.score}
        totalScore={examResult.totalScore}
        correctAnswers={examResult.correctAnswers}
        totalQuestions={examResult.totalQuestions}
        questions={exam.questions || []}
        userAnswers={selectedAnswers}
        duration={examResult.duration}
        onRetry={resetExam}
      />
    </div>
  );
};
const ExamManagement: React.FC = () => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isExamMode, setIsExamMode] = useState(false);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading] = useState(false);
  const { databases, account, storage } = useAuth();

  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    title: "",
    description: "",
    subject: "",
    grade: "",
    type: "multiple_choice" as const,
    duration: 60,
    startTime: "",
    endTime: "",
    maxScore: 10,
    prompt: "",
    answer: "",
    options: ["", "", "", ""],
    imageFile: undefined,
    imagePreview: undefined,
    numberOfQuestions: 1, // Thêm giá trị mặc định
    currentQuestionIndex: 0, // Thêm giá trị mặc định
    questions: [], // Thêm mảng rỗng cho questions
  });

  const DATABASE_ID = "674e5e7a0008e19d0ef0";
  const EXAMS_COLLECTION_ID = "676e1f7300177eef75be";
  const BUCKET_questionsImageforExam = "676e2b060006efae803e";
  const QUESTIONS_COLLECTION_ID = "676e2bbc000befb2f52d";
  const exam_histories = "67724339003d8cfec955";
  const [userRole, setUserRole] = useState<string>("");
  // Thêm state quản lý preview ảnh
  const [optionPreviews, setOptionPreviews] = useState<string[]>([]);
  const [filters, setFilters] = useState({
    grade: "",
    subject: "",
  });
  const [educationLevel, setEducationLevel] = useState<EducationLevelType | "">(
    ""
  );
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{
    show: boolean;
    examId: string | null;
  }>({
    show: false,
    examId: null,
  });
  type EducationLevelType = "Tiểu học" | "THCS" | "THPT";

  // Object map cấp học với danh sách lớp
  const gradesByLevel: Record<EducationLevelType, number[]> = {
    "Tiểu học": [1, 2, 3, 4, 5],
    THCS: [6, 7, 8, 9],
    THPT: [10, 11, 12],
  };

  // Object map cấp học với danh sách môn
  const subjectsByLevel: Record<EducationLevelType, string[]> = {
    "Tiểu học": ["Tiếng Việt", "Toán", "Tự nhiên và Xã hội"],
    THCS: ["Toán", "Văn", "Anh", "Lý", "Hóa", "Sinh", "Sử", "Địa"],
    THPT: ["Toán", "Văn", "Anh", "Lý", "Hóa", "Sinh", "Sử", "Địa", "GDCD"],
  };
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const user = await account.get();
        setUserRole(user.labels?.[0] || "");
      } catch (error) {
        console.error("Error getting current user:", error);
      }
    };
    getCurrentUser();
  }, []);
  const isStaffMember = () => {
    return ["Admin", "Teacher"].includes(userRole);
  };
  // Xử lý khi thay đổi cấp học
  const handleEducationLevelChange = (level: any) => {
    setEducationLevel(level);
    // Reset filters khi đổi cấp
    setFilters({
      grade: "",
      subject: "",
    });
  };
  // Handler upload ảnh cho option
  const handleOptionImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    index: number
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        // Kiểm tra kích thước và loại file
        if (file.size > 5 * 1024 * 1024) {
          setError("Kích thước ảnh không được vượt quá 5MB");
          return;
        }

        if (!file.type.startsWith("image/")) {
          setError("Vui lòng chọn file ảnh hợp lệ");
          return;
        }

        // Xóa preview cũ nếu có
        if (optionPreviews[index]) {
          URL.revokeObjectURL(optionPreviews[index]);
        }

        // Tạo preview mới
        const preview = URL.createObjectURL(file);
        const newPreviews = [...optionPreviews];
        newPreviews[index] = preview;
        setOptionPreviews(newPreviews);

        // Upload file với retry logic
        let retryCount = 0;
        const maxRetries = 3;

        while (retryCount < maxRetries) {
          try {
            const uploadedFile = await storage.createFile(
              BUCKET_questionsImageforExam,
              ID.unique(),
              file
            );

            const newOptions = [...formData.options];
            newOptions[index] = uploadedFile.$id;
            setFormData({
              ...formData,
              options: newOptions,
            });
            break;
          } catch (error) {
            retryCount++;
            if (retryCount === maxRetries) {
              throw error;
            }
            // Đợi 1 giây trước khi thử lại
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        }
      } catch (error) {
        console.error("Error uploading option image:", error);
        setError("Không thể upload ảnh đáp án. Vui lòng thử lại.");
        // Xóa preview nếu upload thất bại
        if (optionPreviews[index]) {
          URL.revokeObjectURL(optionPreviews[index]);
          const newPreviews = [...optionPreviews];
          newPreviews[index] = "";
          setOptionPreviews(newPreviews);
        }
      }
    }
  };

  // Xóa ảnh option
  const removeOptionImage = async (index: number) => {
    try {
      // Lấy fileId từ options array (vì chúng ta đã lưu id của file như là giá trị của option)
      const fileId = formData.options[index];

      // Kiểm tra xem có phải là file ID không
      if (fileId && fileId.match(/^[a-zA-Z0-9]{20,}$/)) {
        // Xóa file từ storage
        await storage.deleteFile(BUCKET_questionsImageforExam, fileId);

        // Reset input file cho option
        const optionInput = document.getElementById(
          `option-image-${index}`
        ) as HTMLInputElement;
        if (optionInput) {
          optionInput.value = "";
        }

        // Xóa preview và cập nhật options
        const newPreviews = [...optionPreviews];
        URL.revokeObjectURL(newPreviews[index]);
        newPreviews[index] = "";
        setOptionPreviews(newPreviews);

        // Cập nhật options array, đặt lại giá trị thành rỗng
        const newOptions = [...formData.options];
        newOptions[index] = "";
        setFormData({
          ...formData,
          options: newOptions,
        });
      }
    } catch (error) {
      console.error("Lỗi khi xóa file:", error);
      // Có thể thêm thông báo lỗi cho người dùng ở đây
      setError("Không thể xóa ảnh. Vui lòng thử lại sau.");
    }
  };
  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        EXAMS_COLLECTION_ID
      );

      // Fetch questions cho mỗi exam
      const examsWithQuestions = await Promise.all(
        response.documents.map(async (exam) => {
          const questionsResponse = await databases.listDocuments(
            DATABASE_ID,
            QUESTIONS_COLLECTION_ID,
            [Query.equal("examId", exam.$id)]
          );
          return {
            id: exam.$id,
            title: exam.title,
            description: exam.description,
            subject: exam.subject,
            grade: exam.grade,
            type: exam.type,
            questions: questionsResponse.documents,
            duration: exam.duration,
            startTime: exam.startTime,
            endTime: exam.endTime,
            maxScore: exam.maxScore,
          } as Exam;
        })
      );

      setExams(examsWithQuestions);
    } catch (error) {
      console.error(error);
    }
  };
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError("Kích thước ảnh không được vượt quá 5MB");
        return;
      }

      if (!file.type.startsWith("image/")) {
        setError("Vui lòng chọn file ảnh hợp lệ");
        return;
      }

      // Xóa preview cũ nếu có
      if (formData.imagePreview) {
        URL.revokeObjectURL(formData.imagePreview);
      }

      // Reset input file để có thể chọn lại file cũ
      e.target.value = "";

      setFormData({
        ...formData,
        imageFile: file,
        imagePreview: URL.createObjectURL(file),
      });
    }
  };
  const handleGradeChange = (grade: any) => {
    setFilters((prev) => ({
      ...prev,
      grade: prev.grade === grade.toString() ? "" : grade.toString(),
    }));
  };
  const handleSubjectChange = (subject: any) => {
    setFilters((prev) => ({
      ...prev,
      subject: prev.subject === subject ? "" : subject,
    }));
  };
  const handleCloseModal = async () => {
    try {
      // Xóa ảnh câu hỏi nếu có
      if (formData.imageFile) {
        const imageInput = document.getElementById(
          "image-upload"
        ) as HTMLInputElement;
        if (imageInput) {
          imageInput.value = "";
        }
      }

      // Xóa các ảnh option đã upload
      for (const option of formData.options) {
        // Kiểm tra xem option có phải là ID ảnh không
        if (option && option.match(/^[a-zA-Z0-9]{20,}$/)) {
          try {
            await storage.deleteFile(BUCKET_questionsImageforExam, option);
          } catch (error) {
            console.error("Lỗi khi xóa ảnh option:", error);
          }
        }
      }

      setIsCreateModalOpen(false);
      resetForm();
    } catch (error) {
      console.error("Lỗi khi dọn dẹp ảnh:", error);
      setError("Có lỗi xảy ra khi dọn dẹp ảnh. Vui lòng thử lại.");
    }
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Lưu câu hỏi hiện tại vào mảng questions
    if (formData.currentQuestionIndex < formData.numberOfQuestions - 1) {
      const currentQuestion: Question = {
        type: "select",
        prompt: formData.prompt,
        options: formData.options,
        answer: formData.answer,
        category: formData.subject,
        createdBy: "", // Sẽ được set khi lưu vào database
        $id: ID.unique(),
        $collectionId: QUESTIONS_COLLECTION_ID,
        $databaseId: DATABASE_ID,
        $createdAt: new Date().toISOString(),
        $updatedAt: new Date().toISOString(),
        $permissions: [],
      };

      const newQuestions = [...formData.questions];
      newQuestions[formData.currentQuestionIndex] = currentQuestion;

      // Reset form và preview ảnh cho câu tiếp theo
      if (formData.imagePreview) {
        URL.revokeObjectURL(formData.imagePreview);
      }

      // Reset các preview ảnh của options
      optionPreviews.forEach((preview) => {
        if (preview) {
          URL.revokeObjectURL(preview);
        }
      });

      setFormData({
        ...formData,
        questions: newQuestions,
        currentQuestionIndex: formData.currentQuestionIndex + 1,
        prompt: "",
        options: ["", "", "", ""],
        answer: "",
        imageFile: undefined,
        imagePreview: undefined,
      });

      // Reset option previews
      setOptionPreviews([]);

      // Reset input file fields
      const imageInput = document.getElementById(
        "image-upload"
      ) as HTMLInputElement;
      if (imageInput) {
        imageInput.value = "";
      }

      // Reset option image inputs
      formData.options.forEach((_, index) => {
        const optionInput = document.getElementById(
          `option-image-${index}`
        ) as HTMLInputElement;
        if (optionInput) {
          optionInput.value = "";
        }
      });

      return;
    }

    try {
      setLoading(true);
      const user = await account.get();

      // Lưu câu hỏi cuối cùng vào mảng
      const lastQuestion: Question = {
        type: "select",
        prompt: formData.prompt,
        options: formData.options,
        answer: formData.answer,
        category: formData.subject,
        createdBy: user.$id,
        $id: ID.unique(),
        $collectionId: QUESTIONS_COLLECTION_ID,
        $databaseId: DATABASE_ID,
        $createdAt: new Date().toISOString(),
        $updatedAt: new Date().toISOString(),
        $permissions: [],
      };

      const allQuestions = [...formData.questions, lastQuestion];

      // Tạo exam document trước
      const examData = {
        title: formData.title,
        description: formData.description,
        subject: formData.subject,
        grade: formData.grade,
        type: formData.type,
        duration: formData.duration,
        startTime: formData.startTime,
        endTime: formData.endTime,
        maxScore: formData.maxScore,
      };

      // Lưu exam
      const exam = await databases.createDocument(
        DATABASE_ID,
        EXAMS_COLLECTION_ID,
        ID.unique(),
        examData
      );

      // Lưu từng câu hỏi và liên kết với exam
      for (const question of allQuestions) {
        let imageId = null;
        let bucketId = null;

        // Xử lý upload ảnh nếu có
        if (formData.imageFile) {
          const uploadedFile = await storage.createFile(
            BUCKET_questionsImageforExam,
            ID.unique(),
            formData.imageFile
          );
          imageId = uploadedFile.$id;
          bucketId = BUCKET_questionsImageforExam;
        }

        // Tạo question document và liên kết với exam
        await databases.createDocument(
          DATABASE_ID,
          QUESTIONS_COLLECTION_ID,
          ID.unique(),
          {
            type: question.type,
            prompt: question.prompt,
            options: (question.options ?? []).filter((opt) => opt), // Lọc bỏ options rỗng
            answer: question.answer,
            category: question.category,
            createdBy: user.$id,
            imageId,
            bucketId,
            examId: exam.$id, // Liên kết với exam
          }
        );
      }
      await fetchExams(); // Thêm dòng này
      // Cập nhật state và đóng modal

      setIsCreateModalOpen(false);
      resetForm();
    } catch (error: any) {
      setError(error.message || "Không thể tạo đề thi");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    // Xóa preview ảnh câu hỏi nếu có
    if (formData.imagePreview) {
      URL.revokeObjectURL(formData.imagePreview);
    }

    // Xóa preview ảnh của các options
    optionPreviews.forEach((preview) => {
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    });
    setOptionPreviews([]);

    // Reset input file fields
    const imageInput = document.getElementById(
      "image-upload"
    ) as HTMLInputElement;
    if (imageInput) {
      imageInput.value = "";
    }

    // Reset option image inputs
    formData.options.forEach((_, index) => {
      const optionInput = document.getElementById(
        `option-image-${index}`
      ) as HTMLInputElement;
      if (optionInput) {
        optionInput.value = "";
      }
    });

    setFormData({
      title: "",
      description: "",
      subject: "",
      grade: "",
      type: "multiple_choice",
      duration: 60,
      startTime: "",
      endTime: "",
      maxScore: 10,
      prompt: "",
      answer: "",
      options: ["", "", "", ""],
      imageFile: undefined,
      imagePreview: undefined,
      numberOfQuestions: 1,
      currentQuestionIndex: 0,
      questions: [],
    });
    setError(null);
  };

  const handleDeleteExam = (examId: string) => {
    setShowDeleteConfirm({ show: true, examId });
  };

  const startExam = (exam: Exam) => {
    setSelectedExam(exam);
    setIsExamMode(true);
  };

  const handleExamSubmit = async (answers: string[]) => {
    // Handle exam submission logic here
    console.log("Submitted answers:", answers);
  };

  // Thêm hàm lọc đề thi
  const filteredExams = exams.filter((exam) => {
    const matchesSearch =
      exam.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exam.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exam.grade.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesGrade = !filters.grade || exam.grade === filters.grade;
    const matchesSubject = !filters.subject || exam.subject === filters.subject;

    return matchesSearch && matchesGrade && matchesSubject;
  });

  if (isExamMode && selectedExam) {
    return (
      <ExamInterface
        exam={selectedExam}
        onClose={() => setIsExamMode(false)}
        onSubmit={handleExamSubmit}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white">
      {/* Header */}
      <Navigation />

      {/* Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Tìm kiếm đề thi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg"
              />
              <Search className="absolute left-3 top-2.5 text-gray-400 w-5 h-5" />
            </div>

            {isStaffMember() && (
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                Tạo đề thi mới
              </button>
            )}
          </div>
        </div>

        {/* Exams List */}
        <div className="grid grid-cols-12 gap-8">
          {/* Sidebar bộ lọc với thiết kế mới */}
          <div className="col-span-3">
            <div className="sticky top-24 h-[calc(100vh-150px)] overflow-y-auto scrollbar-hide bg-white rounded-lg shadow-sm p-6">
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  Bộ lọc tìm kiếm
                </h3>
                <div className="space-y-6">
                  {/* Cấp học với thiết kế mới */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cấp học
                    </label>
                    <select
                      value={educationLevel}
                      onChange={(e) =>
                        handleEducationLevelChange(e.target.value)
                      }
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 transition-all"
                    >
                      <option value="">Tất cả cấp học</option>
                      <option value="Tiểu học">Tiểu học</option>
                      <option value="THCS">THCS</option>
                      <option value="THPT">THPT</option>
                    </select>
                  </div>

                  {educationLevel && (
                    <>
                      {/* Lớp với thiết kế mới */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                          Lớp học
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          {gradesByLevel[educationLevel].map((grade) => (
                            <label
                              key={grade}
                              className={`flex items-center p-3 rounded-lg cursor-pointer transition-all ${
                                filters.grade === grade.toString()
                                  ? "bg-blue-50 border-2 border-blue-500"
                                  : "bg-gray-50 border border-gray-200 hover:bg-gray-100"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={filters.grade === grade.toString()}
                                onChange={() => handleGradeChange(grade)}
                                className="hidden"
                              />
                              <span className="text-sm font-medium">
                                Lớp {grade}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Môn học với thiết kế mới */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                          Môn học
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {subjectsByLevel[educationLevel].map((subject) => (
                            <label
                              key={subject}
                              className={`inline-flex items-center px-4 py-2 rounded-full cursor-pointer transition-all ${
                                filters.subject === subject
                                  ? "bg-blue-500 text-white"
                                  : "bg-gray-50 border border-gray-200 hover:bg-gray-100"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={filters.subject === subject}
                                onChange={() => handleSubjectChange(subject)}
                                className="hidden"
                              />
                              <span className="text-sm">{subject}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Danh sách đề thi với thiết kế mới */}
          <div className="col-span-9">
            <div className="p-6">
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
                </div>
              ) : filteredExams.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl shadow-lg">
                  <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">
                    Chưa có đề thi nào
                  </h3>
                  <p className="text-gray-500">
                    Hãy bắt đầu bằng cách tạo đề thi đầu tiên của bạn
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredExams.map((exam, index) => (
                    <div
                      key={index}
                      className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300"
                    >
                      <div className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <h3 className="font-semibold text-xl text-gray-800">
                            {exam.title}
                          </h3>
                          <button
                            onClick={() => handleDeleteExam(exam.id)}
                            className="p-2 text-gray-400 hover:text-red-500 rounded-full hover:bg-red-50 transition-all"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>

                        <div className="flex flex-wrap gap-2 mb-4">
                          <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700">
                            Môn: {exam.subject}
                          </span>
                          <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-700">
                            Lớp: {exam.grade}
                          </span>
                        </div>

                        <p className="text-gray-600 mb-6 line-clamp-2">
                          {exam.description}
                        </p>

                        <div className="flex items-center justify-between pt-4 border-t">
                          <div className="flex items-center gap-2 text-gray-500">
                            <Clock className="w-5 h-5" />
                            <span className="font-medium">
                              {exam.duration} phút
                            </span>
                          </div>

                          <button
                            onClick={() => startExam(exam)}
                            className="px-6 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-all duration-300 font-medium shadow-lg shadow-blue-100"
                          >
                            Làm bài
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* Modal xác nhận xóa */}
      {showDeleteConfirm.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-8 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-gray-800 mb-4">
              Xác nhận xóa
            </h3>
            <p className="text-gray-600 mb-8">
              Bạn có chắc chắn muốn xóa đề thi này? Hành động này không thể hoàn
              tác.
            </p>
            <div className="flex justify-end gap-4">
              <button
                onClick={() =>
                  setShowDeleteConfirm({ show: false, examId: null })
                }
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Hủy
              </button>
              <button
                onClick={async () => {
                  if (showDeleteConfirm.examId) {
                    try {
                      // 1. Xóa lịch sử làm bài của đề thi
                      const examHistories = await databases.listDocuments(
                        DATABASE_ID,
                        exam_histories,
                        [Query.equal("examId", showDeleteConfirm.examId)]
                      );

                      for (const history of examHistories.documents) {
                        await databases.deleteDocument(
                          DATABASE_ID,
                          exam_histories,
                          history.$id
                        );
                      }

                      // 2. Xóa các câu hỏi và ảnh liên quan
                      const questions = await databases.listDocuments(
                        DATABASE_ID,
                        QUESTIONS_COLLECTION_ID,
                        [Query.equal("examId", showDeleteConfirm.examId)]
                      );

                      for (const question of questions.documents) {
                        if (question.imageId) {
                          try {
                            await storage.deleteFile(
                              BUCKET_questionsImageforExam,
                              question.imageId
                            );
                          } catch (error) {
                            console.error("Lỗi khi xóa ảnh câu hỏi:", error);
                          }
                        }

                        if (question.options) {
                          for (const option of question.options) {
                            if (option && option.match(/^[a-zA-Z0-9]{20,}$/)) {
                              try {
                                await storage.deleteFile(
                                  BUCKET_questionsImageforExam,
                                  option
                                );
                              } catch (error) {
                                console.error("Lỗi khi xóa ảnh option:", error);
                              }
                            }
                          }
                        }

                        await databases.deleteDocument(
                          DATABASE_ID,
                          QUESTIONS_COLLECTION_ID,
                          question.$id
                        );
                      }

                      // 3. Xóa đề thi
                      await databases.deleteDocument(
                        DATABASE_ID,
                        EXAMS_COLLECTION_ID,
                        showDeleteConfirm.examId
                      );

                      // 4. Cập nhật state
                      setExams((prev) =>
                        prev.filter(
                          (exam) => exam.id !== showDeleteConfirm.examId
                        )
                      );
                    } catch (error) {
                      console.error("Lỗi khi xóa đề thi:", error);
                      setError("Không thể xóa đề thi. Vui lòng thử lại sau.");
                    }
                  }
                  setShowDeleteConfirm({ show: false, examId: null });
                }}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
              >
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Create Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Tạo đề thi</h2>
              <h2 className="text-2xl font-bold">
                Câu hỏi {formData.currentQuestionIndex + 1}/
                {formData.numberOfQuestions}
              </h2>
              <button
                onClick={handleCloseModal}
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

            <form
              onSubmit={handleSubmit}
              className="bg-white rounded-lg shadow-sm"
            >
              <div className="p-6 space-y-8">
                {/* Thông tin cơ bản */}
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="text-lg font-medium text-gray-900 mb-6">
                    Thông tin cơ bản
                  </h3>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Loại câu hỏi
                      </label>
                      <select
                        value={formData.type}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            type: e.target.value as
                              | "multiple_choice"
                              | "file_upload",
                          })
                        }
                        className="w-full p-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="multiple_choice">Trắc nghiệm</option>
                        <option value="file_upload">Dịch</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tiêu đề
                      </label>
                      <input
                        type="text"
                        value={formData.title}
                        onChange={(e) =>
                          setFormData({ ...formData, title: e.target.value })
                        }
                        className="w-full p-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Môn học
                      </label>
                      <select
                        value={formData.subject}
                        onChange={(e) =>
                          setFormData({ ...formData, subject: e.target.value })
                        }
                        className="w-full p-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Chọn môn học</option>
                        <option value="Toán">Toán</option>
                        <option value="Văn">Văn</option>
                        <option value="Anh">Tiếng Anh</option>
                        <option value="Lý">Vật Lý</option>
                        <option value="Hóa">Hóa Học</option>
                        <option value="Sinh">Sinh Học</option>
                        <option value="Sử">Ngôn ngữ kí hiệu</option>
                      </select>
                    </div>

                    {/* Thêm trường chọn lớp */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Lớp
                      </label>
                      <select
                        value={formData.grade}
                        onChange={(e) =>
                          setFormData({ ...formData, grade: e.target.value })
                        }
                        className="w-full p-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      >
                        <option value="">Chọn lớp</option>
                        <option value="1">Lớp 1</option>
                        <option value="2">Lớp 2</option>
                        <option value="3">Lớp 3</option>
                        <option value="4">Lớp 4</option>
                        <option value="5">Lớp 5</option>
                        <option value="6">Lớp 6</option>
                        <option value="7">Lớp 7</option>
                        <option value="8">Lớp 8</option>
                        <option value="9">Lớp 9</option>
                        <option value="10">Lớp 10</option>
                        <option value="11">Lớp 11</option>
                        <option value="12">Lớp 12</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Mô tả
                      </label>
                      <input
                        type="text"
                        value={formData.description}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            description: e.target.value,
                          })
                        }
                        className="w-full p-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Số câu hỏi
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={formData.numberOfQuestions}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            numberOfQuestions: parseInt(e.target.value),
                          })
                        }
                        className="w-full p-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div className="mt-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Câu hỏi
                    </label>
                    <div className="flex gap-4">
                      <input
                        type="text"
                        value={formData.prompt}
                        onChange={(e) =>
                          setFormData({ ...formData, prompt: e.target.value })
                        }
                        className="flex-1 p-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Nhập nội dung câu hỏi..."
                      />
                      <button
                        type="button"
                        onClick={() =>
                          document.getElementById("image-upload")?.click()
                        }
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg flex items-center gap-2"
                      >
                        <Upload className="w-4 h-4" />
                        Thêm ảnh
                      </button>
                      <input
                        id="image-upload"
                        type="file"
                        className="hidden"
                        onChange={handleImageUpload}
                        accept="image/*"
                      />
                    </div>
                    {formData.imagePreview && (
                      <div className="mt-4 relative inline-block">
                        <img
                          src={formData.imagePreview}
                          alt="Preview"
                          className="h-32 w-auto rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (formData.imagePreview) {
                              URL.revokeObjectURL(formData.imagePreview);
                            }
                            // Reset input file
                            const imageInput = document.getElementById(
                              "image-upload"
                            ) as HTMLInputElement;
                            if (imageInput) {
                              imageInput.value = "";
                            }
                            setFormData({
                              ...formData,
                              imageFile: undefined,
                              imagePreview: undefined,
                            });
                          }}
                          className="absolute -top-2 -right-2 p-1 bg-red-100 rounded-full hover:bg-red-200"
                        >
                          <X className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Thời gian */}
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="text-lg font-medium text-gray-900 mb-6">
                    Cài đặt thời gian
                  </h3>
                  <div className="grid grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Thời gian làm bài (phút)
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={formData.duration}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            duration: parseInt(e.target.value),
                          })
                        }
                        className="w-full p-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                {/* Phần đáp án */}
                {formData.type === "multiple_choice" && (
                  <div className="bg-gray-50 p-6 rounded-lg">
                    <h3 className="text-lg font-medium text-gray-900 mb-6">
                      Đáp án
                    </h3>
                    <div className="grid grid-cols-2 gap-6">
                      {formData.options.map((option, index) => (
                        <div
                          key={index}
                          onClick={() =>
                            setFormData({ ...formData, answer: option })
                          }
                          className={`p-4 rounded-lg transition-all ${
                            formData.answer === option
                              ? "bg-blue-50 border-2 border-blue-500"
                              : "bg-white border border-gray-300"
                          }`}
                        >
                          <div className="flex items-center gap-3 mb-4">
                            <div
                              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                formData.answer === option
                                  ? "border-blue-500"
                                  : "border-gray-300"
                              }`}
                            >
                              {formData.answer === option && (
                                <div className="w-3 h-3 rounded-full bg-blue-500" />
                              )}
                            </div>
                            <span className="text-sm font-medium text-gray-700">
                              Đáp án {index + 1}
                            </span>
                          </div>

                          <input
                            type="text"
                            value={option}
                            onChange={(e) => {
                              const newOptions = [...formData.options];
                              newOptions[index] = e.target.value;
                              setFormData({ ...formData, options: newOptions });
                            }}
                            className="w-full p-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Nhập nội dung đáp án..."
                          />

                          {optionPreviews[index] ? (
                            <div className="mt-4 relative">
                              <img
                                src={optionPreviews[index]}
                                // Thay đổi kích thước preview
                                className="w-full h-48 object-contain rounded-lg cursor-pointer hover:scale-105 transition-transform"
                                alt={`Option ${index + 1}`}
                                onClick={() => {
                                  window.open(optionPreviews[index], "_blank");
                                }}
                              />

                              <button
                                type="button"
                                onClick={() => removeOptionImage(index)}
                                className="absolute top-2 right-2 p-1 bg-white rounded-full shadow-lg"
                              >
                                <X className="w-4 h-4 text-gray-600" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                document
                                  .getElementById(`option-image-${index}`)
                                  ?.click()
                              }
                              className="mt-4 w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg flex items-center justify-center gap-2"
                            >
                              <Upload className="w-4 h-4" />
                              Thêm ảnh cho đáp án
                            </button>
                          )}
                          <input
                            id={`option-image-${index}`}
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={(e) => handleOptionImageUpload(e, index)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {formData.type === "file_upload" && (
                  <div className="bg-gray-50 p-6 rounded-lg">
                    <h3 className="text-lg font-medium text-gray-900 mb-6">
                      Đáp án
                    </h3>
                    <div className="space-y-4">
                      <label className="block text-sm font-medium text-gray-700">
                        Câu trả lời mẫu
                      </label>
                      <textarea
                        value={formData.answer}
                        onChange={(e) =>
                          setFormData({ ...formData, answer: e.target.value })
                        }
                        rows={4}
                        className="w-full p-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Nhập câu trả lời mẫu..."
                        required
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                      <span>Đang xử lý...</span>
                    </>
                  ) : formData.currentQuestionIndex <
                    formData.numberOfQuestions - 1 ? (
                    "Câu hỏi tiếp theo"
                  ) : (
                    "Tạo đề thi"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <EducationalFooter></EducationalFooter>
    </div>
  );
};

export default ExamManagement;
