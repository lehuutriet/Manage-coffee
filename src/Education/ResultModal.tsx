import React, { useState } from "react";
import { Star, X, ExternalLink } from "lucide-react";
import { useAuth } from "../contexts/auth/authProvider";

interface ResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  score: number;
  totalScore: number;
  correctAnswers: number;
  totalQuestions: number;
  questions: Array<{
    prompt: string;
    options?: string[];
    answer: string;
  }>;
  userAnswers: string[];
  duration: number;
  onRetry: () => void; // Thêm prop này
}

const ResultModal: React.FC<ResultModalProps> = ({
  isOpen,
  onClose,
  score,
  totalScore,
  correctAnswers,
  totalQuestions,
  questions,
  userAnswers,
  duration,
  onRetry,
}) => {
  const [showAnswerModal, setShowAnswerModal] = useState(false);
  const { storage } = useAuth();
  const BUCKET_questionsImageforExam = "676e2b060006efae803e";

  if (!isOpen) return null;

  const renderOptionContent = (option: string) => {
    if (option && option.match(/^[a-zA-Z0-9]{20,}$/)) {
      return (
        <img
          src={storage.getFileView(BUCKET_questionsImageforExam, option)}
          alt="Đáp án"
          className="w-full h-32 object-contain rounded-lg"
        />
      );
    }
    return option;
  };

  if (!isOpen) return null;
  return (
    <>
      {/* Modal Kết quả chính */}
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-10">
          <div className="flex flex-col items-center mb-10">
            <div className="w-24 h-24 bg-orange-50 rounded-full flex items-center justify-center mb-6">
              <Star className="w-12 h-12 text-orange-400" />
            </div>
            <h2 className="text-2xl font-semibold mb-3">
              Bạn cần cố gắng hơn!
            </h2>
            <p className="text-gray-600 text-base">
              Dưới đây là kết quả chi tiết của bạn
            </p>
          </div>

          <div className="grid grid-cols-2 gap-6 mb-10">
            <div className="bg-blue-50 p-6 rounded-lg">
              <p className="text-sm text-blue-600 mb-2">Điểm số của bạn</p>
              <p className="text-3xl font-bold text-blue-700">
                {score}/{totalScore}
              </p>
            </div>
            <div className="bg-purple-50 p-6 rounded-lg">
              <p className="text-sm text-purple-600 mb-2">Số câu đúng</p>
              <p className="text-3xl font-bold text-purple-700">
                {correctAnswers}/{totalQuestions}
              </p>
            </div>
            <div className="bg-green-50 p-6 rounded-lg">
              <p className="text-sm text-green-600 mb-2">Thời gian làm bài</p>
              <p className="text-3xl font-bold text-green-700">
                {duration} phút
              </p>
            </div>
            <div className="bg-orange-50 p-6 rounded-lg">
              <p className="text-sm text-orange-600 mb-2">Trạng thái</p>
              <p className="text-3xl font-bold text-orange-700">
                {score / totalQuestions >= 0.7 ? "Đạt" : "Chưa đạt"}
              </p>
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <button
              onClick={() => setShowAnswerModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              Xem đáp án
            </button>
            <button
              onClick={() => {
                setShowAnswerModal(false); // Đóng modal đáp án trước
                setTimeout(() => {
                  onRetry(); // Gọi hàm reset sau khi modal đã đóng
                }, 100);
              }}
              className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
            >
              Làm lại
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>

      {/* Modal xem đáp án */}
      {showAnswerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold">Chi tiết đáp án</h3>
                <button
                  onClick={() => setShowAnswerModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {questions.map((question, index) => (
                <div key={index} className="bg-gray-50 p-6 rounded-lg">
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        userAnswers[index] === question.answer
                          ? "bg-green-100 text-green-600"
                          : "bg-red-100 text-red-600"
                      }`}
                    >
                      {index + 1}
                    </div>
                    <div className="flex-grow">
                      <p className="font-medium mb-4">{question.prompt}</p>
                      {question.options && (
                        <div className="grid grid-cols-2 gap-4">
                          {question.options.map((option, optIndex) => (
                            <div
                              key={optIndex}
                              className={`p-4 rounded-lg border ${
                                option === question.answer
                                  ? "border-green-500 bg-green-50"
                                  : option === userAnswers[index]
                                  ? "border-red-500 bg-red-50"
                                  : "border-gray-200"
                              }`}
                            >
                              {renderOptionContent(option)}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ResultModal;
