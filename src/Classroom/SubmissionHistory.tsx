import { useState, useEffect } from "react";
import { useAuth } from "../contexts/auth/authProvider";
import { Models, Query } from "appwrite";
import {
  FileText,
  Download,
  Eye,
  Clock,
  MessageCircle,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";

interface SubmissionHistory extends Models.Document {
  title: string;
  description: string;
  files: string[];
  submittedAt: string;
  score?: number;
  feedback?: string;
  status: "submitted" | "graded";
  assignmentId: string;
  classroomId: string;
  userId: string;
}

const SubmissionHistory = ({ classroomId }: { classroomId: string }) => {
  const [submissions, setSubmissions] = useState<SubmissionHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { databases, storage, account } = useAuth();

  const DATABASE_ID = "674e5e7a0008e19d0ef0";
  const SUBMISSIONS_COLLECTION_ID = "6756674e003d4c4b8344";
  const BUCKET_ID = "676227ce00218f605bbb";
  const ASSIGNMENTS_COLLECTION_ID = "67566466003b28582c75";

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      const user = await account.get();

      // Lấy danh sách bài nộp của học sinh
      const response = await databases.listDocuments<SubmissionHistory>(
        DATABASE_ID,
        SUBMISSIONS_COLLECTION_ID,
        [
          Query.equal("userId", [user.$id]),
          Query.equal("classroomId", [classroomId]),
          Query.orderDesc("$createdAt"),
        ]
      );

      if (response.documents.length === 0) {
        // Trường hợp không có bài nộp
        setSubmissions([]); // Set mảng rỗng
        setLoading(false);
        return; // Thoát khỏi hàm luôn
      }

      // Nếu có bài nộp thì tiếp tục xử lý như bình thường
      const assignmentIds = response.documents.map((sub) => sub.assignmentId);
      const assignmentsResponse = await databases.listDocuments(
        DATABASE_ID,
        ASSIGNMENTS_COLLECTION_ID,
        [Query.equal("$id", assignmentIds)]
      );

      const submissionsWithDetails = response.documents.map((submission) => {
        const assignment = assignmentsResponse.documents.find(
          (a) => a.$id === submission.assignmentId
        );
        return {
          ...submission,
          title: assignment?.title || "Không tìm thấy bài tập",
        };
      });

      setSubmissions(submissionsWithDetails as SubmissionHistory[]);
    } catch (error) {
      console.error("Error fetching submissions:", error);
      setError("Không thể tải lịch sử nộp bài");
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 rounded-lg flex items-center gap-2">
        <AlertCircle className="w-5 h-5 text-red-600" />
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (submissions.length === 0) {
    return (
      <div className="text-center py-8">
        <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Chưa có bài tập nào được nộp
        </h3>
        <p className="text-gray-500">
          Bạn chưa nộp bài tập nào trong lớp học này
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
      {submissions.map((submission) => (
        <div
          key={submission.$id}
          className="bg-white rounded-lg shadow p-4 space-y-3"
        >
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-medium text-gray-900">{submission.title}</h3>
              <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                <Clock className="w-4 h-4" />
                <span>
                  Nộp lúc:{" "}
                  {format(new Date(submission.submittedAt), "dd/MM/yyyy HH:mm")}
                </span>
              </div>
            </div>
            {submission.status === "graded" && (
              <div className="bg-blue-50 px-3 py-1 rounded-full">
                <span className="text-sm font-medium text-blue-700">
                  {submission.score !== undefined
                    ? `${submission.score.toFixed(1)} điểm`
                    : "Đã chấm"}
                </span>
              </div>
            )}
          </div>

          {submission.description && (
            <p className="text-sm text-gray-600">{submission.description}</p>
          )}

          {submission.feedback && (
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <MessageCircle className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">
                  Nhận xét của giáo viên:
                </span>
              </div>
              <p className="text-sm text-gray-600">{submission.feedback}</p>
            </div>
          )}

          {submission.files && submission.files.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleViewFile(submission.files[0])}
                className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <Eye className="w-4 h-4" /> Xem
              </button>
              <button
                onClick={() => handleDownloadFile(submission.files[0])}
                className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <Download className="w-4 h-4" /> Tải xuống
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default SubmissionHistory;
