// FavoriteWords.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/auth/authProvider";
import { DictionaryWord } from "../type/dictionary";
import Navigation from "./Navigation";
import { motion } from "framer-motion";
import { toast } from "react-hot-toast";
import { Heart, Trash2, X, Volume2 } from "lucide-react";
import { Query } from "appwrite";

interface WordDetail {
  id: string;
  word: string;
  meanings: {
    type: string[];
    definitions: string[];
    examples: string[];
  }[];
  pronunciation: string;
  audioId?: string;
  synonyms?: string[];
  antonyms?: string[];
  relatedWords?: string[];
}

const WORD_TYPES = [
  { id: "danh_tu", label: "Danh từ" },
  { id: "dong_tu", label: "Động từ" },
  { id: "tinh_tu", label: "Tính từ" },
  { id: "trang_tu", label: "Trạng từ" },
  { id: "dai_tu", label: "Đại từ" },
  { id: "luong_tu", label: "Lượng từ" },
  { id: "than_tu", label: "Thán từ" },
];

const FavoriteWords = () => {
  const { databases, account, storage } = useAuth();
  const navigate = useNavigate();
  const [favoriteWords, setFavoriteWords] = useState<DictionaryWord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [wordToDelete, setWordToDelete] = useState<{
    id: string;
    word: string;
  } | null>(null);

  // Thêm states cho modal chi tiết từ
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [wordDetail, setWordDetail] = useState<WordDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  const DATABASE_ID = "674e5e7a0008e19d0ef0";
  const FAVORITES_COLLECTION_ID = "67ad6fc7002e87e5529f";
  const DICTIONARY_COLLECTION_ID = "67aaac2a0014422c86d7";
  const WORD_MEANINGS_COLLECTION_ID = "67aaa4ef002b234fa51e";
  const AUDIO_BUCKET = "67a48a93001fd22c809f";

  useEffect(() => {
    fetchFavoriteWords();
  }, []);

  const fetchFavoriteWords = async () => {
    try {
      const currentUser = await account.get();
      // Lấy danh sách favorites của user hiện tại
      const favoritesResponse = await databases.listDocuments(
        DATABASE_ID,
        FAVORITES_COLLECTION_ID,
        [Query.equal("user_id", currentUser.$id)]
      );

      const words: DictionaryWord[] = await Promise.all(
        favoritesResponse.documents.map(async (fav) => {
          const wordResponse = await databases.getDocument(
            DATABASE_ID,
            DICTIONARY_COLLECTION_ID,
            fav.dictionary_word_id
          );
          return {
            id: wordResponse.$id,
            word: wordResponse.word,
            meanings: wordResponse.meanings || [],
            pronunciation: wordResponse.pronunciation,
          };
        })
      );

      setFavoriteWords(words);
    } catch (error) {
      console.error("Error fetching favorite words:", error);
      toast.error("Không thể tải danh sách từ yêu thích");
    } finally {
      setIsLoading(false);
    }
  };

  // Hàm lấy chi tiết từ
  const fetchWordDetail = async (wordId: string) => {
    setIsLoadingDetail(true);
    try {
      const wordResponse = await databases.getDocument(
        DATABASE_ID,
        DICTIONARY_COLLECTION_ID,
        wordId
      );

      // Fetch meanings cho từ này
      const wordMeanings = await databases.listDocuments(
        DATABASE_ID,
        WORD_MEANINGS_COLLECTION_ID,
        [Query.equal("dictionary_word_id", wordId)]
      );

      setWordDetail({
        id: wordResponse.$id,
        word: wordResponse.word,
        meanings: wordMeanings.documents.map((m) => ({
          type: m.type || [],
          definitions: Array.isArray(m.definitions) ? m.definitions : [],
          examples: Array.isArray(m.examples) ? m.examples : [],
        })),
        pronunciation: wordResponse.pronunciation,
        audioId: wordResponse.audioId,
        synonyms: wordResponse.synonyms || [],
        antonyms: wordResponse.antonyms || [],
        relatedWords: wordResponse.relatedWords || [],
      });
    } catch (error) {
      console.error("Error fetching word details:", error);
      toast.error("Không thể tải thông tin từ");
    } finally {
      setIsLoadingDetail(false);
    }
  };

  // Hàm xử lý khi click vào từ
  const handleWordClick = async (word: DictionaryWord) => {
    setIsDetailModalOpen(true);
    await fetchWordDetail(word.id);
  };

  // Hàm phát âm
  const playAudio = async (audioId: string) => {
    try {
      const audioUrl = storage.getFileView(AUDIO_BUCKET, audioId);
      const audio = new Audio(audioUrl);
      await audio.play();
    } catch (error) {
      toast.error("Không thể phát âm thanh");
    }
  };

  // Hàm mở modal xác nhận xóa
  const handleDeleteClick = (word: { id: string; word: string }) => {
    setWordToDelete(word);
    setIsDeleteModalOpen(true);
  };

  // Hàm xử lý xóa sau khi xác nhận
  const removeFavorite = async () => {
    if (!wordToDelete) return;
    setIsDeleting(true);

    try {
      const currentUser = await account.get();
      const favorites = await databases.listDocuments(
        DATABASE_ID,
        FAVORITES_COLLECTION_ID,
        [
          Query.equal("dictionary_word_id", [wordToDelete.id]),
          Query.equal("user_id", [currentUser.$id]),
        ]
      );

      if (favorites.documents.length > 0) {
        await databases.deleteDocument(
          DATABASE_ID,
          FAVORITES_COLLECTION_ID,
          favorites.documents[0].$id
        );
        setFavoriteWords((prev) =>
          prev.filter((word) => word.id !== wordToDelete.id)
        );
        toast.success("Đã xóa khỏi danh sách yêu thích");
        setIsDeleteModalOpen(false);
        setWordToDelete(null);
      }
    } catch (error) {
      console.error("Error removing favorite:", error);
      toast.error("Không thể xóa từ khỏi danh sách yêu thích");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-white">
      <Navigation />

      <div className="max-w-7xl mx-auto px-4 pt-24 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Từ yêu thích
          </h1>
          <p className="text-gray-600">
            Danh sách các từ bạn đã đánh dấu yêu thích
          </p>
        </motion.div>

        {isLoading ? (
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          </div>
        ) : favoriteWords.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {favoriteWords.map((word) => (
              <motion.div
                key={word.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex justify-between items-start mb-4">
                  <div onClick={() => handleWordClick(word)}>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 hover:text-purple-600 cursor-pointer">
                        {word.word}
                      </h3>
                      <p className="text-gray-500">[{word.pronunciation}]</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Heart className="w-5 h-5 text-red-500 fill-red-500" />
                    <button
                      onClick={() =>
                        handleDeleteClick({ id: word.id, word: word.word })
                      }
                      className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {word.meanings.map((meaning, index) => (
                  <div key={index} className="mb-3 last:mb-0">
                    <div className="flex flex-wrap gap-2 mb-1">
                      {meaning.type.map((type, typeIndex) => (
                        <span
                          key={typeIndex}
                          className="text-xs font-medium text-purple-600 bg-purple-50 px-2 py-1 rounded-full"
                        >
                          {type}
                        </span>
                      ))}
                    </div>
                    <p className="text-gray-700">{meaning.definitions[0]}</p>
                  </div>
                ))}
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <Heart className="w-16 h-16 mx-auto" />
            </div>
            <p className="text-gray-600">
              Bạn chưa có từ nào trong danh sách yêu thích
            </p>
            <button
              onClick={() => navigate("/dictionary")}
              className="mt-4 text-purple-600 hover:text-purple-700 font-medium"
            >
              Khám phá từ điển ngay
            </button>
          </div>
        )}
      </div>

      {/* Modal xác nhận xóa từ */}
      {isDeleteModalOpen && wordToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Xác nhận xóa
            </h3>
            <p className="text-gray-600 mb-6">
              Bạn có chắc chắn muốn xóa từ "{wordToDelete.word}" khỏi danh sách
              yêu thích?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setWordToDelete(null);
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Hủy
              </button>
              <button
                onClick={removeFavorite}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-red-400 flex items-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin"></div>
                    Đang xóa...
                  </>
                ) : (
                  "Xóa"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal chi tiết từ */}
      {isDetailModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            {isLoadingDetail ? (
              <div className="flex justify-center items-center p-12">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-200 border-t-purple-600"></div>
              </div>
            ) : wordDetail ? (
              <div className="p-6">
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                      {wordDetail.word}
                    </h1>
                    <p className="text-xl text-gray-600">
                      [{wordDetail.pronunciation}]
                    </p>
                  </div>
                  <div className="flex gap-3">
                    {wordDetail.audioId && (
                      <button
                        onClick={() => playAudio(wordDetail.audioId!)}
                        className="p-3 hover:bg-blue-50 rounded-full transition-colors"
                        title="Phát âm"
                      >
                        <Volume2 className="w-6 h-6 text-blue-600" />
                      </button>
                    )}
                    <button
                      onClick={() => setIsDetailModalOpen(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                </div>

                {/* Nội dung */}
                <div className="space-y-6">
                  {wordDetail.meanings.map((meaning, index) => (
                    <div key={index}>
                      <div className="mb-3">
                        <span className="inline-block px-3 py-1 text-sm font-medium bg-blue-100 text-blue-800 rounded-full">
                          {
                            WORD_TYPES.find((t) => t.id === meaning.type[0])
                              ?.label
                          }
                        </span>
                      </div>

                      {meaning.definitions.map((def, defIndex) => (
                        <div
                          key={defIndex}
                          className="pl-4 border-l-4 border-purple-200 mb-4"
                        >
                          <p className="text-gray-800 text-lg">{def}</p>
                          {meaning.examples[defIndex] && (
                            <p className="text-gray-600 italic mt-2">
                              Ví dụ: {meaning.examples[defIndex]}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ))}

                  {/* Từ đồng nghĩa */}
                  {wordDetail.synonyms && wordDetail.synonyms.length > 0 && (
                    <div className="mt-6">
                      <h3 className="font-medium text-gray-900 mb-2">
                        Từ đồng nghĩa:
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {wordDetail.synonyms.map((syn, index) => (
                          <span
                            key={index}
                            className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm"
                          >
                            {syn}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Từ trái nghĩa */}
                  {wordDetail.antonyms && wordDetail.antonyms.length > 0 && (
                    <div className="mt-6">
                      <h3 className="font-medium text-gray-900 mb-2">
                        Từ trái nghĩa:
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {wordDetail.antonyms.map((ant, index) => (
                          <span
                            key={index}
                            className="px-3 py-1 bg-red-50 text-red-700 rounded-full text-sm"
                          >
                            {ant}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Từ liên quan */}
                  {wordDetail.relatedWords &&
                    wordDetail.relatedWords.length > 0 && (
                      <div className="mt-6">
                        <h3 className="font-medium text-gray-900 mb-2">
                          Từ liên quan:
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {wordDetail.relatedWords.map((related, index) => (
                            <span
                              key={index}
                              className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                            >
                              {related}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                </div>
              </div>
            ) : (
              <div className="p-6 text-center">
                <p className="text-gray-600">Không thể tải thông tin từ</p>
                <button
                  onClick={() => setIsDetailModalOpen(false)}
                  className="mt-4 px-4 py-2 bg-gray-100 rounded-lg text-gray-700"
                >
                  Đóng
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FavoriteWords;
