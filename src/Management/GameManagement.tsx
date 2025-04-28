import { useState, useEffect } from "react";
import { Edit2, Trash2, Plus, Save, X, AlertCircle } from "lucide-react";
import { useAuth } from "../contexts/auth/authProvider";
import { ID } from "appwrite";
import { toast } from "react-hot-toast";
import { LogicGameData } from "../type/game";

// Interface cho từng loại game
interface WordGameData {
  $id: string;
  words: string[];
  correctAnswer: string;
  level: number;
}

interface MemoryGameData {
  $id: string;
  equation: string;
  answer: string;
  level: number;
}

interface QuizGameData {
  $id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  level: number;
  category: string;
}
interface IntelligenceGameData {
  $id: string;
  numbers: number[];
  correctOrder: number[];
  level: number;
  timeLimit: number;
}

const GameManagement = () => {
  const { databases } = useAuth();
  const [gameType, setGameType] = useState<
    "word" | "memory" | "quiz" | "intelligence" | "logic"
  >("word");

  // State riêng cho từng loại game
  const [wordGames, setWordGames] = useState<WordGameData[]>([]);
  const [memoryGames, setMemoryGames] = useState<MemoryGameData[]>([]);
  const [quizGames, setQuizGames] = useState<QuizGameData[]>([]);
  const [logicGames, setLogicGames] = useState<LogicGameData[]>([]);
  const [intelligenceGames, setIntelligenceGames] = useState<
    IntelligenceGameData[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [idToDelete, setIdToDelete] = useState<string | null>(null);
  // Form state
  const [formData, setFormData] = useState<any>({
    level: 1,
    words: Array(4).fill(""), // Mặc định 4 từ cho cấp độ cơ bản
    correctAnswer: "",
    firstNumber: "",
    operators: Array(3).fill("+"), // mảng chứa các phép tính (+, -, ×, ÷)
    numbers: [], // mảng chứa các số tiếp theo
    question: "",
    options: ["", "", "", ""],
    correctAnswerIndex: 0,
    equation: "",
    answer: "",
    category: "",

    operator: "+",
    secondNumber: "",
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  // Database config
  const DATABASE_ID = "674e5e7a0008e19d0ef0";
  const COLLECTIONS = {
    word: "6789dfaa000bb6b7ace9",
    memory: "6789dfb10025bb05631a",
    quiz: "6789dfb80024b84acbb4",
    intelligence: "678f010e002c5c4d844c",
    logic: "678f26b00005b0c70011",
  };

  useEffect(() => {
    fetchGameData();
  }, [gameType]);

  // Thêm hàm xử lý khi thay đổi level trong form word game
  const handleLevelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const level = Number(e.target.value);
    const wordCount = level === 1 ? 4 : level === 2 ? 8 : 12;

    setFormData({
      ...formData,
      level: level,
      words: Array(wordCount).fill(""), // Tạo mảng mới với số từ tương ứng
    });
  };
  // Fetch data theo loại game
  const fetchGameData = async () => {
    setIsLoading(true);
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS[gameType]
      );

      switch (gameType) {
        case "word":
          const wordData = response.documents.map((doc) => ({
            $id: doc.$id,
            words: doc.words,
            correctAnswer: doc.correctAnswer,
            level: doc.level,
          }));
          setWordGames(wordData);
          break;

        case "memory":
          const memoryData = response.documents.map((doc) => ({
            $id: doc.$id,
            equation: doc.equation,
            answer: doc.answer,
            level: doc.level,
          }));
          setMemoryGames(memoryData);
          break;

        case "quiz":
          const quizData = response.documents.map((doc) => ({
            $id: doc.$id,
            question: doc.question,
            options: doc.options,
            correctAnswer: doc.correctAnswer,
            category: doc.category,
            level: doc.level,
          }));
          setQuizGames(quizData);
          break;
        case "intelligence": {
          const intelligenceData = response.documents.map((doc) => ({
            $id: doc.$id,
            numbers: doc.numbers,
            correctOrder: doc.correctOrder,
            level: doc.level,
            timeLimit: doc.timeLimit,
          }));
          setIntelligenceGames(intelligenceData);
          break;
        }
        case "logic": {
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
          setLogicGames(logicData);
          break;
        }
      }
    } catch (error) {
      toast.error("Lỗi khi tải dữ liệu");
    } finally {
      setIsLoading(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      level: 1,
      words: Array(4).fill(""),
      correctAnswer: "",
      question: "",
      options: ["", "", "", ""],
      correctAnswerIndex: 0,
      equation: "",
      answer: [], // Khởi tạo là mảng rỗng thay vì ""
      category: "",
      firstNumber: "",
      operator: "+",
      secondNumber: "",
      numberCount: 9,
      timeLimit: 60,
      operators: Array(3).fill("+"),
      numbers: Array(3).fill(""),
      type: "sequence", // Thêm type mặc định là dãy số
      data: [],
      explanation: "",
    });
    setEditingId(null);
    setError("");
  };

  // Form validation
  const validateForm = () => {
    if (gameType === "word") {
      if (formData.words.some((w: string) => !w.trim())) {
        setError("Vui lòng điền đầy đủ các từ");
        return false;
      }
      if (!formData.correctAnswer) {
        setError("Vui lòng nhập đáp án đúng");
        return false;
      }
    }

    if (gameType === "memory") {
      if (
        !formData.firstNumber ||
        !formData.operators ||
        formData.operators.length === 0 ||
        formData.numbers?.length === 0
      ) {
        setError("Vui lòng điền đầy đủ phép tính");
        return false;
      }
    }
    if (gameType === "quiz") {
      if (!formData.question) {
        setError("Vui lòng nhập câu hỏi");
        return false;
      }
      if (formData.options.some((opt: string) => !opt.trim())) {
        setError("Vui lòng điền đầy đủ các phương án");
        return false;
      }
    }

    return true;
  };

  // Submit form
  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      let data;
      if (gameType === "memory") {
        data = {
          equation: `${formData.firstNumber} ${formData.operator} ${formData.secondNumber}`,
          answer: formData.answer,
          level: Number(formData.level),
        };
      }
      switch (gameType) {
        // Trong switch case memory của hàm handleSubmit
        case "memory": {
          let equation = formData.firstNumber;
          for (let i = 0; i < formData.operators.length; i++) {
            if (formData.numbers[i]) {
              let operator = formData.operators[i];
              // Convert dấu về dạng lưu DB
              if (operator === "×") operator = "*";
              if (operator === "÷") operator = "/";
              equation += ` ${operator} ${formData.numbers[i]}`;
            }
          }

          data = {
            equation: equation,
            answer: formData.answer,
            level: Number(formData.level),
          };
          break;
        }

        case "word": {
          const formattedAnswer = formData.correctAnswer
            .split(/\s+/)
            .join(" ")
            .trim();
          data = {
            words: formData.words,
            correctAnswer: formattedAnswer,
            level: Number(formData.level),
          };
          break;
        }

        case "quiz": {
          data = {
            question: formData.question,
            options: formData.options,
            correctAnswer: formData.correctAnswerIndex,
            category: formData.category,
            level: Number(formData.level),
          };
          break;
        }
        case "intelligence": {
          data = {
            numbers: Array.from(
              { length: formData.numberCount || 9 },
              (_, i) => (i + 1).toString() // Chuyển số thành chuỗi
            ).sort(() => Math.random() - 0.5),
            correctOrder: Array.from(
              { length: formData.numberCount || 9 },
              (_, i) => (i + 1).toString() // Chuyển số thành chuỗi
            ),
            level: Number(formData.level),
            timeLimit: formData.timeLimit,
          };
          break;
        }
        case "logic": {
          data = {
            type: formData.type,
            question: formData.question,
            data: formData.data,
            answer: formData.answer,
            explanation: formData.explanation,
            level: Number(formData.level),
            timeLimit: Number(formData.timeLimit),
          };
          break;
        }
      }

      if (data) {
        // Thêm kiểm tra data không undefined
        if (editingId) {
          await databases.updateDocument(
            DATABASE_ID,
            COLLECTIONS[gameType],
            editingId,
            data
          );
          toast.success("Cập nhật thành công!");
        } else {
          await databases.createDocument(
            DATABASE_ID,
            COLLECTIONS[gameType],
            ID.unique(),
            data
          );
          toast.success("Thêm mới thành công!");
        }
      }

      setShowModal(false);
      resetForm();
      fetchGameData();
    } catch (error) {
      toast.error("Có lỗi xảy ra");
      console.log(error);
    }
  };
  // Delete game data
  const handleDelete = (id: string) => {
    setIdToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!idToDelete) return;

    try {
      await databases.deleteDocument(
        DATABASE_ID,
        COLLECTIONS[gameType],
        idToDelete
      );
      toast.success("Xóa thành công!");
      fetchGameData();
    } catch (error) {
      toast.error("Lỗi khi xóa");
    } finally {
      setIsDeleteModalOpen(false);
      setIdToDelete(null);
    }
  };

  // Edit game data
  const handleEdit = (
    data:
      | WordGameData
      | MemoryGameData
      | QuizGameData
      | IntelligenceGameData
      | LogicGameData
  ) => {
    if (gameType === "memory") {
      const parts = (data as MemoryGameData).equation.split(" ");
      const numbers = [];
      const operators = parts
        .filter((_, i) => i % 2 === 1) // Lấy các phần tử ở vị trí lẻ (operators)
        .map((op) => {
          // Convert dấu cho đúng format
          if (op === "*") return "×";
          if (op === "/") return "÷";
          return op;
        });

      const numbersArr = parts.filter((_, i) => i % 2 === 0); // Lấy các số
      const firstNumber = numbersArr[0];
      numbers.push(...numbersArr.slice(1));

      setFormData({
        ...data,
        firstNumber,
        operators,
        numbers,
        level: (data as MemoryGameData).level,
      });
    } else if (gameType === "quiz") {
      // Thêm correctAnswerIndex từ data
      setFormData({
        ...data,
        correctAnswerIndex: (data as QuizGameData).correctAnswer, // Thêm dòng này
        level: (data as QuizGameData).level,
      });
    } else if (gameType === "intelligence") {
      // Logic xử lý cho intelligence game
      setFormData({
        ...data,
        level: (data as IntelligenceGameData).level,
        numberCount: (data as IntelligenceGameData).numbers.length, // Thêm dòng này
        timeLimit: (data as IntelligenceGameData).timeLimit,
      });
    } else if (gameType === "logic") {
      setFormData({
        ...data,
        answer: (data as LogicGameData).answer, // Đảm bảo lấy đáp án từ data
        level: (data as LogicGameData).level, // Đảm bảo lấy cấp độ từ data
      });
    } else {
      setFormData(data);
    }
    setEditingId(data.$id);
    setShowModal(true);
  };
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="p-6">
        <h2 className="text-xl font-semibold text-gray-900">
          Quản lý trò chơi
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Quản lý dữ liệu cho các trò chơi học tập
        </p>

        {/* Game type tabs */}
        <div className="mt-6 flex space-x-4">
          <button
            onClick={() => setGameType("word")}
            className={`px-4 py-2 rounded-lg ${
              gameType === "word"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Ghép từ
          </button>
          <button
            onClick={() => setGameType("memory")}
            className={`px-4 py-2 rounded-lg ${
              gameType === "memory"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Trí nhớ số học
          </button>
          <button
            onClick={() => setGameType("quiz")}
            className={`px-4 py-2 rounded-lg ${
              gameType === "quiz"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Câu đố
          </button>
          <button
            onClick={() => setGameType("intelligence")}
            className={`px-4 py-2 rounded-lg ${
              gameType === "intelligence"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Thử thách ghi nhớ
          </button>
          <button
            onClick={() => setGameType("logic")}
            className={`px-4 py-2 rounded-lg ${
              gameType === "logic"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Thử thách Tư duy
          </button>
        </div>

        {/* Add button */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Thêm mới
          </button>
        </div>

        {/* Data tables */}
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : (
          <div className="mt-6">
            {/* Word game table */}
            {gameType === "word" && (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Các từ
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Đáp án
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Cấp độ
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {wordGames.map((game) => (
                    <tr key={game.$id}>
                      <td className="px-6 py-4">{game.words.join(", ")}</td>
                      <td className="px-6 py-4">{game.correctAnswer}</td>
                      <td className="px-6 py-4">
                        {game.level === 1
                          ? "Cơ bản"
                          : game.level === 2
                          ? "Trung bình"
                          : "Nâng cao"}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleEdit(game)}
                          className="text-blue-600 hover:text-blue-800 mx-2"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(game.$id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Memory game table */}
            {gameType === "memory" && (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Phép tính
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Kết quả
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Cấp độ
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {memoryGames.map((game) => (
                    <tr key={game.$id}>
                      <td className="px-6 py-4">
                        {game.equation?.replace(/undefined/g, "") ||
                          "Không có dữ liệu"}
                      </td>
                      <td className="px-6 py-4">{game.answer}</td>
                      <td className="px-6 py-4">
                        {game.level === 1
                          ? "Cơ bản"
                          : game.level === 2
                          ? "Trung bình"
                          : "Nâng cao"}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleEdit(game)}
                          className="text-blue-600 hover:text-blue-800 mx-2"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(game.$id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Quiz game table */}
            {gameType === "quiz" && (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Câu hỏi
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Phân loại
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Cấp độ
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {quizGames.map((game) => (
                    <tr key={game.$id}>
                      <td className="px-6 py-4">{game.question}</td>
                      <td className="px-6 py-4">{game.category}</td>
                      <td className="px-6 py-4">
                        {game.level === 1
                          ? "Cơ bản"
                          : game.level === 2
                          ? "Trung bình"
                          : "Nâng cao"}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleEdit(game)}
                          className="text-blue-600 hover:text-blue-800 mx-2"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(game.$id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {gameType === "intelligence" && (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Số lượng số
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Thời gian
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Cấp độ
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {intelligenceGames.map((game) => (
                    <tr key={game.$id}>
                      <td className="px-6 py-4">{game.numbers.length}</td>
                      <td className="px-6 py-4">{game.timeLimit}s</td>
                      <td className="px-6 py-4">
                        {game.level === 1
                          ? "Cơ bản"
                          : game.level === 2
                          ? "Trung bình"
                          : "Nâng cao"}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleEdit(game)}
                          className="text-blue-600 hover:text-blue-800 mx-2"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(game.$id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {gameType === "logic" && (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Loại
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Câu hỏi
                    </th>

                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {logicGames.map((game) => (
                    <tr key={game.$id}>
                      <td className="px-6 py-4">
                        {game.type === "sequence"
                          ? "Dãy số"
                          : game.type === "math"
                          ? "Biểu thức"
                          : "Ghép cặp"}
                      </td>
                      <td className="px-6 py-4">{game.question}</td>

                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleEdit(game)}
                          className="text-blue-600 hover:text-blue-800 mx-2"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(game.$id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Modal form thêm/sửa */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl max-w-xl w-full mx-4">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-xl font-semibold">
                {editingId ? "Chỉnh sửa" : "Thêm mới"}{" "}
                {gameType === "word"
                  ? "g  hép từ"
                  : gameType === "memory"
                  ? "trí nhớ số học"
                  : gameType === "quiz"
                  ? "câu đố"
                  : gameType === "intelligence"
                  ? "thử thách ghi nhớ"
                  : "trí nhớ số học"}
              </h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <p className="text-red-600">{error}</p>
              </div>
            )}

            <div className="p-6 space-y-6">
              {/* Cấp độ chung cho tất cả game */}

              {/* Form ghép từ */}
              {gameType === "word" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cấp độ
                    </label>
                    <select
                      value={formData.level}
                      onChange={handleLevelChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value={1}>Cơ bản</option>
                      <option value={2}>Trung bình</option>
                      <option value={3}>Nâng cao</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Các từ ghép
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      {formData.words.map((word: string, index: number) => (
                        <input
                          key={index}
                          type="text"
                          value={word}
                          onChange={(e) => {
                            const newWords = [...formData.words];
                            newWords[index] = e.target.value;
                            setFormData({ ...formData, words: newWords });
                          }}
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder={`Từ ${index + 1}`}
                        />
                      ))}
                    </div>
                  </div>{" "}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Đáp án đúng
                    </label>
                    <input
                      type="text"
                      value={formData.correctAnswer}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          correctAnswer: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Nhập câu đúng khi ghép các từ"
                    />
                  </div>
                </>
              )}

              {/* Form trí nhớ số học */}
              {gameType === "memory" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cấp độ
                    </label>
                    <select
                      value={formData.level}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          level: Number(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value={1}>Cơ bản (1 phép tính)</option>
                      <option value={2}>Trung bình (2 phép tính)</option>
                      <option value={3}>Nâng cao (3 phép tính trở lên)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Xây dựng phép tính
                    </label>

                    <div className="flex flex-wrap gap-2">
                      {/* Số đầu tiên */}
                      <input
                        type="number"
                        value={formData.firstNumber}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            firstNumber: e.target.value,
                          })
                        }
                        className="w-24 px-3 py-2 border border-gray-300 rounded-lg"
                        placeholder="Số"
                      />

                      {/* Lặp lại cho số phép tính tương ứng với level */}
                      {Array.from({ length: formData.level * 2 }).map(
                        (_, index) =>
                          index % 2 === 0 ? (
                            // Select cho phép tính
                            <select
                              key={index}
                              value={formData.operators[index / 2]}
                              onChange={(e) => {
                                const newOperators = [...formData.operators];
                                newOperators[index / 2] = e.target.value;
                                setFormData({
                                  ...formData,
                                  operators: newOperators,
                                });
                              }}
                              className="w-20 px-3 py-2 border border-gray-300 rounded-lg"
                            >
                              <option value="+">+</option>
                              <option value="-">-</option>
                              <option value="×">×</option>
                              <option value="÷">÷</option>
                            </select>
                          ) : (
                            // Input cho số tiếp theo
                            <input
                              key={index}
                              type="number"
                              value={formData.numbers?.[(index - 1) / 2] || ""}
                              onChange={(e) => {
                                const newNumbers = [
                                  ...(formData.numbers || []),
                                ];
                                newNumbers[(index - 1) / 2] = e.target.value;
                                setFormData({
                                  ...formData,
                                  numbers: newNumbers,
                                });
                              }}
                              className="w-24 px-3 py-2 border border-gray-300 rounded-lg"
                              placeholder="Số"
                            />
                          )
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Kết quả
                    </label>
                    <input
                      type="number"
                      value={formData.answer}
                      onChange={(e) =>
                        setFormData({ ...formData, answer: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="Nhập kết quả của phép tính"
                    />
                  </div>
                </>
              )}
              {/* Form câu đố */}
              {gameType === "quiz" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cấp độ
                    </label>
                    <select
                      value={formData.level}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          level: Number(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value={1}>Cơ bản</option>
                      <option value={2}>Trung bình</option>
                      <option value={3}>Nâng cao</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Câu hỏi
                    </label>
                    <input
                      type="text"
                      value={formData.question}
                      onChange={(e) =>
                        setFormData({ ...formData, question: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Nhập câu hỏi"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phân loại
                    </label>
                    <input
                      type="text"
                      value={formData.category}
                      onChange={(e) =>
                        setFormData({ ...formData, category: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Nhập phân loại câu hỏi"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Các phương án
                    </label>
                    {formData.options.map((option: string, index: number) => (
                      <div key={index} className="mb-2">
                        <input
                          type="text"
                          value={option}
                          onChange={(e) => {
                            const newOptions = [...formData.options];
                            newOptions[index] = e.target.value;
                            setFormData({ ...formData, options: newOptions });
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder={`Phương án ${index + 1}`}
                        />
                      </div>
                    ))}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Đáp án đúng
                    </label>
                    <select
                      value={formData.correctAnswerIndex}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          correctAnswerIndex: Number(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      {formData.options.map((_: string, index: number) => (
                        <option key={index} value={index}>
                          Phương án {index + 1}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}
              {/* Form trò chơi Thử thách ghi nhớ */}
              {gameType === "intelligence" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cấp độ
                    </label>
                    <select
                      value={formData.level}
                      onChange={(e) => {
                        const level = Number(e.target.value);
                        const timeLimit =
                          level === 1 ? 60 : level === 2 ? 45 : 30;
                        setFormData({
                          ...formData,
                          level: level,
                          timeLimit: timeLimit,
                        });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value={1}>Cơ bản (60 giây)</option>
                      <option value={2}>Trung bình (45 giây)</option>
                      <option value={3}>Nâng cao (30 giây)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Số lượng số
                    </label>
                    <input
                      type="number"
                      min={4}
                      max={12}
                      value={formData.numberCount || 9}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          numberCount: Number(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Nhập số lượng số (4-12)"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Thời gian (giây)
                    </label>
                    <input
                      type="number"
                      value={formData.timeLimit}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                    />
                  </div>
                </>
              )}
              {gameType === "logic" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Loại
                    </label>

                    <select
                      value={formData.type}
                      onChange={(e) => {
                        // Reset form data khi đổi type
                        setFormData({
                          ...formData,
                          type: e.target.value,
                          data: [], // Reset data
                          answer: [], // Reset answer
                          question: "", // Reset question
                          explanation: "", // Reset explanation
                        });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="sequence">Dãy số</option>
                      <option value="math">Biểu thức</option>
                      <option value="pairs">Ghép cặp</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Câu hỏi
                    </label>
                    <input
                      type="text"
                      value={formData.question}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          question: e.target.value,
                        })
                      }
                      placeholder={
                        formData.type === "sequence"
                          ? "Ví dụ: Hãy tìm số tiếp theo trong dãy số..."
                          : formData.type === "math"
                          ? "Ví dụ: Tìm phép tính phù hợp để..."
                          : "Ví dụ: Hãy ghép các số thành cặp sao cho..."
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Dữ liệu (phân cách bằng dấu phẩy)
                    </label>
                    <input
                      type="text"
                      value={
                        Array.isArray(formData.data)
                          ? formData.data.join(",")
                          : ""
                      }
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          data: e.target.value.split(","),
                        })
                      }
                      placeholder={
                        formData.type === "sequence"
                          ? "Ví dụ: 2,4,6,8 (các số trong dãy)"
                          : formData.type === "math"
                          ? "Ví dụ: 2,+,4,=,6 (các số và phép tính)"
                          : "Ví dụ: 1,2,3,4,5,6 (các số cần ghép cặp)"
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Đáp án
                    </label>
                    <input
                      type="text"
                      value={formData.answer}
                      onChange={(e) => {
                        let answer;
                        // Xử lý đáp án theo từng loại
                        if (formData.type === "sequence") {
                          // Với dãy số, lưu một số duy nhất
                          answer = [e.target.value];
                        } else if (formData.type === "math") {
                          // Với biểu thức, lưu cả biểu thức
                          answer = [e.target.value];
                        } else {
                          // Với ghép cặp, tách các cặp bằng dấu phẩy
                          answer = e.target.value
                            .split(",")
                            .map((pair) => pair.trim());
                        }
                        setFormData({
                          ...formData,
                          answer: answer,
                        });
                      }}
                      placeholder={
                        formData.type === "sequence"
                          ? "Nhập số tiếp theo của dãy"
                          : formData.type === "math"
                          ? "Nhập biểu thức đúng (vd: 2+3=5)"
                          : "Nhập các cặp số (vd: 1-2,3-4,5-6)"
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Giải thích
                    </label>
                    <textarea
                      value={formData.explanation}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          explanation: e.target.value,
                        })
                      }
                      placeholder={
                        formData.type === "sequence"
                          ? "Ví dụ: Đây là dãy số tăng dần với khoảng cách là 2..."
                          : formData.type === "math"
                          ? "Ví dụ: Phép cộng 2+4=6 là phép tính đúng vì..."
                          : "Ví dụ: Các cặp số được ghép dựa trên quy luật..."
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg min-h-[100px]"
                    />
                  </div>
                </>
              )}
              <div className="flex justify-end gap-4 pt-4">
                <button
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Hủy
                </button>
                <button
                  onClick={handleSubmit}
                  className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {editingId ? "Cập nhật" : "Thêm mới"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Modal xác nhận xóa */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold mb-4">Xác nhận xóa</h3>
            <p className="text-gray-600 mb-6">
              Bạn có chắc chắn muốn xóa? Hành động này không thể hoàn tác.
            </p>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setIdToDelete(null);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Hủy
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700"
              >
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameManagement;
