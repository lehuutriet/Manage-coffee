import { useState, useEffect } from "react";
import { X } from "lucide-react";

interface LogicGameData {
  $id: string;
  type: "sequence" | "math" | "pairs";
  question: string;
  data: string[];
  answer: string[];
  explanation?: string;
  level: number;
  timeLimit: number;
}

interface LogicGameModalProps {
  onClose: () => void;
  gameData: LogicGameData[];
}

const LogicGameModal = ({ onClose, gameData }: LogicGameModalProps) => {
  const [score, setScore] = useState(0);
  const [currentLevel, setCurrentLevel] = useState(0);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [showMessage, setShowMessage] = useState(false);
  const [message, setMessage] = useState("");
  const [showResultModal, setShowResultModal] = useState(false);
  const [resultMessage, setResultMessage] = useState("");
  const [currentGame, setCurrentGame] = useState<LogicGameData | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [showRules, setShowRules] = useState(true);
  const [, setIsGameInitialized] = useState(false);
  const [completedPairs, setCompletedPairs] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [shuffledGames, setShuffledGames] = useState<LogicGameData[]>([]);
  // Khởi tạo game
  useEffect(() => {
    if (gameData && gameData.length > 0) {
      // Nhóm câu hỏi theo loại
      const groupedGames = gameData.reduce((acc, game) => {
        if (!acc[game.type]) {
          acc[game.type] = [];
        }
        acc[game.type].push(game);
        return acc;
      }, {} as Record<string, LogicGameData[]>);

      // Xáo trộn mỗi nhóm
      Object.values(groupedGames).forEach((group) => {
        group.sort(() => Math.random() - 0.5);
      });

      // Ghép các nhóm và random thêm lần nữa
      const mixedGames: LogicGameData[] = [];
      let maxLength = Math.max(
        ...Object.values(groupedGames).map((g) => g.length)
      );

      for (let i = 0; i < maxLength; i++) {
        const availableTypes = Object.keys(groupedGames).filter(
          (type) => groupedGames[type][i]
        );
        availableTypes.sort(() => Math.random() - 0.5);

        availableTypes.forEach((type) => {
          if (groupedGames[type][i]) {
            mixedGames.push(groupedGames[type][i]);
          }
        });
      }

      // Lưu mảng đã xáo trộn vào state
      setShuffledGames(mixedGames);

      // Khởi tạo game đầu tiên
      setCurrentGame(mixedGames[0]);
      setTimeLeft(mixedGames[0].timeLimit);
    }
  }, [gameData]);
  const handleStartGame = () => {
    setShowRules(false);
    setIsGameInitialized(true);
    setCompletedPairs([]); // Reset completedPairs
    if (currentGame) {
      setTimeLeft(currentGame.timeLimit);
    }
  };

  // Timer
  useEffect(() => {
    if (timeLeft > 0 && !showRules) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleTimeUp();
            return 0;
          }
          return prev - 1;
        });
      }, 1500);
      return () => clearInterval(timer);
    }
  }, [timeLeft, showRules]);

  const handleTimeUp = () => {
    setShowExplanation(true);
    setMessage("Hết giờ!");
    setShowMessage(true);
  };

  const handleItemClick = (item: string) => {
    if (!currentGame || timeLeft === 0) return;

    switch (currentGame.type) {
      case "sequence":
        handleSequenceGame(item);
        break;
      case "math":
        handleMathGame(item);
        break;
      case "pairs":
        handlePairsGame(item);
        break;
    }
  };

  const handleSequenceGame = (number: string) => {
    if (!currentGame) return;

    setSelectedItems([number]);

    // Lấy đáp án (số tiếp theo của dãy)
    const expectedNext = currentGame.answer[0];
    const isCorrect = number === expectedNext;

    if (isCorrect) {
      // Tính điểm và hiện thông báo
      setScore(score + 10);
      setMessage("Chính xác! +10 điểm");
      setShowMessage(true);
      setShowExplanation(true);

      setTimeout(() => {
        if (currentLevel < gameData.length - 1) {
          setCurrentLevel((prev) => {
            const nextLevel = prev + 1;
            const nextGame = gameData[nextLevel];
            setCurrentGame(nextGame);
            setTimeLeft(nextGame.timeLimit);
            return nextLevel;
          });
          setSelectedItems([]);
          setShowMessage(false);
          setShowExplanation(false);
        } else {
          setResultMessage(
            `Chúc mừng! Bạn đã hoàn thành với ${score + 10} điểm`
          );
          setShowResultModal(true);
        }
      }, 2000);
    } else {
      handleWrongAnswer();
    }
  };

  // Trong LogicGameModal:
  const handleMathGame = (item: string) => {
    if (!currentGame) return;
    const newSelected = [...selectedItems, item];
    setSelectedItems(newSelected);

    // Kiểm tra khi người chơi đã chọn đủ số phần tử
    if (newSelected.length === currentGame.data.length) {
      const expression = newSelected.join(""); // Ghép các phần tử lại thành biểu thức
      const isCorrect = currentGame.answer[0] === expression; // So sánh với đáp án

      if (isCorrect) {
        handleCorrectAnswer();
      } else {
        handleWrongAnswer();
      }
    }
  };

  const handlePairsGame = (item: string) => {
    if (!currentGame || isProcessing) return;

    if (completedPairs.includes(item)) return;

    let newSelected = [...selectedItems];

    if (newSelected.includes(item)) {
      newSelected = newSelected.filter((i) => i !== item);
    } else if (newSelected.length < 2) {
      newSelected.push(item);
    }
    setSelectedItems(newSelected);

    if (newSelected.length === 2) {
      setIsProcessing(true);

      const pair1 = newSelected.join("-");
      const pair2 = [...newSelected].reverse().join("-");
      const isCorrect =
        currentGame.answer.includes(pair1) ||
        currentGame.answer.includes(pair2);

      if (isCorrect) {
        const newCompletedPairs = [...completedPairs, ...newSelected];
        setCompletedPairs(newCompletedPairs);
        setScore(score + 2);
        setMessage("Ghép đúng một cặp! +2 điểm");
        setShowMessage(true);

        // Chỉ kết thúc khi hoàn thành hết tất cả các cặp
        if (newCompletedPairs.length === currentGame.data.length) {
          handleCorrectAnswer();
        }
      } else {
        // Chỉ trừ điểm và thông báo khi sai, không kết thúc
        handleWrongAnswer();
      }

      setTimeout(() => {
        setSelectedItems([]);
        setIsProcessing(false);
        setShowMessage(false); // Ẩn thông báo sau khi xử lý
      }, 1000);
    }
  };
  const generateSequence = (baseSequence: string[], type: string) => {
    const numbers = baseSequence.map(Number);
    const lastNum = numbers[numbers.length - 1];
    const result = [];
    let current = lastNum; // Khai báo current ở đây

    switch (type) {
      case "arithmetic": // Cấp số cộng
        const diff = numbers[1] - numbers[0];
        for (let i = 1; i <= 5; i++) {
          result.push(lastNum + diff * i);
        }
        break;

      case "geometric": // Cấp số nhân
        const ratio = 2;
        for (let i = 1; i <= 5; i++) {
          current = current + (current * ratio) / 10;
          result.push(Math.round(current));
        }
        break;

      case "exponential": // Lũy thừa
        for (let i = 1; i <= 5; i++) {
          current = current * 2;
          result.push(current);
        }
        break;

      default: // Một quy luật khác
        for (let i = 1; i <= 5; i++) {
          current = current * 1.5;
          result.push(Math.round(current));
        }
    }

    return result.join(", ");
  };
  const handleCorrectAnswer = () => {
    // Thưởng thêm điểm khi hoàn thành tất cả các cặp
    const bonusPoints = 4; // Điểm thưởng khi hoàn thành
    setScore(score + bonusPoints);
    setMessage(`Hoàn thành! +${bonusPoints} điểm thưởng`);
    setShowMessage(true);
    setShowExplanation(true);

    setTimeout(() => {
      if (currentLevel < shuffledGames.length - 1) {
        setCurrentLevel((prev) => {
          const nextLevel = prev + 1;
          const nextGame = shuffledGames[nextLevel];
          setCurrentGame(nextGame);
          setTimeLeft(nextGame.timeLimit);
          return nextLevel;
        });
        setSelectedItems([]);
        setShowMessage(false);
        setShowExplanation(false);
      } else {
        setResultMessage(
          `Chúc mừng! Bạn đã hoàn thành với ${score + bonusPoints} điểm`
        );
        setShowResultModal(true);
      }
    }, 2000);
  };

  const handleWrongAnswer = () => {
    const penalty = 5;
    setScore(Math.max(0, score - penalty));
    setMessage(`Sai rồi! -${penalty} điểm`);
    setShowMessage(true);
    setShowExplanation(true);
  };

  const renderGameContent = () => {
    if (!currentGame) return null;

    switch (currentGame.type) {
      case "sequence":
        return (
          <div className="space-y-6">
            {/* Hiển thị dãy số gốc */}
            <div className="flex gap-4 justify-center">
              {currentGame.data.map((number, index) => (
                <div
                  key={index}
                  className="p-4 text-xl font-bold bg-gray-100 rounded-xl"
                >
                  {number}
                </div>
              ))}
            </div>

            {/* Các lựa chọn cho số tiếp theo */}
            <div className="grid grid-cols-4 gap-4">
              {/* Tạo 4 lựa chọn bao gồm đáp án đúng và 3 đáp án sai */}
              {[
                currentGame.answer[0], // Đáp án đúng từ data
                generateSequence(currentGame.data, "geometric"), // Dãy sai 1
                generateSequence(currentGame.data, "exponential"), // Dãy sai 2
                generateSequence(currentGame.data, "default"), // Dãy sai 3
              ]
                .sort(() => Math.random() - 0.5) // Xáo trộn các dãy
                .map((sequence, index) => (
                  <button
                    key={index}
                    onClick={() => handleItemClick(sequence)}
                    disabled={
                      selectedItems.includes(sequence) || timeLeft === 0
                    }
                    className={`p-4 text-lg font-bold rounded-xl transition-all 
                    ${
                      selectedItems.includes(sequence)
                        ? "bg-gray-200"
                        : timeLeft === 0
                        ? "bg-gray-300 cursor-not-allowed"
                        : "bg-blue-500 hover:bg-blue-600 text-white"
                    }`}
                  >
                    {sequence}
                  </button>
                ))}
            </div>
          </div>
        );

      case "math":
        return (
          <div className="grid grid-cols-4 gap-4">
            {currentGame.data.map((item, index) => (
              <button
                key={index}
                onClick={() => handleItemClick(item)}
                disabled={selectedItems.includes(item) || timeLeft === 0}
                className={`p-4 text-xl font-bold rounded-xl transition-all
                    ${
                      selectedItems.includes(item)
                        ? "bg-gray-200" // Đã chọn
                        : timeLeft === 0
                        ? "bg-gray-300 cursor-not-allowed" // Hết giờ
                        : "bg-blue-500 hover:bg-blue-600 text-white" // Chưa chọn
                    }`}
              >
                {item}
              </button>
            ))}
          </div>
        );

      case "pairs":
        return (
          <div className="grid grid-cols-4 gap-4">
            {currentGame.data.map((item, index) => (
              <button
                key={index}
                onClick={() => handleItemClick(item)}
                disabled={
                  completedPairs.includes(item) ||
                  timeLeft === 0 ||
                  isProcessing
                }
                className={`p-4 text-xl font-bold rounded-xl transition-all
               ${
                 completedPairs.includes(item)
                   ? "bg-green-200 cursor-not-allowed"
                   : selectedItems.includes(item)
                   ? "bg-yellow-500 text-white"
                   : timeLeft === 0 || isProcessing
                   ? "bg-gray-300 cursor-not-allowed"
                   : "bg-blue-500 hover:bg-blue-600 text-white"
               }`}
              >
                {item}
              </button>
            ))}
          </div>
        );
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
                Trò chơi gồm các thử thách về dãy số, biểu thức và ghép cặp
              </p>
              <div className="space-y-4 mb-6">
                <div>
                  <h4 className="font-semibold text-green-600">Luật chơi:</h4>
                  <p className="text-gray-600">
                    • Điểm cơ bản: 10 điểm/câu đúng
                  </p>
                  <p className="text-gray-600">• Trừ 5 điểm khi trả lời sai</p>
                  <p className="text-gray-600">
                    • Thời gian giới hạn cho mỗi câu
                  </p>
                  <p className="text-gray-600">
                    • Có giải thích sau mỗi câu trả lời
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-blue-600">
                    Các loại câu hỏi:
                  </h4>
                  <p className="text-gray-600">• Dãy số: Tìm số tiếp theo</p>
                  <p className="text-gray-600">
                    • Biểu thức: Tạo biểu thức đúng
                  </p>
                  <p className="text-gray-600">
                    • Ghép cặp: Ghép các số theo quy luật
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
          <h2 className="text-3xl font-bold text-white">Thử thách Tư duy</h2>
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
                Câu: {currentLevel + 1}/{gameData.length}
              </span>
            </div>
          </div>

          {/* Question */}
          {currentGame && !showRules && (
            <div className="mb-8">
              <h3 className="text-xl font-semibold mb-4">
                {currentGame.question}
              </h3>
              {renderGameContent()}
            </div>
          )}

          {/* Message */}
          {showMessage && (
            <div className="text-center animate-bounce mt-4">
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

          {/* Explanation */}
          {showExplanation && currentGame?.explanation && (
            <div className="mt-6 p-4 bg-blue-50 rounded-xl">
              <p className="text-blue-700">{currentGame.explanation}</p>
            </div>
          )}
        </div>
      </div>

      {/* Result Modal */}
      {showResultModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full text-center">
            <div className="text-6xl mb-4 text-green-500">🎉</div>
            <h3 className="text-2xl font-bold mb-4">Hoàn thành!</h3>
            <p className="text-gray-600 mb-6">{resultMessage}</p>
            <button
              onClick={onClose}
              className="w-full py-3 px-4 bg-blue-600 text-white rounded-xl 
                     font-medium hover:bg-blue-700 transition-all"
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LogicGameModal;
