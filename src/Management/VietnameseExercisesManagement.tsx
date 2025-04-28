import { useState, useEffect } from "react";
import { useAuth } from "../contexts/auth/authProvider";
import { ID, Query } from "appwrite";
import { toast } from "react-hot-toast";
import { Loader2, Plus, Trash2, Edit2, Upload } from "lucide-react";

interface Question {
  id: string;
  exerciseId: string;
  image: string; // Đảm bảo luôn là string, lưu fileId thay vì URL đầy đủ
  prompt: string;
  options: string[];
  answer: string;
  prefix: string;
  suffix: string;
  word: string;
  toneOptions: string[]; // Không dùng optional, luôn khởi tạo là mảng rỗng
}

interface Exercise {
  id: string;
  type: "wordCompletion" | "wordSelection" | "toneMarking" | "wordWriting";
  title: string;
  content: string[]; // Mảng chứa question IDs
  questions: Question[];
  grade: number;
  level: "beginner" | "intermediate" | "advanced";
}

const VietnameseExercisesManagement = () => {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentExercise, setCurrentExercise] = useState<Exercise | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    type: "wordCompletion" as Exercise["type"],
    grade: 1,
    level: "beginner" as Exercise["level"],
    questions: [
      {
        id: "1",
        exerciseId: "", // Thêm trường này
        image: "", // Chuyển thành string rỗng thay vì null
        prompt: "",
        options: ["", "", ""],
        answer: "",
        toneOptions: [] as string[],
        word: "",
        prefix: "",
        suffix: "",
      },
    ],
  });
  const [imageFiles, setImageFiles] = useState<{ [key: string]: File | null }>(
    {}
  );

  const { databases, storage } = useAuth();
  const DATABASE_ID = "674e5e7a0008e19d0ef0";
  const EXERCISES_COLLECTION_ID = "vietnamese_exercises_collection";
  const QUESTIONS_COLLECTION_ID = "vietnamese_questions_collection";
  const BUCKET_ID = "vietnamese_exercises_bucket";

  useEffect(() => {
    fetchExercises();
  }, []);

  const fetchExercises = async () => {
    try {
      setLoading(true);
      const response = await databases.listDocuments(
        DATABASE_ID,
        EXERCISES_COLLECTION_ID
      );

      const exercisesData = await Promise.all(
        response.documents.map(async (doc) => {
          // Lấy thông tin chi tiết câu hỏi từ collection riêng
          const questionsResponse = await databases.listDocuments(
            DATABASE_ID,
            QUESTIONS_COLLECTION_ID,
            [Query.equal("exerciseId", doc.$id)]
          );

          return {
            id: doc.$id,
            type: doc.type,
            title: doc.title,
            content: doc.content || [],
            questions: questionsResponse.documents.map((q) => ({
              id: q.$id,
              exerciseId: q.exerciseId || "",
              image: q.image || "",
              prompt: q.prompt || "",
              options: q.options || [],
              answer: q.answer || "",
              prefix: q.prefix || "",
              suffix: q.suffix || "",
              word: q.word || "",
              toneOptions: q.toneOptions || [],
            })),
            grade: doc.grade,
            level: doc.level,
          };
        })
      );

      setExercises(exercisesData);
    } catch (error) {
      console.error("Error fetching exercises:", error);
      toast.error("Không thể tải danh sách bài tập");
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (file: File): Promise<string> => {
    try {
      const uploadedFile = await storage.createFile(
        BUCKET_ID,
        ID.unique(),
        file
      );
      return uploadedFile.$id; // Chỉ trả về ID của file, không phải URL đầy đủ
    } catch (error) {
      console.error("Error uploading image:", error);
      throw new Error("Không thể tải lên hình ảnh");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Tạo một mảng content đơn giản chỉ chứa ID của các câu hỏi
      const contentIds: string[] = [];

      // Dữ liệu cho exercise chính
      const exerciseData = {
        title: formData.title,
        type: formData.type,
        grade: formData.grade,
        level: formData.level,
        content: contentIds, // Mảng rỗng ban đầu
      };

      let exerciseId: string;

      // Tạo hoặc cập nhật exercise
      if (isEditing && currentExercise) {
        await databases.updateDocument(
          DATABASE_ID,
          EXERCISES_COLLECTION_ID,
          currentExercise.id,
          exerciseData
        );
        exerciseId = currentExercise.id;

        // Xóa các câu hỏi cũ
        for (const question of currentExercise.questions) {
          try {
            await databases.deleteDocument(
              DATABASE_ID,
              QUESTIONS_COLLECTION_ID,
              question.id
            );
          } catch (error) {
            console.error("Error deleting old question:", error);
          }
        }
      } else {
        const newExercise = await databases.createDocument(
          DATABASE_ID,
          EXERCISES_COLLECTION_ID,
          ID.unique(),
          exerciseData
        );
        exerciseId = newExercise.$id;
      }

      // Tạo các câu hỏi và lưu vào collection riêng
      for (const question of formData.questions) {
        const questionId = question.id;
        const imageFile = imageFiles[questionId];

        let imageFileId = "";
        if (imageFile) {
          imageFileId = await handleImageUpload(imageFile);
        } else if (question.image) {
          imageFileId = question.image; // Giữ lại ID hiện tại nếu không có file mới
        }

        // Lưu chi tiết câu hỏi - không lưu URL đầy đủ mà chỉ lưu file ID
        const questionData = {
          exerciseId: exerciseId,
          image: imageFileId,
          prompt: question.prompt || "",
          options: question.options || [],
          answer: question.answer || "",
          prefix: question.prefix || "",
          suffix: question.suffix || "",
          word: question.word || "",
          toneOptions: question.toneOptions || [],
        };

        const newQuestion = await databases.createDocument(
          DATABASE_ID,
          QUESTIONS_COLLECTION_ID,
          ID.unique(),
          questionData
        );

        // Thêm ID của câu hỏi vào mảng content
        contentIds.push(newQuestion.$id);
      }

      // Cập nhật lại exercise với danh sách contentIds đã tạo
      await databases.updateDocument(
        DATABASE_ID,
        EXERCISES_COLLECTION_ID,
        exerciseId,
        { content: contentIds }
      );

      toast.success(
        isEditing
          ? "Cập nhật bài tập thành công!"
          : "Thêm bài tập mới thành công!"
      );
      closeModal();
      fetchExercises();
    } catch (error) {
      console.error("Error saving exercise:", error);
      toast.error("Có lỗi xảy ra khi lưu bài tập");
    } finally {
      setSubmitting(false);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setIsEditing(false);
    setCurrentExercise(null);
    setFormData({
      title: "",
      type: "wordCompletion",
      grade: 1,
      level: "beginner",
      questions: [
        {
          id: "1",
          exerciseId: "",
          image: "",
          prompt: "",
          options: ["", "", ""],
          answer: "",
          toneOptions: [],
          word: "",
          prefix: "",
          suffix: "",
        },
      ],
    });
    setImageFiles({});
  };

  const handleEdit = (exercise: Exercise) => {
    setCurrentExercise(exercise);
    setFormData({
      title: exercise.title,
      type: exercise.type,
      grade: exercise.grade,
      level: exercise.level,
      questions: exercise.questions.map((q) => ({
        ...q,
        // Đảm bảo tất cả các trường đều tồn tại
        image: q.image || "",
        prompt: q.prompt || "",
        options: q.options || [],
        answer: q.answer || "",
        prefix: q.prefix || "",
        suffix: q.suffix || "",
        word: q.word || "",
        toneOptions: q.toneOptions || [],
      })),
    });
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Bạn có chắc chắn muốn xóa bài tập này?")) {
      try {
        // Tìm exercise để lấy danh sách câu hỏi
        const exercise = exercises.find((ex) => ex.id === id);

        if (exercise) {
          // Xóa tất cả câu hỏi liên quan
          for (const question of exercise.questions) {
            try {
              await databases.deleteDocument(
                DATABASE_ID,
                QUESTIONS_COLLECTION_ID,
                question.id
              );
            } catch (error) {
              console.error("Error deleting question:", error);
            }
          }
        }

        // Xóa exercise chính
        await databases.deleteDocument(
          DATABASE_ID,
          EXERCISES_COLLECTION_ID,
          id
        );

        toast.success("Xóa bài tập thành công!");
        fetchExercises();
      } catch (error) {
        console.error("Error deleting exercise:", error);
        toast.error("Có lỗi xảy ra khi xóa bài tập");
      }
    }
  };

  const addQuestion = () => {
    setFormData({
      ...formData,
      questions: [
        ...formData.questions,
        {
          id: Date.now().toString(),
          exerciseId: "",
          image: "",
          prompt: "",
          options: ["", "", ""],
          answer: "",
          toneOptions: [],
          word: "",
          prefix: "",
          suffix: "",
        },
      ],
    });
  };

  const removeQuestion = (index: number) => {
    const newQuestions = [...formData.questions];
    newQuestions.splice(index, 1);
    setFormData({
      ...formData,
      questions: newQuestions,
    });
  };

  const handleQuestionChange = (index: number, field: string, value: any) => {
    const newQuestions = [...formData.questions];
    newQuestions[index] = {
      ...newQuestions[index],
      [field]: value,
    };
    setFormData({
      ...formData,
      questions: newQuestions,
    });
  };

  const handleImageChange = (questionId: string, file: File | null) => {
    setImageFiles({
      ...imageFiles,
      [questionId]: file,
    });
  };

  const renderQuestionForm = () => {
    const { type, questions } = formData;

    return (
      <div className="space-y-6 mt-6">
        <h3 className="font-medium">Câu hỏi</h3>

        {questions.map((question, index) => (
          <div
            key={index}
            className="border border-gray-200 rounded-lg p-4 relative"
          >
            <button
              type="button"
              className="absolute top-2 right-2 text-red-500 hover:text-red-700"
              onClick={() => removeQuestion(index)}
              disabled={questions.length <= 1}
            >
              <Trash2 className="w-4 h-4" />
            </button>

            <div className="space-y-4">
              {/* Phần upload hình ảnh */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hình ảnh
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      handleImageChange(question.id, file);
                    }}
                    className="hidden"
                    id={`image-upload-${index}`}
                  />
                  <label
                    htmlFor={`image-upload-${index}`}
                    className="cursor-pointer block"
                  >
                    {imageFiles[question.id] ? (
                      <div className="flex flex-col items-center">
                        <img
                          src={URL.createObjectURL(imageFiles[question.id]!)}
                          alt="Preview"
                          className="w-32 h-32 object-cover rounded-lg mb-2"
                        />
                        <span className="text-sm text-gray-500">
                          {imageFiles[question.id]!.name}
                        </span>
                      </div>
                    ) : question.image ? (
                      <div className="flex flex-col items-center">
                        <img
                          src={storage
                            .getFileView(BUCKET_ID, question.image)
                            .toString()}
                          alt="Current"
                          className="w-32 h-32 object-cover rounded-lg mb-2"
                          onError={(e) => {
                            console.error("Error loading image");
                            e.currentTarget.src =
                              "https://via.placeholder.com/150";
                          }}
                        />
                        <span className="text-sm text-gray-500">
                          Hình ảnh hiện tại
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <Upload className="w-8 h-8 text-gray-400 mb-2" />
                        <span className="text-sm text-gray-500">
                          Tải lên hình ảnh
                        </span>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              {/* Các trường dữ liệu dựa trên loại bài tập */}
              {type === "wordCompletion" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phần đầu
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      value={question.prefix || ""}
                      onChange={(e) =>
                        handleQuestionChange(index, "prefix", e.target.value)
                      }
                      placeholder="Phần trước ô trống"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phần sau
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      value={question.suffix || ""}
                      onChange={(e) =>
                        handleQuestionChange(index, "suffix", e.target.value)
                      }
                      placeholder="Phần sau ô trống"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Đáp án
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      value={question.answer || ""}
                      onChange={(e) =>
                        handleQuestionChange(index, "answer", e.target.value)
                      }
                      placeholder="Đáp án đúng"
                    />
                  </div>
                </>
              )}

              {type === "wordSelection" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Các lựa chọn
                    </label>
                    {question.options?.map((option, i) => (
                      <div key={i} className="flex gap-2 mb-2">
                        <input
                          type="text"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                          value={option}
                          onChange={(e) => {
                            const newOptions = [...question.options];
                            newOptions[i] = e.target.value;
                            handleQuestionChange(index, "options", newOptions);
                          }}
                          placeholder={`Lựa chọn ${i + 1}`}
                        />

                        <button
                          type="button"
                          className="p-2 bg-blue-50 text-blue-500 rounded-lg"
                          onClick={() =>
                            handleQuestionChange(index, "answer", option)
                          }
                        >
                          {option === question.answer ? "✓" : "Chọn đáp án"}
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {type === "toneMarking" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Từ cần đánh dấu
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      value={question.word || ""}
                      onChange={(e) =>
                        handleQuestionChange(index, "word", e.target.value)
                      }
                      placeholder="Từ cần đánh dấu"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Các dấu thanh
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      value={(question.toneOptions || []).join(", ")}
                      onChange={(e) => {
                        const tones = e.target.value
                          .split(",")
                          .map((t) => t.trim());
                        handleQuestionChange(index, "toneOptions", tones);
                      }}
                      placeholder="Nhập các dấu thanh, phân cách bằng dấu phẩy"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Dấu thanh đúng
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      value={question.answer || ""}
                      onChange={(e) =>
                        handleQuestionChange(index, "answer", e.target.value)
                      }
                      placeholder="Dấu thanh đúng"
                    />
                  </div>
                </>
              )}

              {type === "wordWriting" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Yêu cầu
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      value={question.prompt || ""}
                      onChange={(e) =>
                        handleQuestionChange(index, "prompt", e.target.value)
                      }
                      placeholder="Yêu cầu viết từ gì"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Đáp án
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      value={question.answer || ""}
                      onChange={(e) =>
                        handleQuestionChange(index, "answer", e.target.value)
                      }
                      placeholder="Đáp án đúng"
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        ))}

        <button
          type="button"
          className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center gap-2 text-gray-600 hover:bg-gray-50"
          onClick={addQuestion}
        >
          <Plus className="w-4 h-4" />
          Thêm câu hỏi
        </button>
      </div>
    );
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-semibold">Quản lý bài tập tiếng Việt</h2>
          <p className="text-gray-600">
            Thêm và quản lý các bài tập ghép chữ, đánh dấu thanh điệu và viết
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Thêm bài tập mới
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {exercises.map((exercise) => (
            <div
              key={exercise.id}
              className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden"
            >
              <div className="p-4 border-b border-gray-100">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium text-lg">{exercise.title}</h3>
                    <span className="inline-block px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full mt-2">
                      {exercise.type === "wordCompletion" &&
                        "Điền từ vào chỗ trống"}
                      {exercise.type === "wordSelection" && "Chọn từ phù hợp"}
                      {exercise.type === "toneMarking" && "Đánh dấu thanh điệu"}
                      {exercise.type === "wordWriting" && "Viết từ"}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(exercise)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(exercise.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
              <div className="p-4">
                <div className="flex flex-wrap gap-2">
                  <span className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded-full">
                    Lớp {exercise.grade}
                  </span>
                  <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                    {exercise.level === "beginner" && "Cơ bản"}
                    {exercise.level === "intermediate" && "Trung cấp"}
                    {exercise.level === "advanced" && "Nâng cao"}
                  </span>
                </div>
                <div className="mt-4 text-sm text-gray-500">
                  {exercise.questions.length} câu hỏi
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {exercises.length === 0 && !loading && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-12 text-center">
          <p className="text-gray-500 mb-4">Chưa có bài tập nào</p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Thêm bài tập mới
          </button>
        </div>
      )}

      {/* Modal thêm/sửa bài tập */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-3xl p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold mb-4">
              {isEditing ? "Chỉnh sửa bài tập" : "Thêm bài tập mới"}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tiêu đề bài tập
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="Nhập tiêu đề bài tập"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Loại bài tập
                  </label>
                  <select
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        type: e.target.value as Exercise["type"],
                      })
                    }
                  >
                    <option value="wordCompletion">
                      Điền từ vào chỗ trống
                    </option>
                    <option value="wordSelection">Chọn từ phù hợp</option>
                    <option value="toneMarking">Đánh dấu thanh điệu</option>
                    <option value="wordWriting">Viết từ</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Lớp
                  </label>
                  <select
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    value={formData.grade}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        grade: parseInt(e.target.value),
                      })
                    }
                  >
                    {[1, 2, 3, 4, 5].map((grade) => (
                      <option key={grade} value={grade}>
                        Lớp {grade}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cấp độ
                </label>
                <div className="flex gap-4">
                  {["beginner", "intermediate", "advanced"].map((level) => (
                    <label
                      key={level}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <input
                        type="radio"
                        name="level"
                        value={level}
                        checked={formData.level === level}
                        onChange={() =>
                          setFormData({
                            ...formData,
                            level: level as Exercise["level"],
                          })
                        }
                        className="w-4 h-4 text-blue-600"
                      />
                      <span>
                        {level === "beginner" && "Cơ bản"}
                        {level === "intermediate" && "Trung cấp"}
                        {level === "advanced" && "Nâng cao"}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {renderQuestionForm()}

              {/* Nút submit có thêm trạng thái loading */}
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={submitting}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>
                        {isEditing ? "Đang cập nhật..." : "Đang thêm mới..."}
                      </span>
                    </>
                  ) : (
                    <span>{isEditing ? "Cập nhật" : "Thêm mới"}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VietnameseExercisesManagement;
