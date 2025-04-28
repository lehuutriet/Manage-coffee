import { useState, useEffect } from "react";
import { X, Check, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { useAuth } from "../contexts/auth/authProvider";
import { toast } from "react-hot-toast";

interface ImageWordMatchingModalProps {
  onClose: () => void;
}

interface WordMatch {
  $id: string;
  word: string;
  imageId: string;
  level: "beginner" | "intermediate" | "advanced";
  description?: string;
  category: string;
}

const ImageWordMatchingModal: React.FC<ImageWordMatchingModalProps> = ({
  onClose,
}) => {
  const { databases, storage } = useAuth();
  const [wordMatches, setWordMatches] = useState<WordMatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedLevel, setSelectedLevel] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentMatches, setCurrentMatches] = useState<WordMatch[]>([]);
  const [shuffledWords, setShuffledWords] = useState<string[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [correctMatches, setCorrectMatches] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [showCategories, setShowCategories] = useState(false);
  const [showLevels, setShowLevels] = useState(false);
  const [showRules, setShowRules] = useState(true);

  const DATABASE_ID = "674e5e7a0008e19d0ef0";
  const COLLECTION_ID = "imagewordmatching"; // Thay bằng ID collection thực tế
  const BUCKET_ID = "imagewordmatchingbucket"; // Thay bằng ID bucket thực tế

  const categories = [
    { id: "all", name: "Tất cả" },
    { id: "animals", name: "Động vật" },
    { id: "foods", name: "Thức ăn" },
    { id: "colors", name: "Màu sắc" },
    { id: "objects", name: "Đồ vật" },
    { id: "nature", name: "Thiên nhiên" },
    { id: "vehicles", name: "Phương tiện" },
  ];

  const levels = [
    { id: "all", name: "Tất cả" },
    { id: "beginner", name: "Cơ bản" },
    { id: "intermediate", name: "Trung cấp" },
    { id: "advanced", name: "Nâng cao" },
  ];

  useEffect(() => {
    fetchWordMatches();
  }, []);

  useEffect(() => {
    filterWordMatches();
  }, [wordMatches, selectedCategory, selectedLevel, searchQuery]);

  const handleStartGame = () => {
    setShowRules(false);
  };

  const fetchWordMatches = async () => {
    setIsLoading(true);
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTION_ID
      );
      setWordMatches(response.documents as unknown as WordMatch[]);
    } catch (error) {
      console.error("Error fetching word matches:", error);
      setError("Không thể tải dữ liệu ghép từ");
    } finally {
      setIsLoading(false);
    }
  };

  const filterWordMatches = () => {
    let filtered = [...wordMatches];

    // Filter by category
    if (selectedCategory !== "all") {
      filtered = filtered.filter((item) => item.category === selectedCategory);
    }

    // Filter by level
    if (selectedLevel !== "all") {
      filtered = filtered.filter((item) => item.level === selectedLevel);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.word.toLowerCase().includes(query) ||
          (item.description && item.description.toLowerCase().includes(query))
      );
    }

    // Shuffle the filtered array first to get random items each time
    filtered = shuffleArray([...filtered]);

    // Limit to 10 items for the game
    const gameItems = filtered.slice(0, 10);
    setCurrentMatches(gameItems);

    // Shuffle words
    const words = gameItems.map((item) => item.word);
    setShuffledWords(shuffleArray([...words]));

    // Reset game state
    setSelectedImage(null);
    setSelectedWord(null);
    setFeedback(null);
    setCorrectMatches([]);
    setScore(0);
  };

  const shuffleArray = <T,>(array: T[]): T[] => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  };

  const handleImageClick = (imageId: string) => {
    if (correctMatches.includes(imageId)) return;

    setSelectedImage(imageId);
    setFeedback(null);
  };

  const handleWordClick = (word: string) => {
    setSelectedWord(word);

    // Check if word and image match
    if (selectedImage) {
      const matchingItem = currentMatches.find(
        (item) => item.imageId === selectedImage
      );
      if (matchingItem && matchingItem.word === word) {
        // Correct match
        setFeedback("correct");
        setCorrectMatches([...correctMatches, selectedImage]);
        setScore(score + 10);

        setTimeout(() => {
          setSelectedImage(null);
          setSelectedWord(null);
          setFeedback(null);
        }, 1000);
      } else {
        // Wrong match
        setFeedback("wrong");
        setScore(Math.max(0, score - 2));

        setTimeout(() => {
          setSelectedImage(null);
          setSelectedWord(null);
          setFeedback(null);
        }, 1000);
      }
    }
  };

  const resetGame = () => {
    filterWordMatches();
    toast.success("Trò chơi đã được làm mới!");
  };

  const getCategoryName = (id: string) => {
    return categories.find((cat) => cat.id === id)?.name || id;
  };

  const getLevelName = (id: string) => {
    return levels.find((level) => level.id === id)?.name || id;
  };

  const isGameCompleted =
    correctMatches.length === currentMatches.length &&
    currentMatches.length > 0;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-900/80 backdrop-blur-sm">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="relative w-full max-w-6xl rounded-xl bg-white shadow-xl">
          {/* Header */}
          <div className="sticky top-0 z-10 flex items-center justify-between bg-gradient-to-r from-blue-600 to-blue-800 px-6 py-4 text-white">
            <h2 className="text-xl font-semibold">Ghép từ với hình ảnh</h2>
            <button
              onClick={onClose}
              className="rounded-full p-2 hover:bg-white/10"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Rules Modal */}
          {showRules && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl p-6 max-w-md w-full">
                <h3 className="text-2xl font-bold mb-4">
                  Ghép từ với hình ảnh
                </h3>
                <p className="text-gray-600 text-sm mb-4">
                  Trò chơi giúp bạn kết nối từ vựng với hình ảnh tương ứng
                </p>
                <div className="space-y-4 mb-6">
                  <div>
                    <h4 className="font-semibold text-green-600">Luật chơi:</h4>
                    <p className="text-gray-600">
                      • Chọn một hình ảnh, sau đó chọn từ tương ứng
                    </p>
                    <p className="text-gray-600">
                      • Mỗi ghép đúng được thưởng 10 điểm
                    </p>
                    <p className="text-gray-600">
                      • Mỗi ghép sai bị trừ 2 điểm
                    </p>
                    <p className="text-gray-600">
                      • Hoàn thành tất cả các ghép để kết thúc
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-blue-600">
                      Các tính năng:
                    </h4>
                    <p className="text-gray-600">• Tìm kiếm từ vựng</p>
                    <p className="text-gray-600">
                      • Lọc theo danh mục và cấp độ
                    </p>
                    <p className="text-gray-600">
                      • Làm mới trò chơi để có bộ từ mới
                    </p>
                    <p className="text-gray-600">• Hệ thống ghi nhận điểm số</p>
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

          <div className="max-h-[80vh] overflow-y-auto p-6">
            {isLoading ? (
              <div className="flex items-center justify-center min-h-[50vh]">
                <div className="text-center">
                  <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-4" />
                  <p className="text-gray-600">Đang tải dữ liệu...</p>
                </div>
              </div>
            ) : error ? (
              <div className="bg-red-50 border border-red-200 p-6 rounded-lg max-w-4xl mx-auto my-8">
                <h2 className="text-red-800 font-bold text-xl mb-2">
                  Đã xảy ra lỗi
                </h2>
                <p className="text-red-600">{error}</p>
                <button
                  onClick={() => fetchWordMatches()}
                  className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Thử lại
                </button>
              </div>
            ) : (
              <>
                {/* Filters */}
                <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
                  <div className="flex flex-wrap gap-4 items-center justify-between">
                    <div className="flex-1 min-w-[250px]">
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Tìm kiếm từ..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-4 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <button
                          onClick={() => setSearchQuery("")}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {searchQuery ? <X className="w-4 h-4" /> : null}
                        </button>
                      </div>
                    </div>

                    <div className="relative">
                      <button
                        onClick={() => setShowCategories(!showCategories)}
                        className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg bg-white"
                      >
                        <span>{getCategoryName(selectedCategory)}</span>
                        {showCategories ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                      {showCategories && (
                        <div className="absolute z-10 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                          {categories.map((category) => (
                            <button
                              key={category.id}
                              onClick={() => {
                                setSelectedCategory(category.id);
                                setShowCategories(false);
                              }}
                              className={`w-full text-left px-4 py-2 hover:bg-gray-100 ${
                                selectedCategory === category.id
                                  ? "bg-blue-50 text-blue-600"
                                  : ""
                              }`}
                            >
                              {category.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="relative">
                      <button
                        onClick={() => setShowLevels(!showLevels)}
                        className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg bg-white"
                      >
                        <span>{getLevelName(selectedLevel)}</span>
                        {showLevels ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                      {showLevels && (
                        <div className="absolute z-10 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                          {levels.map((level) => (
                            <button
                              key={level.id}
                              onClick={() => {
                                setSelectedLevel(level.id);
                                setShowLevels(false);
                              }}
                              className={`w-full text-left px-4 py-2 hover:bg-gray-100 ${
                                selectedLevel === level.id
                                  ? "bg-blue-50 text-blue-600"
                                  : ""
                              }`}
                            >
                              {level.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={resetGame}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Làm mới
                    </button>
                  </div>
                </div>

                {/* Game Score */}
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl shadow-md p-6 mb-8">
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="text-2xl font-bold">Điểm số</h2>
                      <p className="text-white/80">
                        Ghép đúng: {correctMatches.length}/
                        {currentMatches.length}
                      </p>
                    </div>
                    <div className="text-4xl font-bold">{score}</div>
                  </div>

                  {isGameCompleted && (
                    <div className="mt-4 p-4 bg-white/20 backdrop-blur-sm rounded-lg text-center">
                      <h3 className="text-xl font-bold">Chúc mừng! 🎉</h3>
                      <p>Bạn đã hoàn thành trò chơi ghép từ!</p>
                      <button
                        onClick={resetGame}
                        className="mt-3 px-4 py-2 bg-white text-purple-600 font-medium rounded-lg hover:bg-white/90 transition-colors"
                      >
                        Chơi lại
                      </button>
                    </div>
                  )}
                </div>

                {/* Game Area */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Images Section */}
                  <div className="bg-white rounded-xl shadow-sm p-6">
                    <h2 className="text-xl font-bold mb-4">Hình ảnh</h2>
                    <div className="grid grid-cols-2 gap-4">
                      {currentMatches.map((match) => (
                        <div
                          key={match.imageId}
                          onClick={() => handleImageClick(match.imageId)}
                          className={`relative border-2 rounded-lg overflow-hidden cursor-pointer aspect-square transition-all ${
                            correctMatches.includes(match.imageId)
                              ? "border-green-500 opacity-50"
                              : selectedImage === match.imageId
                              ? "border-blue-500 ring-2 ring-blue-300"
                              : "border-gray-200 hover:border-blue-300"
                          }`}
                        >
                          <img
                            src={storage
                              .getFilePreview(BUCKET_ID, match.imageId)
                              .toString()}
                            alt="Word matching"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                "https://via.placeholder.com/200?text=Image+Error";
                            }}
                          />

                          {correctMatches.includes(match.imageId) && (
                            <div className="absolute inset-0 flex items-center justify-center bg-green-500/30">
                              <Check className="w-10 h-10 text-green-600" />
                            </div>
                          )}

                          {feedback === "correct" &&
                            selectedImage === match.imageId && (
                              <div className="absolute inset-0 flex items-center justify-center bg-green-500/30 animate-pulse">
                                <Check className="w-10 h-10 text-green-600" />
                              </div>
                            )}

                          {feedback === "wrong" &&
                            selectedImage === match.imageId && (
                              <div className="absolute inset-0 flex items-center justify-center bg-red-500/30 animate-pulse">
                                <X className="w-10 h-10 text-red-600" />
                              </div>
                            )}
                        </div>
                      ))}

                      {currentMatches.length === 0 && (
                        <div className="col-span-2 py-12 text-center">
                          <p className="text-gray-500">
                            Không tìm thấy từ nào phù hợp. Hãy thử lại với bộ
                            lọc khác.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Words Section */}
                  <div className="bg-white rounded-xl shadow-sm p-6">
                    <h2 className="text-xl font-bold mb-4">Từ vựng</h2>
                    <div className="grid grid-cols-2 gap-4">
                      {shuffledWords.map((word) => {
                        const isCorrectlyMatched = currentMatches.some(
                          (match) =>
                            match.word === word &&
                            correctMatches.includes(match.imageId)
                        );

                        return (
                          <button
                            key={word}
                            onClick={() =>
                              !isCorrectlyMatched && handleWordClick(word)
                            }
                            disabled={isCorrectlyMatched}
                            className={`p-4 border-2 rounded-lg text-center transition-all ${
                              isCorrectlyMatched
                                ? "border-green-500 bg-green-50 text-green-700 opacity-50"
                                : selectedWord === word
                                ? "border-blue-500 bg-blue-50 text-blue-700"
                                : "border-gray-200 hover:border-blue-300 hover:bg-blue-50"
                            }`}
                          >
                            <span className="text-lg font-medium">{word}</span>
                            {isCorrectlyMatched && (
                              <Check className="w-5 h-5 text-green-600 inline ml-2" />
                            )}
                          </button>
                        );
                      })}

                      {shuffledWords.length === 0 && (
                        <div className="col-span-2 py-12 text-center">
                          <p className="text-gray-500">
                            Không có từ vựng nào để hiển thị.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageWordMatchingModal;
