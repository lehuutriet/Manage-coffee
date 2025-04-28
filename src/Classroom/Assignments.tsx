import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/auth/authProvider";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import {
  Plus,
  Clock,
  CheckCircle,
  FileText,
  Loader2,
  Trash2,
  Download,
  Send,
  Eye,
} from "lucide-react";
import { Models, ID } from "appwrite";
import { Query } from "appwrite";
import { useDataCache } from "../contexts/auth/DataCacheProvider"; // Import DataCache hook
import { format, isPast } from "date-fns";
import SubmissionModal from "./SubmissionModal";
import CreateAssignmentModal from "./CreateAssignmentModal";
import SubmissionViewer from "./SubmissionViewer";
import { useClassroomStore } from "../stores/classroomStore";
interface Assignment extends Models.Document {
  title: string;
  description: string;
  dueDate: string;
  attachments: string[];
  maxScore: number;
  status: "draft" | "published" | "closed";
  classroomId: string;
  createdBy: string;
}
interface CreateAssignmentFormData {
  title: string;
  description: string;
  dueDate: string;
  files: File[];
}
interface Submission extends Models.Document {
  assignmentId: string;
  userId: string;
  userName: string;
  description: string;
  files: {
    id: string;
    name: string;
    size: number;
    type: string;
    uploadedAt: string;
  }[];
  submittedAt: string;

  feedback?: string;
  classroomId: string;
}
interface AssignmentsProps {
  classroomId: string;
}

const Assignments: React.FC<AssignmentsProps> = ({ classroomId }) => {
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] =
    useState<Assignment | null>(null);
  const [submittedAssignments, setSubmittedAssignments] = useState<Set<string>>(
    new Set()
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userRole, setUserRole] = useState<string>("");
  const [, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const { databases, account, storage } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [, setFiles] = useState<File[]>([]);
  const DATABASE_ID = "674e5e7a0008e19d0ef0";
  const ASSIGNMENTS_COLLECTION_ID = "67566466003b28582c75";
  const [showSubmissionViewer, setShowSubmissionViewer] = useState(false);
  const [selectedAssignmentForView, setSelectedAssignmentForView] = useState<
    string | null
  >(null);
  const BUCKET_ID = "6760f19600199434f1c4";
  const { getCachedData, setCachedData, isDataCached } = useDataCache();
  const SUBMISSIONS_COLLECTION_ID = "6756674e003d4c4b8344";
  const BUCKET_Submissions = "676227ce00218f605bbb";
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache
  const ASSIGNMENTS_CACHE_KEY = `assignments-${classroomId}`;
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [, setFormData] = useState({
    title: "",
    description: "",
    dueDate: "",
  });
  const { refreshAssignments } = useClassroomStore();
  const handleOpenSubmitModal = (assignment: Assignment) => {
    setSelectedAssignment(assignment);
    setIsSubmitModalOpen(true);
  };

  const handleCloseSubmitModal = () => {
    setIsSubmitModalOpen(false);
    setSelectedAssignment(null);
  };
  const hasSubmitted = (assignment: Assignment) => {
    return submittedAssignments.has(assignment.$id);
  };
  const handleViewSubmissions = (assignmentId: string) => {
    setSelectedAssignmentForView(assignmentId);
    setShowSubmissionViewer(true);
  };
  const handleSubmitAssignment = async (submissionData: {
    userName: string;
    description: string;
    files: File[];
  }) => {
    if (!selectedAssignment || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const user = await account.get();

      // Kiểm tra submission trong database
      const existingSubmissions = await databases.listDocuments(
        DATABASE_ID,
        SUBMISSIONS_COLLECTION_ID,
        [
          Query.equal("assignmentId", [selectedAssignment.$id]),
          Query.equal("userId", [user.$id]),
          Query.equal("classroomId", [classroomId]),
        ]
      );

      if (existingSubmissions.documents.length > 0) {
        setError("Bạn đã nộp bài tập này rồi!");
        handleCloseSubmitModal();
        return;
      }

      // Upload files
      const fileIds = await Promise.all(
        submissionData.files.map(async (file) => {
          const uploadedFile = await storage.createFile(
            BUCKET_Submissions,
            ID.unique(),
            file
          );
          return uploadedFile.$id;
        })
      );

      // Tạo submission
      const submission = await databases.createDocument(
        DATABASE_ID,
        SUBMISSIONS_COLLECTION_ID,
        ID.unique(),
        {
          assignmentId: selectedAssignment.$id,
          userId: user.$id,
          userName: submissionData.userName,
          description: submissionData.description,
          files: fileIds,
          submittedAt: new Date().toISOString(),
          status: "submitted",
          classroomId: classroomId,
        }
      );

      // Cập nhật UI ngay lập tức
      setSubmittedAssignments(
        (prev) => new Set([...prev, selectedAssignment.$id])
      );
      setSubmissions((prev) => [...prev, submission as Submission]);
      handleCloseSubmitModal();
    } catch (error) {
      console.error("Error submitting assignment:", error);
      setError("Không thể nộp bài. Vui lòng thử lại.");
    } finally {
      setIsSubmitting(false);
    }
  };
  // Đầu tiên thêm hàm downloadFile mới
  const downloadFile = async (fileId: string) => {
    try {
      // Lấy URL download thay vì URL xem
      const fileUrl = storage.getFileDownload(BUCKET_ID, fileId);

      // Tạo thẻ a để download
      const link = document.createElement("a");
      link.href = fileUrl.toString();
      link.download = ""; // Điều này sẽ bắt buộc tải về thay vì mở file
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Lỗi khi tải file:", error);
      setError("Không thể tải file");
    }
  };

  // Hàm để tải nhiều file
  const downloadAllFiles = async (fileIds: string[]) => {
    for (const fileId of fileIds) {
      await downloadFile(fileId);
      // Thêm delay nhỏ giữa các lần tải
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  };
  useEffect(() => {
    const initialize = async () => {
      try {
        const user = await account.get();
        setUserRole(user.labels?.[0] || "");
        setCurrentUserId(user.$id);
        await fetchAssignments();
      } catch (error) {
        console.error("Error initializing:", error);
      }
    };

    initialize();
  }, []);

  // Tạo useEffect riêng cho fetchSubmissions để nó chạy khi currentUserId thay đổi
  useEffect(() => {
    const loadSubmittedAssignments = async () => {
      if (!currentUserId) return;

      try {
        const response = await databases.listDocuments(
          DATABASE_ID,
          SUBMISSIONS_COLLECTION_ID,
          [
            Query.equal("userId", [currentUserId]),
            Query.equal("classroomId", [classroomId]),
          ]
        );

        const submittedIds = new Set(
          response.documents.map((sub: any) => sub.assignmentId)
        );
        setSubmittedAssignments(submittedIds);
      } catch (error) {
        console.error("Error loading submitted assignments:", error);
      }
    };

    loadSubmittedAssignments();
  }, [currentUserId, classroomId]);

  const fetchAssignments = async () => {
    try {
      // Check cache first
      if (isDataCached(ASSIGNMENTS_CACHE_KEY)) {
        const cachedAssignments = getCachedData(ASSIGNMENTS_CACHE_KEY);
        // Filter cached assignments by classroom ID
        const filteredAssignments = cachedAssignments.filter(
          (assignment: Assignment) => assignment.classroomId === classroomId
        );
        setAssignments(filteredAssignments);
        return;
      }

      // If not in cache, fetch from API with filter
      const response = await databases.listDocuments(
        DATABASE_ID,
        ASSIGNMENTS_COLLECTION_ID,
        [
          Query.equal("classroomId", [classroomId]), // Add filter for specific classroom
        ]
      );

      // Update cache and state
      setCachedData(ASSIGNMENTS_CACHE_KEY, response.documents, CACHE_DURATION);
      setAssignments(response.documents as Assignment[]);
    } catch (error) {
      console.error("Error fetching assignments:", error);
      setError("Failed to load assignments");
    }
  };

  const updateAssignmentsCache = (newAssignments: Assignment[]) => {
    setCachedData(ASSIGNMENTS_CACHE_KEY, newAssignments, CACHE_DURATION);
    setAssignments(newAssignments);
  };

  const handleCreateAssignment = async (formData: CreateAssignmentFormData) => {
    setIsCreating(true);
    try {
      const user = await account.get();
      const fileIds = await Promise.all(
        formData.files.map(async (file) => {
          const uploaded = await storage.createFile(
            BUCKET_ID,
            ID.unique(),
            file
          );
          return uploaded.$id;
        })
      );

      const newAssignment = await databases.createDocument(
        DATABASE_ID,
        ASSIGNMENTS_COLLECTION_ID,
        ID.unique(),
        {
          title: formData.title,
          description: formData.description,
          dueDate: formData.dueDate,

          attachments: fileIds,
          classroomId,
          createdBy: user.$id,
        }
      );

      const updatedAssignments = [...assignments, newAssignment as Assignment];
      updateAssignmentsCache(updatedAssignments);
      setIsCreateModalOpen(false);
      resetForm();
      await refreshAssignments({
        classroomId: classroomId,
        databases: databases,
      });
    } catch (error) {
      console.error("Error creating assignment:", error);
      setError("Không thể tạo bài tập. Vui lòng thử lại.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteAssignment = async (assignmentId: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa bài tập này?")) return;

    setIsDeleting(assignmentId);
    try {
      // 1. Lấy thông tin bài tập để có danh sách file đính kèm
      const assignment = assignments.find((a) => a.$id === assignmentId);
      if (!assignment) return;

      // 2. Xóa các file đính kèm của bài tập từ storage
      if (assignment.attachments && assignment.attachments.length > 0) {
        await Promise.all(
          assignment.attachments.map((fileId) =>
            storage.deleteFile(BUCKET_ID, fileId)
          )
        );
      }

      // 3. Lấy danh sách submissions của bài tập này
      const submissionsResponse = await databases.listDocuments(
        DATABASE_ID,
        SUBMISSIONS_COLLECTION_ID,
        [Query.equal("assignmentId", [assignmentId])]
      );

      // 4. Xóa các file trong submissions và xóa submissions
      for (const submission of submissionsResponse.documents) {
        if (submission.files && submission.files.length > 0) {
          // Xóa các file của submission
          await Promise.all(
            submission.files.map((fileId: any) =>
              storage.deleteFile(BUCKET_Submissions, fileId)
            )
          );
        }
        // Xóa submission document
        await databases.deleteDocument(
          DATABASE_ID,
          SUBMISSIONS_COLLECTION_ID,
          submission.$id
        );
      }

      // 5. Cuối cùng xóa document bài tập
      await databases.deleteDocument(
        DATABASE_ID,
        ASSIGNMENTS_COLLECTION_ID,
        assignmentId
      );

      // 6. Cập nhật state và cache
      const updatedAssignments = assignments.filter(
        (assignment) => assignment.$id !== assignmentId
      );
      updateAssignmentsCache(updatedAssignments);
      await refreshAssignments({
        classroomId: classroomId,
        databases: databases,
      });
    } catch (error) {
      console.error("Error deleting assignment:", error);
      setError("Không thể xóa bài tập. Vui lòng thử lại.");
    } finally {
      setIsDeleting(null);
    }
  };
  const handleCloseModal = () => {
    setIsCreateModalOpen(false);
    // Reset form data
    setFormData({
      title: "",
      description: "",
      dueDate: "",
    });
  };
  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      dueDate: "",
    });
    setFiles([]);
  };

  const getSubmissionStatus = (assignment: Assignment) => {
    const submission = submissions.find(
      (s) => s.assignmentId === assignment.$id
    );
    if (!submission) return null;
    return submission.status;
  };

  const isTeacherOrAdmin = () => ["Teacher", "Admin"].includes(userRole);

  const handleDownloadFile = async (fileId: string) => {
    try {
      const fileUrl = storage.getFileView(BUCKET_ID, fileId);
      window.open(fileUrl.toString(), "_blank");
    } catch (error) {
      console.error("Error downloading file:", error);
      setError("Failed to download file");
    }
  };
  const isSubmissionClosed = (assignment: Assignment) => {
    return isPast(new Date(assignment.dueDate));
  };

  return (
    <div className="space-y-6">
      {isTeacherOrAdmin() && (
        <div className="flex justify-end">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Tạo bài tập mới
          </button>
        </div>
      )}

      {/* Assignment Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {assignments.map((assignment) => (
          <Card
            key={assignment.$id}
            className="bg-white shadow-md rounded-lg overflow-hidden hover:shadow-lg transition-shadow duration-300"
          >
            <CardHeader className="bg-gray-50 px-4 py-3">
              <div className="flex justify-between items-center">
                <CardTitle className="text-gray-800 font-semibold">
                  {assignment.title}
                </CardTitle>
                <div className="flex flex-row items-center gap-2">
                  {isTeacherOrAdmin() && (
                    <>
                      <button
                        onClick={() => handleDeleteAssignment(assignment.$id)}
                        className="text-red-500 hover:text-red-700 p-1 rounded relative group"
                        disabled={isDeleting === assignment.$id}
                        title="Xóa bài tập" // Added tooltip
                      >
                        {isDeleting === assignment.$id ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <Trash2 className="w-5 h-5" />
                        )}
                      </button>

                      <button
                        onClick={() => handleViewSubmissions(assignment.$id)}
                        className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Xem bài nộp" // Added tooltip
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <p className="text-gray-600">{assignment.description}</p>

              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-500">
                  Hạn nộp:{" "}
                  {format(new Date(assignment.dueDate), "dd/MM/yyyy HH:mm")}
                </span>
              </div>

              {assignment.attachments?.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-900">
                    Tệp đính kèm
                  </h4>
                  {assignment.attachments.map((fileId, index) => (
                    <button
                      key={index}
                      onClick={() => handleDownloadFile(fileId)}
                      className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
                    >
                      <FileText className="w-4 h-4" />
                      <span>Tài liệu {index + 1}</span>
                    </button>
                  ))}
                </div>
              )}

              <div className="flex justify-between items-center">
                {assignment.attachments?.length > 0 ? (
                  <button
                    onClick={() => downloadAllFiles(assignment.attachments)}
                    className="flex items-center gap-2 text-sm font-medium bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Tải về ({assignment.attachments.length} tập tin)
                  </button>
                ) : (
                  <div className="text-sm text-gray-500">
                    Không có tài liệu đính kèm
                  </div>
                )}

                {/* Submit and Status Section */}
                {hasSubmitted(assignment) ? (
                  <div className="flex items-center gap-2">
                    <span
                      className={`flex items-center gap-1 text-sm font-medium ${
                        getSubmissionStatus(assignment) === "graded"
                          ? "text-green-600"
                          : getSubmissionStatus(assignment) === "submitted"
                          ? "text-blue-600"
                          : "text-purple-600"
                      }`}
                    >
                      <CheckCircle className="w-4 h-4" />
                      {getSubmissionStatus(assignment) === "graded"
                        ? "Đã chấm điểm"
                        : getSubmissionStatus(assignment) === "submitted"
                        ? "Đã nộp"
                        : "Đã nộp bài"}
                    </span>
                  </div>
                ) : (
                  <button
                    onClick={() => handleOpenSubmitModal(assignment)}
                    disabled={isSubmissionClosed(assignment)}
                    className={`px-4 py-2 rounded-lg text-white flex items-center gap-2 ${
                      isSubmissionClosed(assignment)
                        ? "bg-gray-400 cursor-not-allowed"
                        : "bg-blue-600 hover:bg-blue-700"
                    } transition-colors`}
                  >
                    <Send className="w-4 h-4" />
                    <span>
                      {isSubmissionClosed(assignment) ? "Đã đóng" : "Nộp bài"}
                    </span>
                  </button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create Assignment Modal */}
      <CreateAssignmentModal
        isOpen={isCreateModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleCreateAssignment}
        isCreating={isCreating}
      />

      {/* Submit Assignment Modal */}

      <SubmissionModal
        isOpen={isSubmitModalOpen}
        onClose={handleCloseSubmitModal}
        onSubmit={handleSubmitAssignment}
        isSubmitting={isSubmitting}
        selectedAssignment={selectedAssignment}
      />
      {/* Submission Viewer Modal */}
      {showSubmissionViewer && selectedAssignmentForView && (
        <SubmissionViewer
          assignmentId={selectedAssignmentForView}
          onClose={() => {
            setShowSubmissionViewer(false);
            setSelectedAssignmentForView(null);
          }}
        />
      )}
      {/* No assignments message */}
      {assignments.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <FileText className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Chưa có bài tập nào
          </h3>
          <p className="text-gray-500">
            {isTeacherOrAdmin()
              ? "Tạo bài tập đầu tiên cho lớp học của bạn"
              : "Hiện chưa có bài tập nào được giao"}
          </p>
        </div>
      )}
    </div>
  );
};

export default Assignments;
