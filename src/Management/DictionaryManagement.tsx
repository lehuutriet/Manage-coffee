import React, { useEffect, useState } from "react";
import { Plus, Trash2, X, Edit2, Volume2 } from "lucide-react";
import { useAuth } from "../contexts/auth/authProvider";
import { ID, Query } from "appwrite";
import { toast } from "react-hot-toast";
import { WORD_TYPES } from "../type/dictionary";

interface Meaning {
  type: string[];
  definitions: string[];
  examples: string[];
}

interface DictionaryWord {
  id: string;
  word: string;
  meanings: Meaning[];
  pronunciation: string;
  audioId: string | null;
}

const DictionaryManagement = () => {
  const { databases, storage } = useAuth();
  const [words, setWords] = useState<DictionaryWord[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedWord, setSelectedWord] = useState<DictionaryWord | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const WORD_MEANINGS_COLLECTION_ID = "67aaa4ef002b234fa51e";
  const DATABASE_ID = "674e5e7a0008e19d0ef0";
  const DICTIONARY_COLLECTION_ID = "67aaac2a0014422c86d7";
  const AUDIO_BUCKET = "67a48a93001fd22c809f";

  const [formData, setFormData] = useState({
    word: "",
    meanings: [
      {
        type: ["danh_tu"], // Thay vì "danh_tu"
        definitions: [""],
        examples: [""],
      },
    ],
    pronunciation: "",
    audioFile: null as File | null,
  });

  const fetchWordMeanings = async (wordId: string) => {
    try {
      const meanings = await databases.listDocuments(
        DATABASE_ID,
        WORD_MEANINGS_COLLECTION_ID,
        [
          Query.equal("dictionary_word_id", wordId),
          // Filter thêm theo type nếu cần
          // Query.equal("type", ["danh_tu"])
        ]
      );
      return meanings.documents;
    } catch (error) {
      console.error("Error fetching meanings:", error);
      return [];
    }
  };

  const fetchWords = async () => {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        DICTIONARY_COLLECTION_ID
      );

      const wordsWithMeanings = await Promise.all(
        response.documents.map(async (doc) => {
          const meanings = await fetchWordMeanings(doc.$id);

          return {
            id: doc.$id,
            word: doc.word,
            pronunciation: doc.pronunciation,
            audioId: doc.audioId,
            meanings: meanings.map((m) => ({
              type: m.type || [],
              definitions: Array.isArray(m.definitions) ? m.definitions : [],
              examples: Array.isArray(m.examples) ? m.examples : [],
            })),
          };
        })
      );

      setWords(wordsWithMeanings);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Không thể tải danh sách từ");
    }
  };
  useEffect(() => {
    fetchWords();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      let audioId = null;
      if (formData.audioFile) {
        const uploadedFile = await storage.createFile(
          AUDIO_BUCKET,
          ID.unique(),
          formData.audioFile
        );
        audioId = uploadedFile.$id;
      }

      // Dữ liệu cho từ chính
      const wordData = {
        word: formData.word,
        pronunciation: formData.pronunciation,
        audioId: audioId || selectedWord?.audioId || null,
      };

      if (isEditing && selectedWord) {
        // Cập nhật từ hiện có
        await databases.updateDocument(
          DATABASE_ID,
          DICTIONARY_COLLECTION_ID,
          selectedWord.id,
          wordData
        );

        // Lấy danh sách meanings hiện có
        const existingMeanings = await databases.listDocuments(
          DATABASE_ID,
          WORD_MEANINGS_COLLECTION_ID,
          [Query.equal("dictionary_word_id", selectedWord.id)]
        );

        // Xóa tất cả meanings cũ
        await Promise.all(
          existingMeanings.documents.map((doc) =>
            databases.deleteDocument(
              DATABASE_ID,
              WORD_MEANINGS_COLLECTION_ID,
              doc.$id
            )
          )
        );

        // Tạo meanings mới
        await Promise.all(
          formData.meanings.map(async (meaning) => {
            const meaningData = {
              dictionary_word_id: selectedWord.id,
              type: meaning.type,
              definitions: meaning.definitions,
              examples: meaning.examples,
            };

            await databases.createDocument(
              DATABASE_ID,
              WORD_MEANINGS_COLLECTION_ID,
              ID.unique(),
              meaningData
            );
          })
        );

        // Cập nhật state words
        setWords((prevWords) =>
          prevWords.map((word) =>
            word.id === selectedWord.id
              ? {
                  id: selectedWord.id,
                  word: formData.word,
                  pronunciation: formData.pronunciation,
                  audioId: audioId || word.audioId,
                  meanings: formData.meanings,
                }
              : word
          )
        );

        toast.success("Cập nhật từ thành công!");
      } else {
        // Tạo từ mới
        const newWord = await databases.createDocument(
          DATABASE_ID,
          DICTIONARY_COLLECTION_ID,
          ID.unique(),
          wordData
        );

        // Tạo meanings cho từ mới
        await Promise.all(
          formData.meanings.map(async (meaning) => {
            const meaningData = {
              dictionary_word_id: newWord.$id,
              type: meaning.type,
              definitions: meaning.definitions,
              examples: meaning.examples,
            };

            await databases.createDocument(
              DATABASE_ID,
              WORD_MEANINGS_COLLECTION_ID,
              ID.unique(),
              meaningData
            );
          })
        );

        // Cập nhật state words
        setWords((prevWords) => [
          ...prevWords,
          {
            ...wordData,
            id: newWord.$id,
            meanings: formData.meanings.map((meaning) => ({
              type: meaning.type,
              definitions: meaning.definitions,
              examples: meaning.examples,
            })),
          },
        ]);

        toast.success("Thêm từ mới thành công!");
      }

      // Refresh lại dữ liệu
      await fetchWords();
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Có lỗi xảy ra khi lưu dữ liệu");
    } finally {
      setIsLoading(false);
    }
  };
  const playAudio = async (audioId: string) => {
    try {
      const audioUrl = storage.getFileView(AUDIO_BUCKET, audioId);
      const audio = new Audio(audioUrl);
      await audio.play();
    } catch (error) {
      toast.error("Không thể phát âm thanh");
    }
  };
  const resetForm = () => {
    setFormData({
      word: "",
      meanings: [
        {
          type: ["danh_tu"],
          definitions: [""],
          examples: [""],
        },
      ],
      pronunciation: "",
      audioFile: null,
    });
    setIsEditing(false);
    setSelectedWord(null);
  };

  const handleDeleteWord = async (wordId: string) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa từ này?")) {
      try {
        await databases.deleteDocument(
          DATABASE_ID,
          DICTIONARY_COLLECTION_ID,
          wordId
        );
        setWords((prevWords) => prevWords.filter((word) => word.id !== wordId));
        toast.success("Xóa từ thành công!");
      } catch (error) {
        console.error("Error deleting word:", error);
        toast.error("Không thể xóa từ");
      }
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-semibold">Quản lý từ điển</h2>
          <p className="text-gray-600">Thêm và quản lý các từ trong từ điển</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Thêm từ mới
        </button>
      </div>

      <div className="mb-6">
        <input
          type="text"
          placeholder="Tìm kiếm từ..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border rounded-lg"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {words
          .filter(
            (word) =>
              word.word.toLowerCase().includes(searchTerm.toLowerCase()) ||
              word.meanings.some((m) =>
                m.definitions.some((d) =>
                  d.toLowerCase().includes(searchTerm.toLowerCase())
                )
              )
          )
          .map((word) => (
            <div key={word.id} className="bg-white rounded-lg shadow p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium text-lg">{word.word}</h3>
                  <p className="text-gray-500">[{word.pronunciation}]</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      console.log("Full word data:", word); // Check toàn bộ data của từ
                      console.log("Word meanings:", word.meanings); // Check riêng phần meanings
                      setSelectedWord(word);
                      setIsEditing(true);

                      const mappedMeanings = word.meanings.map((meaning) => {
                        console.log("Mapping meaning:", meaning); // Check từng meaning khi map
                        return {
                          type: meaning.type,
                          definitions: meaning.definitions || [],
                          examples: meaning.examples || [],
                        };
                      });

                      console.log("Final mapped meanings:", mappedMeanings); // Check kết quả cuối

                      setFormData({
                        word: word.word,
                        meanings: mappedMeanings,
                        pronunciation: word.pronunciation,
                        audioFile: null,
                      });

                      console.log("Form data after set:", formData); // Check form data sau khi set
                      setIsModalOpen(true);
                    }}
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteWord(word.id)}
                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {word.meanings.map((meaning, meaningIndex) => (
                <div key={meaningIndex} className="mt-4">
                  <div className="mb-2">
                    <span className="inline-block px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                      {WORD_TYPES.find((t) => t.id === meaning.type[0])?.label}
                    </span>
                  </div>

                  {meaning.definitions.map((definition, defIndex) => (
                    <div key={defIndex} className="mb-2">
                      <p className="text-gray-800">• {definition}</p>
                      {meaning.examples[defIndex] && (
                        <p className="ml-4 text-gray-600 italic mt-1">
                          {meaning.examples[defIndex]}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">
                {isEditing ? "Chỉnh sửa từ" : "Thêm từ mới"}
              </h3>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Từ</label>
                <input
                  type="text"
                  value={formData.word}
                  onChange={(e) =>
                    setFormData({ ...formData, word: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Phiên âm
                </label>
                <input
                  type="text"
                  value={formData.pronunciation}
                  onChange={(e) =>
                    setFormData({ ...formData, pronunciation: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>

              {formData.meanings.map((meaning, meaningIndex) => (
                <div key={meaningIndex} className="space-y-4 border-t pt-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium">Nghĩa {meaningIndex + 1}</h4>
                    {meaningIndex > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setFormData({
                            ...formData,
                            meanings: formData.meanings.filter(
                              (_, i) => i !== meaningIndex
                            ),
                          });
                        }}
                        className="text-red-600 hover:text-red-700"
                      >
                        Xóa nghĩa này
                      </button>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Loại từ
                    </label>
                    <select
                      value={meaning.type[0]}
                      onChange={(e) => {
                        const newMeanings = [...formData.meanings];
                        newMeanings[meaningIndex].type = [e.target.value];
                        setFormData({ ...formData, meanings: newMeanings });
                      }}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      {WORD_TYPES.map((type) => (
                        <option key={type.id} value={type.id}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {meaning.definitions.map((def, defIndex) => (
                    <div key={defIndex} className="space-y-2">
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Định nghĩa {defIndex + 1}
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={def}
                            onChange={(e) => {
                              const newMeanings = [...formData.meanings];
                              newMeanings[meaningIndex].definitions[defIndex] =
                                e.target.value;
                              setFormData({
                                ...formData,
                                meanings: newMeanings,
                              });
                            }}
                            className="flex-1 px-3 py-2 border rounded-lg"
                            required
                          />
                          {defIndex > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                const newMeanings = [...formData.meanings];
                                newMeanings[meaningIndex].definitions.splice(
                                  defIndex,
                                  1
                                );
                                newMeanings[meaningIndex].examples.splice(
                                  defIndex,
                                  1
                                );
                                setFormData({
                                  ...formData,
                                  meanings: newMeanings,
                                });
                              }}
                              className="text-red-600 hover:text-red-700 px-2"
                            >
                              Xóa
                            </button>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Ví dụ
                        </label>
                        <input
                          type="text"
                          value={meaning.examples[defIndex] || ""}
                          onChange={(e) => {
                            const newMeanings = [...formData.meanings];
                            newMeanings[meaningIndex].examples[defIndex] =
                              e.target.value;
                            setFormData({ ...formData, meanings: newMeanings });
                          }}
                          className="w-full px-3 py-2 border rounded-lg"
                        />
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => {
                      const newMeanings = [...formData.meanings];
                      newMeanings[meaningIndex].definitions.push("");
                      newMeanings[meaningIndex].examples.push("");
                      setFormData({ ...formData, meanings: newMeanings });
                    }}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    + Thêm định nghĩa
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={() => {
                  setFormData({
                    ...formData,
                    meanings: [
                      ...formData.meanings,
                      {
                        type: ["danh_tu"], // Đảm bảo là array
                        definitions: [""],
                        examples: [""],
                      },
                    ],
                  });
                }}
                className="text-blue-600 hover:text-blue-700 mt-4"
              >
                + Thêm loại từ mới
              </button>

              <div>
                <label className="block text-sm font-medium mb-1">
                  File âm thanh
                </label>

                {/* Hiển thị âm thanh hiện tại nếu có */}
                {selectedWord?.audioId && (
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-sm text-gray-600">
                      Âm thanh hiện tại:
                    </span>
                    <button
                      type="button"
                      onClick={() => playAudio(selectedWord.audioId!)}
                      className="p-2 hover:bg-blue-50 rounded-full"
                    >
                      <Volume2 className="w-5 h-5 text-blue-600" />
                    </button>
                  </div>
                )}

                <input
                  type="file"
                  accept="audio/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setFormData({ ...formData, audioFile: file });
                    }
                  }}
                  className="w-full"
                />
                <p className="text-sm text-gray-500 mt-1">
                  {selectedWord?.audioId
                    ? "Tải lên file mới để thay thế hoặc bỏ trống để giữ nguyên file cũ"
                    : "Tải lên file âm thanh mới"}
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    resetForm();
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {isLoading
                    ? "Đang xử lý..."
                    : isEditing
                    ? "Cập nhật"
                    : "Thêm mới"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DictionaryManagement;
