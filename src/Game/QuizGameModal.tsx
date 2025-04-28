import { useState, useEffect } from "react";
import { X, Clock, HelpCircle } from "lucide-react";
import { QuizGameData } from "../type/game";

interface QuizGameModalProps {
  onClose: () => void;
  gameData: QuizGameData[];
}

const QuizGameModal: React.FC<QuizGameModalProps> = ({ onClose, gameData }) => {
  const [score, setScore] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showMessage, setShowMessage] = useState(false);
  const [message, setMessage] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [randomizedQuestions, setRandomizedQuestions] = useState<
    QuizGameData[]
  >([]);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [, setCurrentPoints] = useState<number>(0);
  const [showHint, setShowHint] = useState(false);
  const [showRules, setShowRules] = useState(true);
  const [showResultModal, setShowResultModal] = useState(false);
  const [resultMessage, setResultMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [, setIsGameInitialized] = useState(false);
  const [isGameEnded, setIsGameEnded] = useState(false);
  // Xáo trộn câu hỏi khi component mount
  useEffect(() => {
    if (gameData) {
      const shuffledQuestions = [...gameData].sort(() => Math.random() - 0.5);
      setRandomizedQuestions(shuffledQuestions);
    }
  }, [gameData]);
  const handleStartGame = () => {
    setShowRules(false);
    setIsGameInitialized(true);
    // Chỉ bắt đầu tính thời gian sau khi đóng modal luật
    setQuestionTimer(randomizedQuestions[0]?.level);
  };
  // Thiết lập thời gian dựa theo level
  const setQuestionTimer = (level: number) => {
    if (level === 1) {
      setTimeLeft(0); // Không giới hạn thời gian cho level cơ bản
    } else if (level === 2) {
      setTimeLeft(30); // 30 giây cho level trung bình
    } else {
      setTimeLeft(20); // 20 giây cho level nâng cao
    }
  };

  // Timer effect
  useEffect(() => {
    if (timeLeft > 0 && !isGameEnded) {
      const timer = setInterval(() => {
        setTimeLeft((time) => {
          if (time <= 1) {
            handleTimeOut();
            return 0;
          }
          return time - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [timeLeft, isGameEnded]);

  // Xử lý khi hết thời gian
  const handleTimeOut = () => {
    if (isChecking || showResultModal) return;
    setIsChecking(true);

    setMessage("Hết thời gian!");
    setShowMessage(true);

    setTimeout(() => {
      setShowMessage(false);
      if (currentQuestion < randomizedQuestions.length - 1) {
        setCurrentQuestion((prev) => prev + 1);
        setSelectedAnswer(null);
        setShowHint(false);
        setQuestionTimer(randomizedQuestions[currentQuestion + 1].level);
      } else {
        endGame(false);
      }
      setIsChecking(false);
    }, 1500);
  };

  // Xử lý khi chọn đáp án
  const handleAnswerSelect = (index: number) => {
    if (isChecking) return;
    setSelectedAnswer(index);
    setIsChecking(true);

    const current = randomizedQuestions[currentQuestion];
    const isCorrect = index === current.correctAnswer;

    if (isCorrect) {
      let pointsEarned;
      if (current.level === 1) {
        pointsEarned = 5; // Điểm cơ bản cho level 1
      } else if (current.level === 2) {
        pointsEarned = 10; // Điểm cơ bản cho level 2
        if (showHint) {
          pointsEarned = Math.floor(pointsEarned * 0.5);
        }
      } else {
        pointsEarned = 15; // Điểm cơ bản cho level 3
        if (timeLeft <= 10 && showHint) {
          pointsEarned = Math.floor(pointsEarned * 0.5);
        }
      }

      const newScore = score + pointsEarned;
      setScore(newScore);
      setCurrentPoints(pointsEarned);
      setMessage(`Chính xác! +${pointsEarned} điểm`);
      setShowMessage(true);

      setTimeout(() => {
        setShowMessage(false);
        if (currentQuestion < randomizedQuestions.length - 1) {
          setCurrentQuestion((prev) => prev + 1);
          setSelectedAnswer(null);
          setShowHint(false);
          setQuestionTimer(randomizedQuestions[currentQuestion + 1].level);
        } else {
          setIsGameEnded(true);
          endGame(true, newScore);
        }
        setIsChecking(false);
      }, 1500);
    } else {
      let penalty;
      if (current.level === 1) {
        penalty = 2;
      } else if (current.level === 2) {
        penalty = 5;
      } else {
        penalty = 10;
      }

      const newScore = Math.max(0, score - penalty);
      setScore(newScore);
      setMessage(`Sai rồi! -${penalty} điểm`);
      setShowMessage(true);

      setTimeout(() => {
        setShowMessage(false);
        setSelectedAnswer(null);
        setIsChecking(false);
      }, 1500);
    }
  };
  // Xử lý khi dùng gợi ý
  const handleUseHint = () => {
    setShowHint(true);
  };

  // Kết thúc game

  const endGame = (completed: boolean, finalScore?: number) => {
    setIsSuccess(completed);
    if (completed && finalScore !== undefined) {
      setResultMessage(`Chúc mừng! Bạn đã hoàn thành với ${finalScore} điểm`);
    } else {
      setResultMessage("Rất tiếc! Bạn không hoàn thành được thử thách");
    }
    setShowResultModal(true);
  };
  // Reset game
  const resetGame = () => {
    if (gameData) {
      const shuffledQuestions = [...gameData].sort(() => Math.random() - 0.5);
      setRandomizedQuestions(shuffledQuestions);
      setCurrentQuestion(0);
      setScore(0);

      setSelectedAnswer(null);
      setShowHint(false);
      setShowResultModal(false);
      setQuestionTimer(shuffledQuestions[0]?.level);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden">
        {/* Rules Modal */}
        {showRules && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full">
              <h3 className="text-2xl font-bold mb-4">Hệ thống tính điểm</h3>
              <p className="text-gray-600 text-sm mb-4">
                Tất cả câu hỏi được xáo trộn với nhau từ cơ bản đến nâng caoe
              </p>
              <div className="space-y-4 mb-6">
                <div>
                  <h4 className="font-semibold text-green-600">
                    Cấp độ cơ bản:
                  </h4>
                  <p className="text-gray-600">• Điểm cơ bản: 5 điểm</p>

                  <p className="text-gray-600">• Trừ 2 điểm khi sai</p>
                  <p className="text-gray-600">• Không giới hạn thời gian</p>
                  <p className="text-gray-600">
                    • Dùng gợi ý không bị trừ điểm
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-yellow-600">
                    Cấp độ trung bình:
                  </h4>
                  <p className="text-gray-600">• Điểm cơ bản: 10 điểm</p>

                  <p className="text-gray-600">• Trừ 5 điểm khi sai</p>
                  <p className="text-gray-600">• Thời gian: 30 giây</p>
                  <p className="text-gray-600">• Dùng gợi ý: -50% điểm</p>
                </div>

                <div>
                  <h4 className="font-semibold text-red-600">
                    Cấp độ nâng cao:
                  </h4>
                  <p className="text-gray-600">• Điểm cơ bản: 15 điểm</p>

                  <p className="text-gray-600">• Trừ 10 điểm khi sai</p>
                  <p className="text-gray-600">• Thời gian: 20 giây</p>
                  <p className="text-gray-600">
                    • Có gợi ý vào lúc 10 giây cuối,nhưng sẽ trừ 50%
                  </p>
                </div>
              </div>

              <button
                onClick={handleStartGame}
                className="w-full py-3 px-4 bg-blue-600 text-white rounded-xl font-medium 
           hover:bg-blue-700 transition-all"
              >
                Đã hiểu, bắt đầu thôi!
              </button>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6 flex justify-between items-center">
          <h2 className="text-3xl font-bold text-white">Câu đố khoa học</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        <div className="p-8">
          {/* Status Bar */}
          <div className="flex justify-between items-center mb-8">
            <div className="flex gap-4">
              <div className="bg-purple-50 px-6 py-3 rounded-full">
                <span className="text-purple-700 font-semibold text-lg">
                  Điểm: {score}
                </span>
              </div>
              {timeLeft > 0 && (
                <div
                  className={`flex items-center gap-2 px-6 py-3 rounded-full ${
                    timeLeft <= 5
                      ? "bg-red-100 text-red-700"
                      : "bg-blue-50 text-blue-700"
                  }`}
                >
                  <Clock className="w-5 h-5" />
                  <span className="font-semibold">{timeLeft}s</span>
                </div>
              )}
            </div>
            <div className="bg-blue-50 px-6 py-3 rounded-full">
              <span className="text-blue-700 font-semibold">
                Câu {currentQuestion + 1}/{randomizedQuestions.length}
              </span>
            </div>
          </div>

          {/* Message Display */}
          {showMessage && (
            <div className="text-center animate-bounce mb-6">
              <span
                className={`inline-block px-6 py-3 rounded-full text-lg font-bold
               ${
                 message.includes("Chính xác")
                   ? "bg-green-100 text-green-700"
                   : "bg-red-100 text-red-700"
               }`}
              >
                {message}
              </span>
            </div>
          )}

          {randomizedQuestions.length > 0 && (
            <>
              {/* Question */}
              <div className="mb-8">
                <div className="flex justify-between items-start">
                  <h3 className="text-2xl font-semibold text-gray-800">
                    {randomizedQuestions[currentQuestion].question}
                  </h3>
                  {/* Thay đổi điều kiện hiển thị nút gợi ý */}
                  {((randomizedQuestions[currentQuestion].level < 3 &&
                    !showHint) ||
                    (randomizedQuestions[currentQuestion].level === 3 &&
                      timeLeft <= 10 &&
                      !showHint)) && (
                    <button
                      onClick={handleUseHint}
                      className="flex items-center gap-2 px-4 py-2 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 transition-colors"
                    >
                      <HelpCircle className="w-5 h-5" />
                      <span>
                        {randomizedQuestions[currentQuestion].level === 1
                          ? "Gợi ý"
                          : "Gợi ý (-50% điểm)"}
                      </span>
                    </button>
                  )}
                </div>
                {showHint && (
                  <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-yellow-700">
                      Gợi ý: Đáp án đúng có thể là{" "}
                      {
                        randomizedQuestions[currentQuestion].options[
                          randomizedQuestions[currentQuestion].correctAnswer
                        ]
                      }
                    </p>
                  </div>
                )}
              </div>

              {/* Answer Options */}
              <div className="space-y-4">
                {randomizedQuestions[currentQuestion].options.map(
                  (option, index) => (
                    <button
                      key={index}
                      onClick={() => handleAnswerSelect(index)}
                      disabled={isChecking}
                      className={`w-full p-4 text-left rounded-xl transition-all transform hover:-translate-y-1
                     ${
                       selectedAnswer === index
                         ? selectedAnswer ===
                           randomizedQuestions[currentQuestion].correctAnswer
                           ? "bg-green-100 text-green-700"
                           : "bg-red-100 text-red-700"
                         : "bg-gray-50 hover:bg-gray-100"
                     }`}
                    >
                      {option}
                    </button>
                  )
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Result Modal */}
      {showResultModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full text-center">
            <div
              className={`text-6xl mb-4 ${
                isSuccess ? "text-green-500" : "text-red-500"
              }`}
            >
              {isSuccess ? "🎉" : "😢"}
            </div>
            <h3 className="text-2xl font-bold mb-4">
              {isSuccess ? "Chúc mừng!" : "Rất tiếc!"}
            </h3>
            <p className="text-gray-600 mb-6">{resultMessage}</p>
            <div className="flex gap-4">
              <button
                onClick={resetGame}
                className="flex-1 py-3 px-4 bg-gradient-to-r from-purple-600 to-blue-600 
                      text-white rounded-xl font-medium hover:from-purple-700 
                      hover:to-blue-700 transition-all transform hover:-translate-y-1"
              >
                Thử lại
              </button>
              <button
                onClick={onClose}
                className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 
                      rounded-xl font-medium hover:bg-gray-200 
                      transition-all transform hover:-translate-y-1"
              >
                Thoát
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuizGameModal;
