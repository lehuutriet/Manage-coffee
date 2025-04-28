import { useState } from "react";
import { X, Save, AlertCircle, Loader2 } from "lucide-react";
import { useAuth } from "../contexts/auth/authProvider";
import { ID } from "appwrite";
import { toast } from "react-hot-toast";

interface GameDataModalProps {
  onClose: () => void;
}

const GameDataModal = ({ onClose }: GameDataModalProps) => {
  const [gameType, setGameType] = useState<
    "word" | "memory" | "quiz" | "intelligence" | "logic" | "imageword"
  >("word");
  const { databases, storage } = useAuth();
  const [error, setError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const BUCKET_ID_IMAGE_MATCHING = "imagewordmatchingbucket";
  const [formData, setFormData] = useState({
    level: 1,
    words: Array(4).fill(""),
    correctAnswer: "",
    question: "",
    options: ["", "", "", ""],
    correctAnswerIndex: 0,
    equation: "",
    answer: "",
    category: "",
    firstNumber: "",
    operator: "+",
    secondNumber: "",
    numberCount: 9,
    timeLimit: 60,
    operators: Array(3).fill("+"),
    numbers: Array(3).fill(""),
    type: "sequence",
    data: [] as string[],
    imageword: "",
    imageFile: null as File | null,
    imageDescription: "",
    imageCategory: "animals",
    explanation: "",
  });

  const DATABASE_ID = "674e5e7a0008e19d0ef0";
  const COLLECTIONS = {
    word: "6789dfaa000bb6b7ace9",
    memory: "6789dfb10025bb05631a",
    quiz: "6789dfb80024b84acbb4",
    intelligence: "678f010e002c5c4d844c",
    logic: "678f26b00005b0c70011",
    imageword: "imagewordmatching",
  };

  const handleLevelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const level = Number(e.target.value);
    const wordCount = level === 1 ? 4 : level === 2 ? 8 : 12;

    setFormData({
      ...formData,
      level: level,
      words: Array(wordCount).fill(""),
    });
  };

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
    if (gameType === "imageword") {
      if (!formData.imageword.trim()) {
        setError("Vui lòng nhập từ cần ghép");
        return false;
      }
      if (!formData.imageFile) {
        setError("Vui lòng tải lên hình ảnh");
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setIsUploading(true);
    try {
      let data;

      switch (gameType) {
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

        case "memory": {
          let equation = formData.firstNumber;
          for (let i = 0; i < formData.operators.length; i++) {
            if (formData.numbers[i]) {
              let operator = formData.operators[i];
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
            numbers: Array.from({ length: formData.numberCount || 9 }, (_, i) =>
              (i + 1).toString()
            ).sort(() => Math.random() - 0.5),
            correctOrder: Array.from(
              { length: formData.numberCount || 9 },
              (_, i) => (i + 1).toString()
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
        case "imageword": {
          if (!formData.imageFile) {
            throw new Error("No image file selected");
          }

          // Upload hình ảnh trước
          const imageUploadResult = await storage.createFile(
            BUCKET_ID_IMAGE_MATCHING, // Thay thế bằng BUCKET_ID thực tế
            ID.unique(),
            formData.imageFile
          );

          data = {
            word: formData.imageword,
            imageId: imageUploadResult.$id,
            level:
              formData.level === 1
                ? "beginner"
                : formData.level === 2
                ? "intermediate"
                : "advanced",
            description: formData.imageDescription || "",
            category: formData.imageCategory,
          };
          break;
        }
      }

      if (data) {
        await databases.createDocument(
          DATABASE_ID,
          COLLECTIONS[gameType],
          ID.unique(),
          data
        );
        toast.success("Thêm mới thành công!");
        onClose();
      }
    } catch (error) {
      toast.error("Có lỗi xảy ra");
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  const renderFormFields = () => {
    switch (gameType) {
      case "word":
        return (
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
            </div>
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
        );

      case "memory":
        return (
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

                {Array.from({ length: formData.level * 2 }).map((_, index) =>
                  index % 2 === 0 ? (
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
                    <input
                      key={index}
                      type="number"
                      value={formData.numbers?.[(index - 1) / 2] || ""}
                      onChange={(e) => {
                        const newNumbers = [...(formData.numbers || [])];
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
        );

      case "quiz":
        return (
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
        );

      case "intelligence":
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cấp độ
              </label>
              <select
                value={formData.level}
                onChange={(e) => {
                  const level = Number(e.target.value);
                  const timeLimit = level === 1 ? 60 : level === 2 ? 45 : 30;
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
                value={formData.numberCount}
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
        );

      case "logic":
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Loại
              </label>
              <select
                value={formData.type}
                onChange={(e) => {
                  setFormData({
                    ...formData,
                    type: e.target.value,
                    data: [],
                    answer: "",
                    question: "",
                    explanation: "",
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
                  Array.isArray(formData.data) ? formData.data.join(",") : ""
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
                  if (formData.type === "sequence") {
                    answer = [e.target.value];
                  } else if (formData.type === "math") {
                    answer = [e.target.value];
                  } else {
                    answer = e.target.value
                      .split(",")
                      .map((pair) => pair.trim());
                  }
                  setFormData({
                    ...formData,
                    answer: Array.isArray(answer) ? answer.join(",") : answer,
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
        );
      case "imageword":
        return (
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
                Từ
              </label>
              <input
                type="text"
                value={formData.imageword}
                onChange={(e) =>
                  setFormData({ ...formData, imageword: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Nhập từ cần ghép với hình ảnh"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Danh mục
              </label>
              <select
                value={formData.imageCategory}
                onChange={(e) =>
                  setFormData({ ...formData, imageCategory: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="animals">Động vật</option>
                <option value="foods">Thức ăn</option>
                <option value="colors">Màu sắc</option>
                <option value="objects">Đồ vật</option>
                <option value="nature">Thiên nhiên</option>
                <option value="vehicles">Phương tiện</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mô tả (không bắt buộc)
              </label>
              <textarea
                value={formData.imageDescription}
                onChange={(e) =>
                  setFormData({ ...formData, imageDescription: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Nhập mô tả cho từ (không bắt buộc)"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Hình ảnh
              </label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg">
                <div className="space-y-1 text-center">
                  {formData.imageFile ? (
                    <div className="mb-3">
                      <img
                        src={URL.createObjectURL(formData.imageFile)}
                        alt="Preview"
                        className="mx-auto h-32 object-contain"
                      />
                    </div>
                  ) : (
                    <svg
                      className="mx-auto h-12 w-12 text-gray-400"
                      stroke="currentColor"
                      fill="none"
                      viewBox="0 0 48 48"
                      aria-hidden="true"
                    >
                      <path
                        d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                  <div className="flex text-sm text-gray-600">
                    <label
                      htmlFor="file-upload"
                      className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none"
                    >
                      <span>Tải lên hình ảnh</span>
                      <input
                        id="file-upload"
                        name="file-upload"
                        type="file"
                        className="sr-only"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setFormData({ ...formData, imageFile: file });
                          }
                        }}
                      />
                    </label>
                    <p className="pl-1">hoặc kéo và thả</p>
                  </div>
                  <p className="text-xs text-gray-500">
                    PNG, JPG, GIF tối đa 5MB
                  </p>
                </div>
              </div>
            </div>
          </>
        );
      default:
        return null;
    }
  };

  // Cuối cùng là return của component
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-6 border-b flex justify-between items-center">
          <h3 className="text-xl font-semibold">Thêm dữ liệu game mới</h3>
          <button onClick={onClose}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Loại game</label>
            <select
              value={gameType}
              onChange={(e) => setGameType(e.target.value as any)}
              className="w-full p-2 border rounded"
            >
              <option value="word">Ghép từ</option>
              <option value="memory">Trí nhớ số học</option>
              <option value="quiz">Câu đố</option>
              <option value="intelligence">Thử thách ghi nhớ</option>
              <option value="logic">Thử thách tư duy</option>
              <option value="imageword">Ghép từ với hình ảnh</option>
            </select>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <p className="text-red-600">{error}</p>
            </div>
          )}

          <div className="space-y-6">{renderFormFields()}</div>

          <div className="flex justify-end gap-4 mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
            >
              Hủy
            </button>
            <button
              onClick={handleSubmit}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
              disabled={isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang xử lý...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Thêm mới</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
export default GameDataModal;
