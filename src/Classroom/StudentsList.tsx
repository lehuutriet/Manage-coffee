import React, { useState, useEffect } from "react";
import { UserCircle, UserMinus, Users } from "lucide-react";
import { useAuth } from "../contexts/auth/authProvider";
import { ExecutionMethod } from "appwrite";

interface StudentsListProps {
  classroomId: string;
  participants: string[];
  onRemoveStudent?: (studentId: string) => void;
}

const StudentsList: React.FC<StudentsListProps> = ({
  participants,
  onRemoveStudent,
}) => {
  const [userRole, setUserRole] = useState<string>("");
  const [users, setUsers] = useState<any[]>([]);
  const { account, functions } = useAuth();
  const functionId = "6746ea5c6eaf6e2b78ad";
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<string | null>(null);
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const user = await account.get();
        setUserRole(user.labels?.[0] || "");
      } catch (error) {
        console.error("Error getting current user:", error);
      }
    };
    getCurrentUser();
    fetchUsers();
  }, [account]);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const response = await functions.createExecution(
        functionId,
        JSON.stringify({ limit: 1000000 }),
        false,
        "/list-users",
        ExecutionMethod.POST
      );

      if (response?.responseBody) {
        const result = JSON.parse(response.responseBody);
        if (Array.isArray(result)) {
          setUsers(result);
        }
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const isStaffMember = () => {
    return ["Admin", "Teacher"].includes(userRole);
  };

  const handleRemove = (studentId: string) => {
    setStudentToDelete(studentId);
    setShowDeleteModal(true);
  };

  const getUserInfo = (userId: string) => {
    return users.find((user) => user.id === userId);
  };
  const studentParticipants = participants.filter((participantId) => {
    const userInfo = getUserInfo(participantId);
    return (
      !userInfo?.labels?.includes("Admin") &&
      !userInfo?.labels?.includes("Teacher")
    );
  });
  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6">
        <h2 className="text-xl font-semibold mb-4">Danh sách học sinh</h2>
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="size-12 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin"></div>
            <div className="mt-4 text-gray-600 text-sm font-medium text-center">
              Đang tải danh sách học sinh...
            </div>
          </div>
        ) : studentParticipants.length > 0 ? (
          <div className="space-y-4">
            {studentParticipants.map((participantId) => {
              const userInfo = getUserInfo(participantId);
              return (
                <div
                  key={participantId}
                  className="p-4 border rounded-lg flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <UserCircle className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-medium">
                        {userInfo?.name || "Đang tải..."}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {userInfo?.email || participantId}
                      </p>
                    </div>
                  </div>
                  {isStaffMember() && (
                    <button
                      className="text-red-500 hover:text-red-700 p-2 rounded-lg"
                      onClick={() => handleRemove(participantId)}
                    >
                      <UserMinus className="w-5 h-5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Chưa có học sinh nào
            </h3>
            <p className="text-gray-500">
              Lớp học này hiện chưa có học sinh tham gia
            </p>
          </div>
        )}
      </div>
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Xác nhận xóa
            </h3>
            <p className="text-gray-500 mb-6">
              Bạn có chắc chắn muốn xóa học sinh này khỏi lớp?
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Hủy
              </button>
              <button
                onClick={() => {
                  if (studentToDelete) {
                    onRemoveStudent?.(studentToDelete);
                    setShowDeleteModal(false);
                    setStudentToDelete(null);
                  }
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentsList;
