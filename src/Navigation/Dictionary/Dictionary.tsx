import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "../Navigation";
import DictionarySearch from "./DictionarySearch";
import DictionarySuggestions from "./DictionarySuggestions";
import { DictionaryWord } from "../../type/dictionary";
import { useAuth } from "../../contexts/auth/authProvider";
import { Query } from "appwrite";
import toast from "react-hot-toast";
import { motion } from "framer-motion";

const Dictionary = () => {
  const { databases } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [suggestions, setSuggestions] = useState<DictionaryWord[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const DATABASE_ID = "674e5e7a0008e19d0ef0";
  const DICTIONARY_COLLECTION_ID = "67aaac2a0014422c86d7";

  const handleSearch = async (value: string) => {
    setSearchTerm(value);
    if (value.trim().length > 0) {
      setIsLoading(true);
      try {
        const response = await databases.listDocuments(
          DATABASE_ID,
          DICTIONARY_COLLECTION_ID,
          [Query.startsWith("word", value)] // Thay đổi từ Query.equal sang Query.startsWith
        );

        const words: DictionaryWord[] = response.documents.map((doc) => ({
          id: doc.$id,
          word: doc.word,
          meanings: [
            {
              type: [doc.type],
              definitions: Array.isArray(doc.meaning)
                ? doc.meaning
                : [doc.meaning],
              examples: doc.example
                ? Array.isArray(doc.example)
                  ? doc.example
                  : [doc.example]
                : [],
            },
          ],
          pronunciation: doc.pronunciation,
          audioId: doc.audioId,
        }));

        setSuggestions(words);
        setShowSuggestions(true);
      } catch (error) {
        console.error("Error searching words:", error);
        toast.error("Không thể tìm kiếm từ");
      } finally {
        setIsLoading(false);
      }
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleWordSelect = (wordId: string) => {
    setShowSuggestions(false);
    navigate(`/dictionary/${wordId}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-100 via-purple-50 to-blue-50">
      <Navigation />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto px-4 pt-24 pb-16"
      >
        <div className="text-center mb-17">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-6"
          >
            Từ điển tiếng Việt
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-xl text-gray-600 max-w-2xl mx-auto"
          >
            Khám phá kho tàng ngôn ngữ Việt Nam với công cụ tra cứu thông minh
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6 }}
          className="relative max-w-3xl mx-auto"
        >
          <div className="backdrop-blur-xl bg-white/30 p-8 rounded-3xl shadow-xl">
            <DictionarySearch searchTerm={searchTerm} onSearch={handleSearch} />
          </div>

          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute mt-4 w-full bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 text-center"
            >
              <div className="flex items-center justify-center gap-3">
                <div className="animate-spin rounded-full h-6 w-6 border-3 border-purple-600 border-t-transparent"></div>
                <span className="text-purple-600 font-medium">
                  Đang tìm kiếm...
                </span>
              </div>
            </motion.div>
          )}

          {showSuggestions && suggestions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4"
            >
              <DictionarySuggestions
                suggestions={suggestions}
                onSelect={handleWordSelect}
              />
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Dictionary;
