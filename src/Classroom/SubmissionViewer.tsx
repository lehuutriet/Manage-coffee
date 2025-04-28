import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/auth/authProvider";
import { Models, Query } from "appwrite";
import {
  Download,
  Eye,
  FileText,
  Clock,
  User,
  AlertCircle,
  X,
  CheckCircle,
  MessageCircle,
} from "lucide-react";
import { format } from "date-fns";

interface Submission extends Models.Document {
  userId: string;
  userName: string;
  description: string;
  files: string[];
  submittedAt: string;
  feedback?: string;
  score?: number;
  assignmentId: string;
  status: "submitted" | "graded";
}

interface SubmissionViewerProps {
  assignmentId: string;
  onClose: () => void;
}

const SubmissionViewer: React.FC<SubmissionViewerProps> = ({
  assignmentId,
  onClose,
}) => {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSubmission, setSelectedSubmission] =
    useState<Submission | null>(null);
  const [feedback, setFeedback] = useState("");
  const [score, setScore] = useState<number | "">("");
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  const { databases, storage } = useAuth();
  const DATABASE_ID = "674e5e7a0008e19d0ef0";
  const SUBMISSIONS_COLLECTION_ID = "6756674e003d4c4b8344";
  const BUCKET_ID = "676227ce00218f605bbb";

  useEffect(() => {
    fetchSubmissions();
  }, [assignmentId]);

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      const response = await databases.listDocuments(
        DATABASE_ID,
        SUBMISSIONS_COLLECTION_ID,
        [Query.equal("assignmentId", [assignmentId])]
      );
      setSubmissions(response.documents as Submission[]);
    } catch (error) {
      console.error("Error fetching submissions:", error);
      setError("Không thể tải danh sách bài nộp");
    } finally {
      setLoading(false);
    }
  };

  const handleViewFile = async (fileId: string) => {
    try {
      const fileUrl = storage.getFileView(BUCKET_ID, fileId);
      window.open(fileUrl.toString(), "_blank");
    } catch (error) {
      console.error("Error viewing file:", error);
      setError("Không thể mở file");
    }
  };

  const handleDownloadFile = async (fileId: string) => {
    try {
      const fileUrl = storage.getFileDownload(BUCKET_ID, fileId);
      const link = document.createElement("a");
      link.href = fileUrl.toString();
      link.download = "";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error downloading file:", error);
      setError("Không thể tải file");
    }
  };

  const validateScore = (value: string) => {
    const num = parseFloat(value);
    return !isNaN(num) && num >= 0 && num <= 10;
  };

  const handleSubmitFeedback = async () => {
    if (!selectedSubmission) return;
    if (score !== "" && !validateScore(score.toString())) {
      setError("Điểm số phải từ 0 đến 10");
      return;
    }

    try {
      setSubmittingFeedback(true);
      await databases.updateDocument(
        DATABASE_ID,
        SUBMISSIONS_COLLECTION_ID,
        selectedSubmission.$id,
        {
          feedback,
          score: score === "" ? null : parseFloat(score.toString()),
          status: "graded",
        }
      );

      // Cập nhật state
      setSubmissions(
        submissions.map((sub) =>
          sub.$id === selectedSubmission.$id
            ? {
                ...sub,
                feedback,
                score: score === "" ? undefined : parseFloat(score.toString()),
                status: "graded",
              }
            : sub
        )
      );
      setSelectedSubmission(null);
      setFeedback("");
      setScore("");
    } catch (error) {
      console.error("Error submitting feedback:", error);
      setError("Không thể gửi nhận xét và điểm");
    } finally {
      setSubmittingFeedback(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl p-6 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-gray-900">
            Danh sách bài nộp
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : submissions.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Chưa có bài nộp
            </h3>
            <p className="text-gray-500">
              Hiện chưa có học sinh nào nộp bài tập này
            </p>
          </div>
        ) : (
          <div className="flex-1 overflow-auto">
            <div className="space-y-4">
              {submissions.map((submission) => (
                <div
                  key={submission.$id}
                  className="bg-gray-50 rounded-lg p-4 space-y-3"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="font-medium text-gray-900">
                          {submission.userName}
                        </span>
                        {submission.status === "graded" && (
                          <div className="flex items-center gap-2">
                            <span className="flex items-center gap-1 text-green-600 text-sm">
                              <CheckCircle className="w-4 h-4" />
                              Đã chấm
                            </span>
                            {submission.score !== undefined && (
                              <span className="text-blue-600 font-medium">
                                ({submission.score.toFixed(1)} điểm)
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Clock className="w-4 h-4" />
                        <span>
                          Nộp lúc:{" "}
                          {format(
                            new Date(submission.submittedAt),
                            "dd/MM/yyyy HH:mm"
                          )}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {submission.files?.length > 0 && (
                        <>
                          <button
                            onClick={() => handleViewFile(submission.files[0])}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Xem file"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() =>
                              handleDownloadFile(submission.files[0])
                            }
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Tải xuống"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => {
                          setSelectedSubmission(submission);
                          setFeedback(submission.feedback || "");
                          setScore(submission.score || "");
                        }}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Chấm điểm và nhận xét"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {submission.description && (
                    <p className="text-gray-600 text-sm">
                      {submission.description}
                    </p>
                  )}

                  {submission.feedback && (
                    <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                      <h4 className="text-sm font-medium text-blue-900 mb-1">
                        Nhận xét của giáo viên:
                      </h4>
                      <p className="text-sm text-blue-800">
                        {submission.feedback}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Modal chấm điểm và nhận xét */}
        {selectedSubmission && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">
                  Chấm điểm và nhận xét bài nộp của{" "}
                  {selectedSubmission.userName}
                </h3>
                <button
                  onClick={() => {
                    setSelectedSubmission(null);
                    setFeedback("");
                    setScore("");
                    setError(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Điểm số (thang điểm 10)
                  </label>
                  <input
                    type="number"
                    value={score}
                    onChange={(e) =>
                      setScore(e.target.value ? parseFloat(e.target.value) : "")
                    }
                    min="0"
                    max="10"
                    step="0.1"
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Nhập điểm (0-10)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nhận xét
                  </label>
                  <textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={4}
                    placeholder="Nhập nhận xét của bạn..."
                  />
                </div>

                <div className="flex justify-end gap-3 mt-4">
                  <button
                    onClick={() => {
                      setSelectedSubmission(null);
                      setFeedback("");
                      setScore("");
                      setError(null);
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={handleSubmitFeedback}
                    disabled={submittingFeedback}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {submittingFeedback ? "Đang gửi..." : "Lưu đánh giá"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SubmissionViewer;
