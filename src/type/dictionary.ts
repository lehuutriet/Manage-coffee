export interface DictionaryWord {
  id: string; 
  word: string;
  meanings: {
    type: string[];
    definitions: string[];
    examples: string[];
  }[];
  pronunciation: string;
  audioId?: string;
}

export const WORD_TYPES = [
  { id: "danh_tu", label: "Danh từ" },
  { id: "dong_tu", label: "Động từ" },
  { id: "tinh_tu", label: "Tính từ" },
  { id: "trang_tu", label: "Trạng từ" },
  { id: "dai_tu", label: "Đại từ" },
  { id: "luong_tu", label: "Lượng từ" },
  { id: "than_tu", label: "Thán từ" }
];