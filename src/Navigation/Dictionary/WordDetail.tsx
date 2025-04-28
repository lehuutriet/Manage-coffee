import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/auth/authProvider";
import { Volume2, ArrowLeft, Heart, Share2 } from "lucide-react";
import { toast } from "react-hot-toast";
import Navigation from "../Navigation";
import { motion } from "framer-motion";
import { ID, Query } from "appwrite";

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

const WordDetail = () => {
  const { wordId } = useParams();
  const { databases, storage, account } = useAuth();
  const navigate = useNavigate();
  const [word, setWord] = useState<WordDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFavorited, setIsFavorited] = useState(false);

  const DATABASE_ID = "674e5e7a0008e19d0ef0";
  const DICTIONARY_COLLECTION_ID = "67aaac2a0014422c86d7";
  const AUDIO_BUCKET = "67a48a93001fd22c809f";
  const WORD_MEANINGS_COLLECTION_ID = "67aaa4ef002b234fa51e";
  const FAVORITES_COLLECTION_ID = "67ad6fc7002e87e5529f";
  useEffect(() => {
    const fetchWordMeanings = async (wordId: string) => {
      try {
        const meanings = await databases.listDocuments(
          DATABASE_ID,
          WORD_MEANINGS_COLLECTION_ID,
          [Query.equal("dictionary_word_id", [wordId])]
        );
        return meanings.documents;
      } catch (error) {
        console.error("Error fetching meanings:", error);
        return [];
      }
    };

    const fetchWordDetail = async () => {
      try {
        const wordResponse = await databases.getDocument(
          DATABASE_ID,
          DICTIONARY_COLLECTION_ID,
          wordId as string
        );

        // Fetch meanings cho từ này
        const wordMeanings = await fetchWordMeanings(wordId as string);

        setWord({
          id: wordResponse.$id,
          word: wordResponse.word,
          meanings: wordMeanings.map((m) => ({
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
        setIsLoading(false);
      }
    };

    if (wordId) {
      fetchWordDetail();
    }
  }, [wordId, databases]);

  const playAudio = async (audioId: string) => {
    try {
      const audioUrl = storage.getFileView(AUDIO_BUCKET, audioId);
      const audio = new Audio(audioUrl);
      await audio.play();
    } catch (error) {
      toast.error("Không thể phát âm thanh");
    }
  };

  useEffect(() => {
    const checkFavoriteStatus = async () => {
      try {
        if (!wordId) return;
        const favorites = await databases.listDocuments(
          DATABASE_ID,
          FAVORITES_COLLECTION_ID,
          [
            Query.equal("dictionary_word_id", [wordId]),
            Query.equal("user_id", [(await account.get()).$id]),
          ]
        );
        setIsFavorited(favorites.documents.length > 0);
      } catch (error) {
        console.error("Error checking favorite status:", error);
      }
    };

    if (wordId) {
      checkFavoriteStatus();
    }
  }, [wordId]);

  // Sửa lại hàm toggleFavorite
  const toggleFavorite = async () => {
    try {
      const userId = (await account.get()).$id;

      if (!wordId) return;
      if (isFavorited) {
        const favorites = await databases.listDocuments(
          DATABASE_ID,
          FAVORITES_COLLECTION_ID,
          [
            Query.equal("dictionary_word_id", [wordId]),
            Query.equal("user_id", [userId]),
          ]
        );

        if (favorites.documents.length > 0) {
          await databases.deleteDocument(
            DATABASE_ID,
            FAVORITES_COLLECTION_ID,
            favorites.documents[0].$id
          );
        }
      } else {
        await databases.createDocument(
          DATABASE_ID,
          FAVORITES_COLLECTION_ID,
          ID.unique(),
          {
            dictionary_word_id: wordId,
            user_id: userId,
          }
        );
      }

      setIsFavorited(!isFavorited);
      toast.success(
        isFavorited ? "Đã xóa khỏi yêu thích" : "Đã thêm vào yêu thích"
      );
    } catch (error) {
      console.error("Error toggling favorite:", error);
      toast.error("Có lỗi xảy ra");
    }
  };
  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Đã sao chép liên kết");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-100 via-purple-50 to-blue-50">
      <Navigation />

      <div className="max-w-4xl mx-auto px-4 pt-20 pb-12">
        <button
          onClick={() => navigate("/dictionary")}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-8 transition-colors group"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span>Quay lại từ điển</span>
        </button>

        {isLoading ? (
          <div className="flex justify-center items-center min-h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-200 border-t-purple-600"></div>
          </div>
        ) : word ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg p-8"
          >
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-4xl font-bold text-gray-900 mb-2">
                  {word.word}
                </h1>
                <p className="text-xl text-gray-600">[{word.pronunciation}]</p>
              </div>
              <div className="flex gap-3">
                {word.audioId && (
                  <button
                    onClick={() => playAudio(word.audioId!)}
                    className="p-3 hover:bg-blue-50 rounded-full transition-colors"
                    title="Phát âm"
                  >
                    <Volume2 className="w-6 h-6 text-blue-600" />
                  </button>
                )}
                <button
                  onClick={toggleFavorite}
                  className={`p-3 rounded-full transition-colors ${
                    isFavorited ? "bg-red-50" : "hover:bg-red-50"
                  }`}
                  title={isFavorited ? "Đã yêu thích" : "Thêm vào yêu thích"}
                >
                  <Heart
                    className={`w-6 h-6 ${
                      isFavorited ? "text-red-500 fill-red-500" : "text-red-400"
                    }`}
                  />
                </button>
                <button
                  onClick={handleShare}
                  className="p-3 hover:bg-gray-50 rounded-full transition-colors"
                  title="Chia sẻ"
                >
                  <Share2 className="w-6 h-6 text-gray-600" />
                </button>
              </div>
            </div>

            {/* Nội dung */}
            <div className="space-y-6">
              {word.meanings.map((meaning, index) => (
                <div key={index}>
                  <div className="mb-3">
                    <span className="inline-block px-3 py-1 text-sm font-medium bg-blue-100 text-blue-800 rounded-full">
                      {WORD_TYPES.find((t) => t.id === meaning.type[0])?.label}
                    </span>
                  </div>

                  {meaning.definitions.map((def, defIndex) => (
                    <div
                      key={defIndex}
                      className="pl-4 border-l-4 border-purple-200"
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
              {word.synonyms && word.synonyms.length > 0 && (
                <div className="mt-6">
                  <h3 className="font-medium text-gray-900 mb-2">
                    Từ đồng nghĩa:
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {word.synonyms.map((syn, index) => (
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
              {word.antonyms && word.antonyms.length > 0 && (
                <div className="mt-6">
                  <h3 className="font-medium text-gray-900 mb-2">
                    Từ trái nghĩa:
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {word.antonyms.map((ant, index) => (
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
              {word.relatedWords && word.relatedWords.length > 0 && (
                <div className="mt-6">
                  <h3 className="font-medium text-gray-900 mb-2">
                    Từ liên quan:
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {word.relatedWords.map((related, index) => (
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
          </motion.div>
        ) : (
          <div className="text-center py-12 bg-white/80 backdrop-blur-md rounded-2xl shadow-lg">
            <p className="text-gray-500 text-lg mb-4">Không tìm thấy từ này</p>
            <button
              onClick={() => navigate("/dictionary")}
              className="text-purple-600 hover:text-purple-700 font-medium"
            >
              Quay lại trang từ điển
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default WordDetail;
