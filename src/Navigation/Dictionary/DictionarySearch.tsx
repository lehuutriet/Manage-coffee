import { Search } from "lucide-react";

interface DictionarySearchProps {
  searchTerm: string;
  onSearch: (value: string) => void;
}

const DictionarySearch = ({ searchTerm, onSearch }: DictionarySearchProps) => {
  return (
    <div className="relative">
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6" />
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => onSearch(e.target.value)}
        placeholder="Nhập từ cần tìm..."
        className="w-full pl-12 pr-4 py-4 text-lg bg-white/70 backdrop-blur-sm border-2 border-purple-100 rounded-xl shadow-inner 
                 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-200 transition-all duration-300
                 placeholder:text-gray-400"
      />
    </div>
  );
};

export default DictionarySearch;
