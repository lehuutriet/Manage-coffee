import { DictionaryWord } from "../../type/dictionary";
import { motion } from "framer-motion";

interface DictionarySuggestionsProps {
  suggestions: DictionaryWord[];
  onSelect: (wordId: string) => void;
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
const DictionarySuggestions = ({
  suggestions,
  onSelect,
}: DictionarySuggestionsProps) => {
  return (
    <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-lg overflow-hidden border border-purple-100">
      {suggestions.map((word, index) => (
        <motion.div
          key={word.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          onClick={() => onSelect(word.id)}
          className="hover:bg-gradient-to-r hover:from-purple-50 hover:to-blue-50 cursor-pointer transition-all duration-300 border-b border-gray-100 last:border-none"
        >
          <div className="p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-lg text-gray-800 mb-1">
                {word.word}
                <span className="text-sm text-gray-500 ml-2">
                  [{word.pronunciation}]
                </span>
              </h3>
            </div>

            {word.meanings.map((meaning, meaningIndex) => (
              <div key={meaningIndex} className="mt-2">
                <div className="flex gap-2 items-center">
                  {meaning.type && meaning.type[0] && (
                    <span className="px-2 py-1 text-xs font-medium bg-violet-100 text-violet-700 rounded-full">
                      {WORD_TYPES.find((t) => t.id === meaning.type[0])?.label}
                    </span>
                  )}
                </div>
                {meaning.definitions[0] && (
                  <p className="text-gray-600 mt-1.5 line-clamp-2">
                    {meaning.definitions[0]}
                  </p>
                )}
                {meaning.examples && meaning.examples[0] && (
                  <p className="text-gray-500 italic mt-1 text-sm line-clamp-1">
                    Ví dụ: {meaning.examples[0]}
                  </p>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      ))}
    </div>
  );
};
export default DictionarySuggestions;
