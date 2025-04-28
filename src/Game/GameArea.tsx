import { useEffect, useState } from "react";
import {
  Target,
  Brain,
  Rocket,
  Lock,
  Lightbulb,
  Filter,
  X,
  ImageIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import WordGameModal from "./WordGameModal";
import MemoryGameModal from "./MemoryGameModal";
import QuizGameModal from "./QuizGameModal";
import LogicGameModal from "./LogicGameModal";
import ImageWordMatching from "../learning/ImageWordMatching";
import {
  WordGameData,
  MemoryGameData,
  QuizGameData,
  DATABASE_ID,
  COLLECTIONS,
  RememberGameData,
  LogicGameData,
} from "../type/game";
import { useAuth } from "../contexts/auth/authProvider";
import IntelligenceGameModal from "./RememberGameModal";
import GameDataModal from "./GameDataModal";

interface Game {
  id: number;
  title: string;
  description: string;
  icon: LucideIcon;
  color: string;
  subject: string;
  isLocked: boolean;
  type:
    | "quiz"
    | "memory"
    | "puzzle"
    | "word"
    | "intelligence"
    | "logic"
    | "imageword";
}
interface ImageWordMatchingModalProps {
  onClose: () => void;
}

const ImageWordMatchingModal: React.FC<ImageWordMatchingModalProps> = ({
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-900/80 backdrop-blur-sm">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="relative w-full max-w-6xl rounded-xl bg-white shadow-xl">
          <div className="sticky top-0 z-10 flex items-center justify-between bg-gradient-to-r from-blue-600 to-blue-800 px-6 py-4 text-white">
            <h2 className="text-xl font-semibold">Ghép từ với hình ảnh</h2>
            <button
              onClick={onClose}
              className="rounded-full p-2 hover:bg-white/10"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          <div className="max-h-[80vh] overflow-y-auto p-6">
            <ImageWordMatching onClose={onClose} />
          </div>
        </div>
      </div>
    </div>
  );
};
const initialGames: Game[] = [
  {
    id: 1,
    title: "Ghép từ tiếng Việt",
    description: "Ghép các từ để tạo thành câu có nghĩa",
    icon: Target,
    color: "#58CC02",
    subject: "Tiếng Việt",
    isLocked: false,
    type: "word",
  },
  {
    id: 2,
    title: "Trí nhớ số học",
    description: "Ghi nhớ và ghép các phép tính đúng",
    icon: Brain,
    color: "#FF9600",
    subject: "Toán",
    isLocked: false,
    type: "memory",
  },
  {
    id: 3,
    title: "Câu đố khoa học",
    description: "Giải các câu đố về khoa học tự nhiên",
    icon: Rocket,
    color: "#CE82FF",
    subject: "Khoa học",
    isLocked: false,
    type: "quiz",
  },
  {
    id: 4,
    title: "Thử thách ghi nhớ",
    description: "Rèn luyện khả năng ghi nhớ và ghép số",
    icon: Lightbulb,
    color: "#4B9EFA",
    subject: "Ghi nhớ",
    isLocked: false,
    type: "intelligence",
  },
  {
    id: 5,
    title: "Thử thách Tư duy",
    description: "Rèn luyện tư duy logic qua các câu đố",
    icon: Brain,
    color: "#FF4B4B",
    subject: "Tư duy",
    isLocked: false,
    type: "logic",
  },
  {
    id: 6,
    title: "Ghép từ với hình ảnh",
    description: "Kết nối từ vựng với hình ảnh tương ứng",
    icon: ImageIcon,
    color: "#00C9A7",
    subject: "Từ vựng",
    isLocked: false,
    type: "imageword",
  },
];

const GameArea = () => {
  const [games] = useState<Game[]>(initialGames);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [showGameModal, setShowGameModal] = useState(false);
  const [wordGameData, setWordGameData] = useState<WordGameData[]>([]);
  const [memoryGameData, setMemoryGameData] = useState<MemoryGameData[]>([]);
  const [quizGameData, setQuizGameData] = useState<QuizGameData[]>([]);
  const [intelligenceGameData, setIntelligenceGameData] = useState<
    RememberGameData[]
  >([]);
  const [userRole, setUserRole] = useState<string>("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [logicGameData, setLogicGameData] = useState<LogicGameData[]>([]);
  const { databases, account } = useAuth();
  const [filter, setFilter] = useState<string>("all");

  const filteredGames = games.filter(
    (game) => filter === "all" || game.subject === filter
  );

  const subjects = [...new Set(games.map((game) => game.subject))];

  const handleGameClick = (game: Game) => {
    if (!game.isLocked) {
      setSelectedGame(game);
      setShowGameModal(true);
    }
  };

  const isStaffMember = () => {
    return ["Admin", "Teacher"].includes(userRole);
  };

  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const user = await account.get();
        setUserRole(user.labels?.[0] || "");
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };
    getCurrentUser();
  }, []);
  useEffect(() => {
    const fetchGameData = async () => {
      try {
        const response = await databases.listDocuments(
          DATABASE_ID,
          COLLECTIONS.word
        );
        const wordData = response.documents.map((doc) => ({
          $id: doc.$id,
          words: doc.words,
          correctAnswer: doc.correctAnswer,
          level: doc.level,
        }));
        setWordGameData(wordData);

        const memoryResponse = await databases.listDocuments(
          DATABASE_ID,
          COLLECTIONS.memory
        );
        const memoryData = memoryResponse.documents.map((doc) => ({
          $id: doc.$id,
          equation: doc.equation,
          answer: doc.answer,
          level: doc.level,
        }));
        setMemoryGameData(memoryData);

        const quizResponse = await databases.listDocuments(
          DATABASE_ID,
          COLLECTIONS.quiz
        );
        const quizData = quizResponse.documents.map((doc) => ({
          $id: doc.$id,
          question: doc.question,
          options: doc.options,
          correctAnswer: doc.correctAnswer,
          level: doc.level,
          category: doc.category,
        }));
        setQuizGameData(quizData);

        const intelligenceResponse = await databases.listDocuments(
          DATABASE_ID,
          COLLECTIONS.intelligence
        );
        const intelligenceData = intelligenceResponse.documents.map((doc) => ({
          $id: doc.$id,
          numbers: doc.numbers,
          correctOrder: doc.correctOrder,
          level: doc.level,
          timeLimit: doc.timeLimit,
        }));
        setIntelligenceGameData(intelligenceData);

        const logicResponse = await databases.listDocuments(
          DATABASE_ID,
          COLLECTIONS.logic
        );
        const logicData = logicResponse.documents.map((doc) => ({
          $id: doc.$id,
          type: doc.type,
          question: doc.question,
          data: doc.data,
          answer: doc.answer,
          explanation: doc.explanation,
          level: doc.level,
          timeLimit: doc.timeLimit,
        }));
        setLogicGameData(logicData);
      } catch (error) {
        console.error("Error fetching game data:", error);
      }
    };

    fetchGameData();
  }, [databases]);

  const renderGameModal = (game: Game) => {
    switch (game.type) {
      case "word":
        return (
          <WordGameModal
            onClose={() => setShowGameModal(false)}
            gameData={wordGameData}
          />
        );
      case "memory":
        return (
          <MemoryGameModal
            onClose={() => setShowGameModal(false)}
            gameData={memoryGameData}
          />
        );
      case "quiz":
        return (
          <QuizGameModal
            onClose={() => setShowGameModal(false)}
            gameData={quizGameData}
          />
        );
      case "intelligence":
        return (
          <IntelligenceGameModal
            onClose={() => setShowGameModal(false)}
            gameData={intelligenceGameData}
          />
        );
      case "logic":
        return (
          <LogicGameModal
            onClose={() => setShowGameModal(false)}
            gameData={logicGameData}
          />
        );
      case "imageword":
        return (
          <ImageWordMatchingModal onClose={() => setShowGameModal(false)} />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="bg-blue-600 text-white py-16">
        <div className="max-w-6xl mx-auto px-4">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl font-bold mb-4 text-center"
          >
            Khám Phá Học Tập Qua Trò Chơi
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl text-center text-blue-100"
          >
            Học tập chưa bao giờ thú vị đến thế!
          </motion.p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Filter className="w-5 h-5" />
            <div className="flex gap-2">
              <button
                onClick={() => setFilter("all")}
                className={`px-4 py-2 rounded-full text-sm ${
                  filter === "all"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 hover:bg-gray-200"
                }`}
              >
                Tất cả
              </button>
              {subjects.map((subject) => (
                <button
                  key={subject}
                  onClick={() => setFilter(subject)}
                  className={`px-4 py-2 rounded-full text-sm ${
                    filter === subject
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 hover:bg-gray-200"
                  }`}
                >
                  {subject}
                </button>
              ))}
            </div>
          </div>
          {isStaffMember() && (
            <button
              onClick={() => setShowAddModal(true)}
              className="px-6 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 
                     transition-colors duration-300 flex items-center gap-2"
            >
              <span>Thêm dữ liệu</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredGames.map((game) => (
            <motion.div
              key={game.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ y: -8 }}
              className={`bg-white rounded-2xl overflow-hidden shadow-lg ${
                !game.isLocked ? "cursor-pointer" : "opacity-75"
              }`}
              onClick={() => !game.isLocked && handleGameClick(game)}
            >
              <div
                className="h-48 relative overflow-hidden"
                style={{
                  backgroundColor: game.isLocked
                    ? "#f3f4f6"
                    : `${game.color}15`,
                }}
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  {game.isLocked ? (
                    <Lock className="w-16 h-16 text-gray-400" />
                  ) : (
                    <game.icon
                      className="w-24 h-24 transition-transform duration-300 transform group-hover:scale-110"
                      style={{ color: game.color }}
                    />
                  )}
                </div>
                <div className="absolute top-4 right-4">
                  <span
                    className="px-3 py-1 rounded-full text-sm"
                    style={{ backgroundColor: game.color, color: "white" }}
                  >
                    {game.subject}
                  </span>
                </div>
              </div>

              <div className="p-6">
                <h3 className="text-2xl font-bold text-gray-800 mb-2">
                  {game.title}
                </h3>
                <p className="text-gray-600">{game.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {showAddModal && <GameDataModal onClose={() => setShowAddModal(false)} />}
      {showGameModal && selectedGame && (
        <div className="fixed inset-0 z-50">
          {renderGameModal(selectedGame)}
        </div>
      )}
    </div>
  );
};

export default GameArea;
