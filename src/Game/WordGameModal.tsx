import { useState, useEffect } from "react";
import { X, RefreshCw } from "lucide-react";
import { WordGameData } from "../type/game";
interface WordGameModalProps {
  onClose: () => void;
  gameData: WordGameData[];
}

const WordGameModal: React.FC<WordGameModalProps> = ({ onClose, gameData }) => {
  const [score, setScore] = useState(0);
  const [currentLevel, setCurrentLevel] = useState(0);
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [showMessage, setShowMessage] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  // Sử dụng gameData thay vì data cứng
  const [currentWords, setCurrentWords] = useState<string[]>([]);
  const [randomizedQuestions, setRandomizedQuestions] = useState<
    WordGameData[]
  >([]);

  // Thêm useEffect để xáo trộn câu hỏi khi component mount
  useEffect(() => {
    if (gameData) {
      // Tạo bản sao của gameData và xáo trộn
      const shuffledQuestions = [...gameData].sort(() => Math.random() - 0.5);
      setRandomizedQuestions(shuffledQuestions);
    }
  }, [gameData]);

  // Xáo trộn từ ngẫu nhiên
  const shuffleWords = (words: string[]) => {
    return [...words].sort(() => Math.random() - 0.5);
  };
  // Trong WordGameModal.tsx
  // Sửa lại các đoạn code dùng gameData thành randomizedQuestions
  useEffect(() => {
    if (randomizedQuestions && currentLevel < randomizedQuestions.length) {
      const wordsToShow =
        randomizedQuestions[currentLevel].level === 1
          ? 4
          : randomizedQuestions[currentLevel].level === 2
          ? 8
          : 12;

      const separatedWords = randomizedQuestions[currentLevel].words
        .slice(0, wordsToShow)
        .map((word) =>
          word
            .replace(/([A-Z])/g, " $1")
            .trim()
            .toLowerCase()
        );
      setCurrentWords(shuffleWords(separatedWords));
    }
  }, [currentLevel, randomizedQuestions]);

  const handleWordClick = (word: string) => {
    if (!selectedWords.includes(word)) {
      setSelectedWords([...selectedWords, word]);
    }
  };

  const handleRemoveWord = (index: number) => {
    const newSelected = selectedWords.filter((_, i) => i !== index);
    setSelectedWords(newSelected);
  };

  const checkAnswer = () => {
    if (isChecking) return;
    setIsChecking(true);

    const userAnswer = selectedWords.join(" ");
    const correctAnswer = randomizedQuestions[currentLevel].correctAnswer
      .replace(/([A-Z])/g, " $1")
      .toLowerCase()
      .trim();

    if (userAnswer === correctAnswer) {
      setScore(score + 10);
      setMessage("Chính xác! +10 điểm");
      setShowMessage(true);
      setTimeout(() => {
        setShowMessage(false);
        if (currentLevel < randomizedQuestions.length - 1) {
          setCurrentLevel(currentLevel + 1);
          setSelectedWords([]);
          setIsChecking(false);
        } else {
          setMessage("Chúc mừng! Bạn đã hoàn thành tất cả các câu!");
          setShowMessage(true);
        }
      }, 1500);
    } else {
      setMessage("Sai rồi! Hãy thử lại");
      setShowMessage(true);
      setTimeout(() => {
        setShowMessage(false);
        setIsChecking(false);
      }, 1500);
    }
  };
  const resetCurrentLevel = () => {
    setSelectedWords([]);
    if (gameData && currentLevel < gameData.length) {
      setCurrentWords(shuffleWords(gameData[currentLevel].words));
    }
  };
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden transform transition-all">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6 flex justify-between items-center">
          <h2 className="text-3xl font-bold text-white">Ghép từ tiếng Việt</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        <div className="p-8">
          {/* Score and Level Section */}
          <div className="flex justify-between items-center mb-8 px-4">
            <div className="bg-purple-50 px-6 py-3 rounded-full">
              <span className="text-purple-700 font-semibold text-lg">
                Điểm: {score}
              </span>
            </div>
            <div className="bg-blue-50 px-6 py-3 rounded-full">
              <span className="text-blue-700 font-semibold">
                Câu {currentLevel + 1}/{gameData.length}
              </span>
            </div>
          </div>

          {/* Message Display */}
          {showMessage && (
            <div className={`text-center animate-bounce mb-6`}>
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

          {/* Selected Words Area */}
          <div className="mb-8 p-6 min-h-[80px] bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl flex flex-wrap gap-2">
            {selectedWords.map((word, index) => (
              <div
                key={index}
                onClick={() => handleRemoveWord(index)}
                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg cursor-pointer 
                         hover:from-blue-600 hover:to-blue-700 transition-all transform hover:-translate-y-1 
                         shadow-md hover:shadow-lg"
              >
                {word}
              </div>
            ))}
          </div>

          {/* Available Words */}
          <div className="flex flex-wrap gap-3 justify-center mb-8">
            {currentWords.map((word, index) => (
              <div
                key={index}
                onClick={() => handleWordClick(word)}
                className={`px-5 py-3 rounded-xl cursor-pointer transition-all transform hover:-translate-y-1
                  ${
                    selectedWords.includes(word)
                      ? "opacity-40 bg-gray-100"
                      : "bg-gradient-to-r from-purple-500 to-purple-600 text-white hover:from-purple-600 hover:to-purple-700 shadow-md hover:shadow-lg"
                  }`}
              >
                {word}
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-center gap-4">
            <button
              onClick={resetCurrentLevel}
              className="px-6 py-3 bg-gray-100 rounded-xl hover:bg-gray-200 transition-all transform hover:-translate-y-1
                       flex items-center gap-2 shadow-md hover:shadow-lg"
            >
              <RefreshCw className="w-5 h-5 text-gray-700" />
              <span className="font-medium text-gray-700">Làm lại</span>
            </button>
            <button
              onClick={checkAnswer}
              disabled={isChecking}
              className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl
                       hover:from-blue-700 hover:to-blue-800 transition-all transform hover:-translate-y-1
                       shadow-md hover:shadow-lg font-medium"
            >
              Kiểm tra
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WordGameModal;
