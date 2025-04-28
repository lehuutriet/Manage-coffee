import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { RememberGameData } from "../type/game";

interface IntelligenceGameModalProps {
  onClose: () => void;
  gameData: RememberGameData[];
}

const RememberGameModal = ({
  onClose,
  gameData,
}: IntelligenceGameModalProps) => {
  const [score, setScore] = useState(0);
  const [currentLevel, setCurrentLevel] = useState(0);
  const [selectedNumbers, setSelectedNumbers] = useState<string[]>([]);
  const [showMessage, setShowMessage] = useState(false);
  const [message, setMessage] = useState("");
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [showResultModal, setShowResultModal] = useState(false);
  const [resultMessage, setResultMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [isGameEnded, setIsGameEnded] = useState(false);
  const [randomizedQuestions, setRandomizedQuestions] = useState<
    RememberGameData[]
  >([]);
  const [currentGame, setCurrentGame] = useState<RememberGameData | null>(null);
  const [displayNumbers, setDisplayNumbers] = useState<string[]>([]);

  // Hàm xáo trộn array
  const shuffleArray = (array: string[]) => {
    return [...array].sort(() => Math.random() - 0.5);
  };

  // Xáo trộn câu hỏi khi component mount
  useEffect(() => {
    if (gameData && gameData.length > 0) {
      const shuffledQuestions = [...gameData].sort(() => Math.random() - 0.5);
      setRandomizedQuestions(shuffledQuestions);
      setCurrentGame(shuffledQuestions[0]);
      setTimeLeft(shuffledQuestions[0].timeLimit);
      setDisplayNumbers(shuffleArray(shuffledQuestions[0].numbers));
    }
  }, [gameData]);

  // Timer effect
  useEffect(() => {
    if (timeLeft > 0 && !isGameEnded) {
      const timer = setInterval(() => {
        setTimeLeft((time) => {
          if (time <= 1) {
            handleTimeUp();
            return 0;
          }
          return time - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [timeLeft, isGameEnded]);

  const handleTimeUp = () => {
    setIsGameEnded(true);
    setIsSuccess(false);
    setResultMessage("Hết giờ! Bạn không hoàn thành được thử thách");
    setShowResultModal(true);
  };

  const handleNumberClick = (number: string) => {
    if (isGameEnded || !currentGame) return;

    const newSelectedNumbers = [...selectedNumbers, number];
    setSelectedNumbers(newSelectedNumbers);

    // Kiểm tra thứ tự đúng
    const isCorrectOrder = newSelectedNumbers.every(
      (num, index) => num === currentGame.correctOrder[index]
    );

    if (!isCorrectOrder) {
      // Nếu chọn sai
      setScore(Math.max(0, score - 1));
      setMessage("Sai rồi! -1 điểm");
      setShowMessage(true);
      setTimeout(() => setShowMessage(false), 1500);
      setSelectedNumbers([]);
      return;
    }

    // Nếu đã chọn đủ số theo thứ tự đúng
    if (newSelectedNumbers.length === currentGame.numbers.length) {
      const pointsEarned = 10;
      setScore(score + pointsEarned);

      if (currentLevel < randomizedQuestions.length - 1) {
        // Chuyển sang level tiếp theo
        setCurrentLevel((prev) => {
          const nextLevel = prev + 1;
          const nextGame = randomizedQuestions[nextLevel];
          setCurrentGame(nextGame);
          setTimeLeft(nextGame.timeLimit);
          // Xáo trộn số cho level mới
          setDisplayNumbers(shuffleArray(nextGame.numbers));
          return nextLevel;
        });
        setSelectedNumbers([]);
        setMessage(`Chính xác! +${pointsEarned} điểm`);
        setShowMessage(true);
        setTimeout(() => setShowMessage(false), 1500);
      } else {
        // Hoàn thành game
        setIsGameEnded(true);
        setIsSuccess(true);
        setResultMessage(
          `Chúc mừng! Bạn đã hoàn thành với ${score + pointsEarned} điểm`
        );
        setShowResultModal(true);
      }
    }
  };

  const resetGame = () => {
    if (gameData && gameData.length > 0) {
      const shuffledQuestions = [...gameData].sort(() => Math.random() - 0.5);
      setRandomizedQuestions(shuffledQuestions);
      setCurrentGame(shuffledQuestions[0]);
      setCurrentLevel(0);
      setScore(0);
      setSelectedNumbers([]);
      setTimeLeft(shuffledQuestions[0].timeLimit);
      setShowResultModal(false);
      setIsGameEnded(false);
      // Xáo trộn số khi reset
      setDisplayNumbers(shuffleArray(shuffledQuestions[0].numbers));
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6 flex justify-between items-center">
          <h2 className="text-3xl font-bold text-white">Trò chơi ghi nhớ</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        <div className="p-8">
          {/* Game Status */}
          <div className="flex justify-between items-center mb-8">
            <div className="bg-purple-50 px-6 py-3 rounded-full">
              <span className="text-purple-700 font-semibold text-lg">
                Điểm: {score}
              </span>
            </div>
            <div className="bg-blue-50 px-6 py-3 rounded-full">
              <span className="text-blue-700 font-semibold">
                Thời gian: {timeLeft}s
              </span>
            </div>
            <div className="bg-green-50 px-6 py-3 rounded-full">
              <span className="text-green-700 font-semibold">
                Cấp độ: {currentLevel + 1}/{randomizedQuestions.length}
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

          {/* Game Board */}
          {currentGame && (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4 mb-8">
              {displayNumbers.map((number, index) => (
                <button
                  key={index}
                  onClick={() => handleNumberClick(number)}
                  disabled={selectedNumbers.includes(number) || isGameEnded}
                  className={`h-16 text-xl font-bold rounded-xl transition-all transform hover:-translate-y-1
          ${
            selectedNumbers.includes(number)
              ? "bg-gray-200 cursor-not-allowed"
              : "bg-blue-500 hover:bg-blue-600 text-white cursor-pointer"
          }`}
                >
                  {number}
                </button>
              ))}
            </div>
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
                      hover:to-blue-700 transition-all"
              >
                Chơi lại
              </button>
              <button
                onClick={onClose}
                className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 
                      rounded-xl font-medium hover:bg-gray-200 
                      transition-all"
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

export default RememberGameModal;
