import { useEffect, useState } from "react";
import { useAuth } from "../contexts/auth/authProvider";
import { toast } from "react-hot-toast";
import Navigation from "../Navigation/Navigation";
import { motion } from "framer-motion";
import { useSearchParams } from "react-router-dom";
import {
  FiMessageSquare,
  FiSend,
  FiList,
  FiFileText,
  FiClock,
  FiImage,
} from "react-icons/fi";
import EducationalFooter from "../EducationalFooter/EducationalFooter";
import { ID, Query, ExecutionMethod } from "appwrite";
import { X } from "lucide-react";

interface FeedbackData {
  id: string;
  title: string;
  category: string;
  description: string;
  status: string;
  createdAt: string;
  response?: string;
  userId: string;
  userName?: string;
  respondedBy?: string;
  respondedAt?: string;
  imageId?: string;
  bucketId?: string;
}

// Di chuyển ReplyModal ra khỏi component chính

const FeedbackForm = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("form");
  const [feedback, setFeedback] = useState({
    title: "",
    category: "general",
    description: "",
    imageFile: null as File | null,
    imagePreview: null as string | null,
  });
  const [feedbackHistory, setFeedbackHistory] = useState<FeedbackData[]>([]);
  const { functions, account, databases, storage } = useAuth();
  const [userRole, setUserRole] = useState<string>("");
  const [isReplyModalOpen, setIsReplyModalOpen] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackData | null>(
    null
  );
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [isImagePreviewOpen, setIsImagePreviewOpen] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState("");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [feedbackToDelete, setFeedbackToDelete] = useState<{
    id: string;
    imageId?: string;
    bucketId?: string;
  } | null>(null);
  // Constants cho database
  const DATABASE_ID = "674e5e7a0008e19d0ef0";
  const FEEDBACK_COLLECTION = "6780c50f001cc1040f37";
  const BUCKET_ID_CHO_FEEDBACK = "6780d1fa0000a5e9ea6f";
  const NOTIFICATION_COLLECTION = "6780e316003b3a0ade3c";
  const functionId = "6746ea5c6eaf6e2b78ad";
  const categoryMap: { [key: string]: string } = {
    general: "Chung",
    technical: "Kỹ thuật",
    content: "Nội dung",
    suggestion: "Đề xuất",
  };
  const [searchParams] = useSearchParams();
  const feedbackId = searchParams.get("id");
  const ReplyModal = ({
    isOpen,
    onClose,
    feedback,
    onSubmit,
  }: {
    isOpen: boolean;
    onClose: () => void;
    feedback: FeedbackData | null;
    onSubmit: (text: string) => void;
  }) => {
    if (!isOpen || !feedback) return null;

    const [replyText, setReplyText] = useState("");

    const handleSubmit = () => {
      onSubmit(replyText);
      setReplyText("");
    };

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-6 max-w-lg w-full mx-4">
          <h3 className="text-xl font-bold mb-4">Trả lời phản hồi</h3>

          <div className="mb-4">
            <p className="text-gray-600">{feedback.description}</p>
          </div>

          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            rows={4}
            className="w-full p-3 border rounded-lg mb-4"
            placeholder="Nhập nội dung phản hồi..."
          />

          <div className="flex justify-end gap-4">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              Hủy
            </button>
            <button
              onClick={handleSubmit}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              Gửi phản hồi
            </button>
          </div>
        </div>
      </div>
    );
  };

  const ImagePreviewModal = ({
    isOpen,
    imageUrl,
    onClose,
  }: {
    isOpen: boolean;
    imageUrl: string;
    onClose: () => void;
  }) => {
    if (!isOpen) return null;

    return (
      <div
        className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <div className="relative w-full max-w-[95vw] max-h-[95vh] flex items-center justify-center">
          <img
            src={imageUrl}
            alt="Preview"
            className="w-full h-full object-contain"
            onClick={(e) => e.stopPropagation()}
            style={{ maxHeight: "90vh" }}
          />
          <button
            className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 rounded-full"
            onClick={onClose}
          >
            <X className="w-6 h-6 text-white" />
          </button>
        </div>
      </div>
    );
  };

  const DeleteConfirmationModal = ({
    isOpen,
    onClose,
    onConfirm,
  }: {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
  }) => {
    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Xác nhận xóa</h3>
          <p className="text-gray-600 mb-6">
            Bạn có chắc chắn muốn xóa phản hồi này? Hành động này không thể hoàn
            tác.
          </p>
          <div className="flex justify-end gap-4">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              Hủy
            </button>
            <button
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              Xác nhận xóa
            </button>
          </div>
        </div>
      </div>
    );
  };
  useEffect(() => {
    if (feedbackId) {
      setActiveTab("list");

      // Thêm delay nhỏ để đảm bảo DOM đã render
      setTimeout(() => {
        // Tìm element của feedback cụ thể
        const feedbackElement = document.getElementById(
          `feedback-${feedbackId}`
        );
        if (feedbackElement) {
          feedbackElement.scrollIntoView({ behavior: "smooth" });
          // Có thể thêm highlight effect
          feedbackElement.classList.add("bg-yellow-50");
          setTimeout(() => {
            feedbackElement.classList.remove("bg-yellow-50");
          }, 2000);
        }
      }, 100);
    }
  }, [feedbackId]);

  // Thay đổi hàm createNotification để truncate message
  const createNotification = async (data: {
    userId: string;
    title: string;
    message: string;
    type: "feedback_response" | "new_feedback";
    feedbackId: string;
  }) => {
    try {
      // Truncate message to max 30 chars if needed
      const truncatedMessage =
        data.message.length > 30
          ? data.message.substring(0, 27) + "..."
          : data.message;

      await databases.createDocument(
        DATABASE_ID,
        NOTIFICATION_COLLECTION,
        ID.unique(),
        {
          ...data,
          message: truncatedMessage, // Use truncated message
          isRead: false,
          createdAt: new Date().toISOString(),
        }
      );
    } catch (error) {
      console.error("Error creating notification:", error);
    }
  };
  // Lấy role user
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const user = await account.get();
        setUserRole(user.labels?.[0] || "");
      } catch (error) {
        console.error("Error getting user role:", error);
      }
    };
    getCurrentUser();
  }, []);
  const handleDeleteFeedback = async (
    feedbackId: string,
    imageId?: string,
    bucketId?: string
  ) => {
    setFeedbackToDelete({ id: feedbackId, imageId, bucketId });
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!feedbackToDelete) return;

    try {
      // Xóa ảnh nếu có
      if (feedbackToDelete.imageId && feedbackToDelete.bucketId) {
        await storage.deleteFile(
          feedbackToDelete.bucketId,
          feedbackToDelete.imageId
        );
      }

      // Xóa document feedback
      await databases.deleteDocument(
        DATABASE_ID,
        FEEDBACK_COLLECTION,
        feedbackToDelete.id
      );

      // Cập nhật state trực tiếp
      setFeedbackHistory((prev) =>
        prev.filter((item) => item.id !== feedbackToDelete.id)
      );

      toast.success("Đã xóa phản hồi thành công");
      setIsDeleteModalOpen(false);
    } catch (error) {
      console.error("Error deleting feedback:", error);
      toast.error("Không thể xóa phản hồi");
    }
  };
  // Fetch feedback với thêm thông tin người gửi
  const fetchFeedbackHistory = async () => {
    try {
      const user = await account.get();
      let query = [];

      if (!["Admin"].includes(userRole)) {
        query.push(Query.equal("userId", user.$id));
      }

      const response = await databases.listDocuments(
        DATABASE_ID,
        FEEDBACK_COLLECTION,
        query
      );

      const feedbackData = response.documents.map((doc) => ({
        id: doc.$id,
        title: doc.title,
        category: doc.category,
        description: doc.description,
        status: doc.status,
        createdAt: doc.createdAt,
        response: doc.response,
        userId: doc.userId,
        userName: doc.userName || "Unknown User", // Lấy userName từ document
        respondedBy: doc.respondedBy,
        respondedAt: doc.respondedAt,
        imageId: doc.imageId,
        bucketId: doc.bucketId,
      }));

      setFeedbackHistory(feedbackData);
    } catch (error) {
      console.error("Error fetching feedback:", error);
      toast.error("Không thể tải lịch sử phản hồi");
    }
  };
  useEffect(() => {
    fetchFeedbackHistory();
  }, [userRole]);

  // Hàm xử lý phản hồi của admin
  const handleReply = async (replyText: string) => {
    if (!selectedFeedback || !replyText.trim()) return;

    try {
      const user = await account.get();

      await databases.updateDocument(
        DATABASE_ID,
        FEEDBACK_COLLECTION,
        selectedFeedback.id,
        {
          response: replyText,
          status: "Đã xử lý",
          respondedBy: user.name,
          respondedAt: new Date().toISOString(),
        }
      );

      // Cập nhật state trực tiếp thay vì fetch lại
      setFeedbackHistory((prev) =>
        prev.map((feedback) => {
          if (feedback.id === selectedFeedback.id) {
            return {
              ...feedback,
              response: replyText,
              status: "Đã xử lý",
              respondedBy: user.name,
              respondedAt: new Date().toISOString(),
            };
          }
          return feedback;
        })
      );

      setIsReplyModalOpen(false);
      setSelectedFeedback(null);
      toast.success("Đã gửi phản hồi thành công!");

      // Tạo thông báo cho người gửi feedback
      await createNotification({
        userId: selectedFeedback.userId,
        type: "feedback_response",
        title: "Phản hồi mới",
        message: `Admin đã trả lời phản hồi "${selectedFeedback.title}" của bạn`,
        feedbackId: selectedFeedback.id,
      });
    } catch (error) {
      console.error("Error replying to feedback:", error);
      toast.error("Không thể gửi phản hồi");
    }
  };
  // Submit feedback
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!feedback.title || !feedback.description) {
      toast.error("Vui lòng điền đầy đủ thông tin!");
      return;
    }

    setIsSubmitting(true);
    try {
      const user = await account.get();
      let feedbackData: any = {
        title: feedback.title,
        category: feedback.category,
        description: feedback.description,
        status: "Đang xử lý",
        createdAt: new Date().toISOString(),
        userId: user.$id,
        userName: user.name,
      };

      if (feedback.imageFile) {
        const uploadedFile = await storage.createFile(
          BUCKET_ID_CHO_FEEDBACK,
          ID.unique(),
          feedback.imageFile
        );

        feedbackData.imageId = uploadedFile.$id;
        feedbackData.bucketId = BUCKET_ID_CHO_FEEDBACK;
      }

      const feedbackDoc = await databases.createDocument(
        DATABASE_ID,
        FEEDBACK_COLLECTION,
        ID.unique(),
        feedbackData
      );

      setFeedbackHistory((prev) => [
        ...prev,
        {
          id: feedbackDoc.$id,
          title: feedbackDoc.title,
          category: feedbackDoc.category,
          description: feedbackDoc.description,
          status: feedbackDoc.status,
          createdAt: feedbackDoc.createdAt,
          userId: feedbackDoc.userId,
          userName: feedbackDoc.userName,
          response: feedbackDoc.response,
          respondedBy: feedbackDoc.respondedBy,
          respondedAt: feedbackDoc.respondedAt,
          imageId: feedbackDoc.imageId,
          bucketId: feedbackDoc.bucketId,
        },
      ]);

      toast.success("Gửi phản hồi thành công!");

      // Reset form
      setFeedback({
        title: "",
        category: "general",
        description: "",
        imageFile: null,
        imagePreview: null,
      });
      // Tạo thông báo cho admin
      try {
        const response = await functions.createExecution(
          functionId,
          JSON.stringify({ limit: 1000000 }),
          false,
          "/list-users",
          ExecutionMethod.POST
        );

        if (response?.responseBody) {
          const users = JSON.parse(response.responseBody);
          const admins = users.filter(
            (user: any) => user.labels && user.labels.includes("Admin")
          );

          for (const admin of admins) {
            await createNotification({
              userId: admin.id,
              type: "new_feedback",
              title: "Phản hồi mới từ người dùng",
              message: `${user.name} đã gửi một phản hồi mới: "${feedback.title}"`,
              feedbackId: feedbackDoc.$id, // Thêm feedbackId của feedback vừa tạo
            });
          }
        }
      } catch (error) {
        console.error("Error notifying admins:", error);
      }
    } catch (error) {
      console.error("Error submitting feedback:", error);
      toast.error("Có lỗi xảy ra khi gửi phản hồi!");
    } finally {
      setIsSubmitting(false);
    }
  };

  const FeedbackList = () => {
    const filteredFeedbacks = feedbackHistory.filter((item) => {
      if (statusFilter === "all") return true;
      if (statusFilter === "pending") return item.status === "Đang xử lý";
      if (statusFilter === "resolved") return item.status === "Đã xử lý";
      return true;
    });

    return (
      <div className="max-w-3xl mx-auto">
        {/* Always show filter controls */}
        <div className="mb-6 flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">
            Trạng thái:
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">Tất cả</option>
            <option value="pending">Đang xử lý</option>
            <option value="resolved">Đã xử lý</option>
          </select>
        </div>

        {/* Show message when no data */}
        {filteredFeedbacks.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Không có phản hồi nào
          </div>
        ) : (
          filteredFeedbacks.map((item, index) => (
            <div
              key={item.id}
              id={`feedback-${item.id}`}
              className="mb-8 flex gap-6"
            >
              <div className="relative flex flex-col items-center">
                <div
                  className={`w-3 h-3 rounded-full mt-2 ${
                    item.status === "Đã xử lý"
                      ? "bg-green-500"
                      : "bg-yellow-500"
                  }`}
                />
                <span className="text-sm text-gray-500">
                  Gửi bởi: {item.userName}
                </span>
                {index !== feedbackHistory.length - 1 && (
                  <div className="h-full w-0.5 bg-gray-200" />
                )}
              </div>

              <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">
                      {item.title}
                    </h3>
                    <span className="inline-block px-3 py-1 text-sm rounded-full bg-purple-100 text-purple-700 mt-2">
                      {categoryMap[item.category] || item.category}
                    </span>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-full text-sm ${
                      item.status === "Đã xử lý"
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
                {item.imageId && item.bucketId && (
                  <div className="mt-4">
                    <img
                      src={storage
                        .getFileView(item.bucketId, item.imageId)
                        .toString()}
                      alt="Feedback attachment"
                      className="max-w-full h-auto rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => {
                        if (item.bucketId && item.imageId) {
                          setPreviewImageUrl(
                            storage
                              .getFileView(item.bucketId, item.imageId)
                              .toString()
                          );
                          setIsImagePreviewOpen(true);
                        }
                      }}
                    />
                  </div>
                )}

                <p className="text-gray-600 mb-4">{item.description}</p>
                {item.response && (
                  <div className="bg-gray-50 rounded-lg p-4 mt-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-gray-700">
                        Phản hồi từ: {item.respondedBy}
                      </span>
                      <span className="text-sm text-gray-500">
                        {new Date(item.respondedAt!).toLocaleDateString(
                          "vi-VN"
                        )}
                      </span>
                    </div>
                    <p className="text-gray-600">{item.response}</p>
                  </div>
                )}

                <div className="flex items-center text-sm text-gray-500 mt-4">
                  <FiClock className="mr-2" />
                  <span>
                    {new Date(item.createdAt).toLocaleDateString("vi-VN")}
                  </span>
                </div>
                <div className="flex items-center gap-4 mt-4">
                  {["Admin"].includes(userRole) && !item.response && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFeedback(item);
                        setIsReplyModalOpen(true);
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
                    >
                      <FiMessageSquare className="w-4 h-4" />
                      Trả lời phản hồi
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() =>
                      handleDeleteFeedback(item.id, item.imageId, item.bucketId)
                    }
                    className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                    Xóa
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    );
  };

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 pt-8 relative overflow-hidden pb-0">
        {/* Decorative Elements */}
        <div className="absolute inset-0 z-0 opacity-40">
          <div className="absolute top-20 left-10 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
          <div className="absolute top-40 right-10 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>
        </div>

        <div className="max-w-4xl mx-auto px-4 pb-12 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/80 backdrop-blur-lg shadow-2xl rounded-3xl p-8 border border-gray-100"
          >
            {/* Header */}
            <div className="text-center mb-10">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-16 h-16 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4"
              >
                <FiMessageSquare className="w-8 h-8 text-white" />
              </motion.div>
              <h2 className="text-4xl font-bold text-gray-900 mb-3 bg-gradient-to-r from-purple-600 to-indigo-600 inline-block text-transparent bg-clip-text">
                Góp ý phản hồi
              </h2>
              <p className="text-gray-600 text-lg">
                Chúng tôi luôn lắng nghe ý kiến của bạn để cải thiện tính năng
              </p>
            </div>

            {/* Tabs */}
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900">
                {activeTab === "form" ? "Gửi phản hồi mới" : "Lịch sử phản hồi"}
              </h2>
              <button
                onClick={() =>
                  setActiveTab(activeTab === "form" ? "list" : "form")
                }
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors"
              >
                {activeTab === "form" ? (
                  <>
                    <FiList className="w-4 h-4" />
                    Xem phản hồi
                  </>
                ) : (
                  <>
                    <FiMessageSquare className="w-4 h-4" />
                    Gửi phản hồi
                  </>
                )}
              </button>
            </div>
            {/* Content */}
            {activeTab === "form" ? (
              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="group">
                  <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                    <FiFileText className="w-4 h-4 mr-2" />
                    Tiêu đề
                  </label>
                  <input
                    type="text"
                    value={feedback.title}
                    onChange={(e) =>
                      setFeedback({ ...feedback, title: e.target.value })
                    }
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:ring-purple-500 transition-all duration-300 bg-white/50 backdrop-blur-sm"
                    placeholder="Nhập tiêu đề phản hồi"
                  />
                </div>

                <div className="group">
                  <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                    <FiList className="w-4 h-4 mr-2" />
                    Danh mục
                  </label>
                  <select
                    value={feedback.category}
                    onChange={(e) =>
                      setFeedback({ ...feedback, category: e.target.value })
                    }
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:ring-purple-500 transition-all duration-300 bg-white/50 backdrop-blur-sm"
                  >
                    <option value="general">Chung</option>
                    <option value="technical">Kỹ thuật</option>
                    <option value="content">Nội dung</option>
                    <option value="suggestion">Đề xuất</option>
                  </select>
                </div>
                <div className="group">
                  <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                    <FiImage className="w-4 h-4 mr-2" />
                    Hình ảnh đính kèm
                  </label>
                  <div className="mt-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          // Xử lý preview và lưu file
                          setFeedback({ ...feedback, imageFile: file });
                        }
                      }}
                      className="block w-full text-sm text-gray-500
        file:mr-4 file:py-2 file:px-4
        file:rounded-full file:border-0
        file:text-sm file:font-semibold
        file:bg-purple-50 file:text-purple-700
        hover:file:bg-purple-100"
                    />
                  </div>
                  {feedback.imagePreview && (
                    <div className="mt-2 relative">
                      <img
                        src={feedback.imagePreview}
                        alt="Preview"
                        className="w-full max-h-48 object-contain rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setFeedback({
                            ...feedback,
                            imageFile: null,
                            imagePreview: null,
                          });
                        }}
                        className="absolute top-2 right-2 p-1 bg-white rounded-full shadow-lg"
                      >
                        <X className="w-4 h-4 text-gray-600" />
                      </button>
                    </div>
                  )}
                </div>
                <div className="group">
                  <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                    <FiMessageSquare className="w-4 h-4 mr-2" />
                    Nội dung chi tiết
                  </label>
                  <textarea
                    rows={5}
                    value={feedback.description}
                    onChange={(e) =>
                      setFeedback({ ...feedback, description: e.target.value })
                    }
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:ring-purple-500 transition-all duration-300 bg-white/50 backdrop-blur-sm"
                    placeholder="Mô tả chi tiết phản hồi của bạn"
                  />
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={isSubmitting}
                  className={`
                    w-full flex items-center justify-center gap-2 py-4 px-6 rounded-xl
                    text-white text-lg font-semibold
                    ${
                      isSubmitting
                        ? "bg-gray-400 cursor-not-allowed"
                        : "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                    }
                    transition-all duration-300 ease-in-out
                    shadow-lg hover:shadow-xl
                    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500
                  `}
                >
                  <FiSend className="w-5 h-5" />
                  {isSubmitting ? "Đang gửi..." : "Gửi phản hồi"}
                </motion.button>
              </form>
            ) : (
              <FeedbackList />
            )}
          </motion.div>
        </div>
        <ReplyModal
          isOpen={isReplyModalOpen}
          onClose={() => {
            setIsReplyModalOpen(false);
            setSelectedFeedback(null);
          }}
          feedback={selectedFeedback}
          onSubmit={handleReply}
        />
        <ImagePreviewModal
          isOpen={isImagePreviewOpen}
          imageUrl={previewImageUrl}
          onClose={() => setIsImagePreviewOpen(false)}
        />
        <DeleteConfirmationModal
          isOpen={isDeleteModalOpen}
          onClose={() => {
            setIsDeleteModalOpen(false);
            setFeedbackToDelete(null);
          }}
          onConfirm={confirmDelete}
        />
        <EducationalFooter></EducationalFooter>
      </div>
    </>
  );
};

export default FeedbackForm;
