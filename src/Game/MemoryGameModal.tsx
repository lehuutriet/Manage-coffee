import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { MemoryGameData } from "../type/game";

interface MemoryGameModalProps {
  onClose: () => void;
  gameData: MemoryGameData[];
}

const MemoryGameModal: React.FC<MemoryGameModalProps> = ({
  onClose,
  gameData,
}) => {
  const [score, setScore] = useState(0);
  const [currentLevel, setCurrentLevel] = useState(0);
  const [showEquation, setShowEquation] = useState(true);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answers, setAnswers] = useState<string[]>([]);
  const [showResultModal, setShowResultModal] = useState(false);
  const [resultMessage, setResultMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [randomizedQuestions, setRandomizedQuestions] = useState<
    MemoryGameData[]
  >([]);

  const initGame = () => {
    const shuffledQuestions = shuffleArray([...gameData]);
    setRandomizedQuestions(shuffledQuestions);
    setShowEquation(true);
    setScore(0);
    setCurrentLevel(0);
    setSelectedAnswer(null);
    setShowResultModal(false);

    const correctAnswer = shuffledQuestions[0].answer;
    const wrongAnswers = generateWrongAnswers(parseInt(correctAnswer));
    const allAnswers = shuffleArray([
      correctAnswer,
      ...wrongAnswers.slice(0, 3),
    ]);
    setAnswers(allAnswers);

    setTimeout(() => {
      setShowEquation(false);
    }, 3000);
  };

  useEffect(() => {
    if (gameData.length > 0) {
      initGame();
    }
  }, []);
  const convertOperator = (equation: string) => {
    return equation.replace(/\*/g, "×").replace(/\//g, "÷");
  };
  useEffect(() => {
    if (
      randomizedQuestions.length > 0 &&
      currentLevel < randomizedQuestions.length
    ) {
      const correctAnswer = randomizedQuestions[currentLevel].answer;
      const wrongAnswers = generateWrongAnswers(parseInt(correctAnswer));
      const allAnswers = shuffleArray([
        correctAnswer,
        ...wrongAnswers.slice(0, 3),
      ]);
      setAnswers(allAnswers);
      setShowEquation(true);

      const timer = setTimeout(() => {
        setShowEquation(false);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [currentLevel, randomizedQuestions]);

  const handleAnswerSelect = (answer: string) => {
    setSelectedAnswer(answer);
    const isCorrect = answer === randomizedQuestions[currentLevel].answer;

    setTimeout(() => {
      if (isCorrect) {
        setScore(score + 10);
        if (currentLevel < randomizedQuestions.length - 1) {
          setCurrentLevel((prev) => prev + 1);
          setSelectedAnswer(null);
        } else {
          setIsSuccess(true);
          setResultMessage(
            `Chúc mừng! Bạn đã hoàn thành với số điểm: ${score + 10}`
          );
          setShowResultModal(true);
        }
      } else {
        setIsSuccess(false);
        setResultMessage("Rất tiếc! Bạn đã trả lời sai.");
        setShowResultModal(true);
      }
    }, 1000);
  };

  const generateWrongAnswers = (correct: number): string[] => {
    const wrong = [];
    for (let i = -2; i <= 2; i++) {
      if (i !== 0) {
        wrong.push((correct + i).toString());
      }
    }
    return wrong;
  };

  const shuffleArray = <T,>(array: T[]): T[] => {
    return [...array].sort(() => Math.random() - 0.5);
  };

  const resetGame = () => {
    initGame();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden transform transition-all">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6 flex justify-between items-center">
          <h2 className="text-3xl font-bold text-white">Trí nhớ số học</h2>
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
                Câu {currentLevel + 1}/{randomizedQuestions.length}
              </span>
            </div>
          </div>

          {/* Equation Display */}
          <div className="flex justify-center mb-8">
            <div className="text-4xl font-bold p-8 bg-gradient-to-r from-purple-100 to-blue-100 rounded-2xl shadow-lg">
              {showEquation && randomizedQuestions[currentLevel]?.equation
                ? convertOperator(
                    randomizedQuestions[currentLevel]?.equation || ""
                  )
                : "?"}
            </div>
          </div>

          {/* Answer Options */}
          <div className="grid grid-cols-2 gap-4 max-w-2xl mx-auto mb-8">
            {answers.map((answer, index) => (
              <button
                key={index}
                onClick={() => handleAnswerSelect(answer)}
                disabled={selectedAnswer !== null}
                className={`p-6 text-2xl font-medium rounded-xl transition-all transform hover:-translate-y-1
                  ${
                    selectedAnswer === answer
                      ? answer === randomizedQuestions[currentLevel].answer
                        ? "bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg"
                        : "bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg"
                      : "bg-gradient-to-r from-purple-500 to-purple-600 text-white hover:from-purple-600 hover:to-purple-700 shadow-md hover:shadow-lg"
                  }
                  disabled:opacity-75 disabled:cursor-not-allowed`}
              >
                {answer}
              </button>
            ))}
          </div>

          {/* Game Progress Indicator */}
          <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
            <div
              className="bg-gradient-to-r from-purple-600 to-blue-600 h-2 rounded-full transition-all duration-300"
              style={{
                width: `${
                  ((currentLevel + 1) / randomizedQuestions.length) * 100
                }%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Result Modal */}
      {showResultModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full text-center shadow-xl">
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

export default MemoryGameModal;
