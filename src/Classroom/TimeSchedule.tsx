import React, { useState, useEffect } from "react";
import { Clock, Plus, X, Save, AlertCircle, Trash2 } from "lucide-react";
import { Card, CardContent } from "../ui/card";
import { useAuth } from "../contexts/auth/authProvider";
import { Models, ID } from "appwrite";
import { useClassroomStore } from "../stores/classroomStore";

interface Schedule extends Models.Document {
  classroomId: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  subject: string;
  room: string;
  teacher: string;
}

interface TimeScheduleProps {
  classroomId: string;
}

const TimeSchedule: React.FC<TimeScheduleProps> = ({ classroomId }) => {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [userRole, setUserRole] = useState("");
  const [selectedDay, setSelectedDay] = useState("monday");
  const { account, databases } = useAuth();

  const DATABASE_ID = "674e5e7a0008e19d0ef0";
  const SCHEDULE_COLLECTION_ID = "675668e500195f7e0e72";
  const { refreshSchedule } = useClassroomStore();
  const [formData, setFormData] = useState({
    dayOfWeek: "",
    startTime: "",
    endTime: "",
    subject: "",
    room: "",
    teacher: "",
  });

  const sessions = {
    morning: { name: "Buổi sáng", time: "07:00 - 11:30" },
    afternoon: { name: "Buổi chiều", time: "13:30 - 17:00" },
    evening: { name: "Buổi tối", time: "18:00 - 21:00" },
  };

  const daysOfWeek = [
    { value: "monday", label: "Thứ 2" },
    { value: "tuesday", label: "Thứ 3" },
    { value: "wednesday", label: "Thứ 4" },
    { value: "thursday", label: "Thứ 5" },
    { value: "friday", label: "Thứ 6" },
    { value: "saturday", label: "Thứ 7" },
    { value: "sunday", label: "Chủ nhật" },
  ];

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
    fetchSchedules();
  }, [account, classroomId]);

  const getSessionForTime = (time: string) => {
    const hour = parseInt(time.split(":")[0]);
    if (hour >= 7 && hour < 12) return "morning";
    if (hour >= 13 && hour < 18) return "afternoon";
    return "evening";
  };

  const isStaffMember = () => {
    return ["Admin", "Teacher"].includes(userRole);
  };

  const sortSchedulesByTime = (schedules: Schedule[]) => {
    return [...schedules].sort((a, b) => {
      // Convert time strings to comparable numbers (e.g., "14:28" -> 1428)
      const timeToNumber = (time: string) => {
        const [hours, minutes] = time.split(":").map(Number);
        return hours * 100 + minutes;
      };

      return timeToNumber(a.startTime) - timeToNumber(b.startTime);
    });
  };

  // Modify the fetchSchedules function to sort schedules after fetching
  const fetchSchedules = async () => {
    try {
      setIsLoading(true);
      const response = await databases.listDocuments<Schedule>(
        DATABASE_ID,
        SCHEDULE_COLLECTION_ID
      );
      const filteredSchedules = response.documents.filter(
        (schedule) => schedule.classroomId === classroomId
      );
      // Sort the schedules before setting them
      setSchedules(sortSchedulesByTime(filteredSchedules));
    } catch (error) {
      console.error("Error fetching schedules:", error);
      setError("Failed to load schedules");
    } finally {
      setIsLoading(false);
    }
  };

  const validateForm = () => {
    if (
      !formData.dayOfWeek ||
      !formData.startTime ||
      !formData.endTime ||
      !formData.subject ||
      !formData.room
    ) {
      setError("Vui lòng điền đầy đủ thông tin");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    if (!isStaffMember()) {
      setError("Bạn không có quyền thêm lịch học");
      return;
    }

    try {
      setIsLoading(true);
      const scheduleData = {
        ...formData,
        classroomId: classroomId,
      };

      await databases.createDocument(
        DATABASE_ID,
        SCHEDULE_COLLECTION_ID,
        ID.unique(),
        scheduleData
      );

      await fetchSchedules();
      setIsModalOpen(false);
      setFormData({
        dayOfWeek: "",
        startTime: "",
        endTime: "",
        subject: "",
        room: "",
        teacher: "",
      });
      setError("");
      await refreshSchedule({
        classroomId: classroomId,
        databases: databases,
      });
    } catch (error: any) {
      console.error("Error creating schedule:", error);
      setError(error.message || "Failed to create schedule");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (scheduleId: string) => {
    if (!isStaffMember()) {
      setError("Bạn không có quyền xóa lịch học");
      return;
    }

    try {
      await databases.deleteDocument(
        DATABASE_ID,
        SCHEDULE_COLLECTION_ID,
        scheduleId
      );
      await fetchSchedules();
      await refreshSchedule({
        classroomId: classroomId,
        databases: databases,
      });
    } catch (error) {
      console.error("Error deleting schedule:", error);
      setError("Failed to delete schedule");
    }
  };

  return (
    <div className="bg-gray-50">
      <div className="w-full">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-xl font-bold text-gray-900">Thời khóa biểu</h1>
          {isStaffMember() && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Thêm lịch học
            </button>
          )}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        <div className="bg-white rounded-lg shadow overflow-hidden">
          {/* Schedule Header */}
          <div className="grid grid-cols-8 bg-gray-50 border-b">
            <div className="p-3 font-bold text-gray-900 border-r text-center">
              Buổi học
            </div>
            {daysOfWeek.map((day) => (
              <div
                key={day.value}
                className="p-3 font-bold text-gray-900 text-center hidden md:block"
              >
                {day.label}
              </div>
            ))}
            {/* Mobile day selector */}
            <div className="col-span-7 p-3 md:hidden">
              <select
                className="w-full p-2 border rounded-lg"
                value={selectedDay}
                onChange={(e) => setSelectedDay(e.target.value)}
              >
                {daysOfWeek.map((day) => (
                  <option key={day.value} value={day.value}>
                    {day.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Schedule Grid */}
          <div className="divide-y">
            {Object.entries(sessions).map(([sessionKey, sessionData]) => (
              <div key={sessionKey} className="grid grid-cols-8">
                <div className="p-3 bg-gray-50 border-r">
                  <div className="font-bold text-gray-900 text-center">
                    {sessionData.name}
                  </div>
                  <div className="text-sm text-gray-500 text-center">
                    {sessionData.time}
                  </div>
                </div>

                {/* Desktop View - All Days */}
                {daysOfWeek.map((day) => (
                  <div
                    key={day.value}
                    className="p-2 min-h-[120px] border-r last:border-r-0 hidden md:block"
                  >
                    {schedules
                      .filter(
                        (schedule) =>
                          schedule.dayOfWeek === day.value &&
                          getSessionForTime(schedule.startTime) === sessionKey
                      )
                      .map((schedule) => (
                        <Card key={schedule.$id} className="mb-2 last:mb-0">
                          <CardContent className="p-2">
                            <div className="flex flex-col items-center justify-center space-y-2">
                              <h4 className="font-bold text-gray-900 text-center w-full">
                                {schedule.subject}
                              </h4>
                              <div className="flex items-center justify-center text-center w-full">
                                <Clock className="w-4 h-4 text-gray-400 mr-1" />
                                <span className="text-gray-400 text-sm">
                                  {schedule.startTime}-{schedule.endTime}
                                </span>
                              </div>
                              <p className="text-sm text-black font-medium text-center w-full">
                                Phòng: {schedule.room}
                              </p>
                              {schedule.teacher && (
                                <p className="text-sm text-black font-medium text-center w-full">
                                  GV: {schedule.teacher}
                                </p>
                              )}
                              {isStaffMember() && (
                                <button
                                  onClick={() => handleDelete(schedule.$id)}
                                  className="text-red-500 hover:text-red-700"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                ))}

                {/* Mobile View - Selected Day Only */}
                <div className="col-span-7 p-2 md:hidden">
                  {schedules
                    .filter(
                      (schedule) =>
                        schedule.dayOfWeek === selectedDay &&
                        getSessionForTime(schedule.startTime) === sessionKey
                    )
                    .map((schedule) => (
                      <Card key={schedule.$id} className="mb-2 last:mb-0">
                        <CardContent className="p-2">
                          <div className="flex flex-col items-center justify-center space-y-2">
                            <h4 className="font-bold text-gray-900 text-center w-full">
                              {schedule.subject}
                            </h4>
                            <div className="flex items-center justify-center text-center w-full">
                              <Clock className="w-4 h-4 text-gray-400 mr-1" />
                              <span className="text-gray-400 text-sm">
                                {schedule.startTime} - {schedule.endTime}
                              </span>
                            </div>
                            <p className="text-sm text-black font-medium text-center w-full">
                              Phòng: {schedule.room}
                            </p>
                            {schedule.teacher && (
                              <p className="text-sm text-black font-medium text-center w-full">
                                GV: {schedule.teacher}
                              </p>
                            )}
                            {isStaffMember() && (
                              <button
                                onClick={() => handleDelete(schedule.$id)}
                                className="text-red-500 hover:text-red-700"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Add Schedule Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">Thêm lịch học mới</h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Thứ
                  </label>
                  <select
                    value={formData.dayOfWeek}
                    onChange={(e) =>
                      setFormData({ ...formData, dayOfWeek: e.target.value })
                    }
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Chọn thứ</option>
                    {daysOfWeek.map((day) => (
                      <option key={day.value} value={day.value}>
                        {day.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Giờ bắt đầu
                    </label>
                    <input
                      type="time"
                      value={formData.startTime}
                      onChange={(e) =>
                        setFormData({ ...formData, startTime: e.target.value })
                      }
                      className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Giờ kết thúc
                    </label>
                    <input
                      type="time"
                      value={formData.endTime}
                      onChange={(e) =>
                        setFormData({ ...formData, endTime: e.target.value })
                      }
                      className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Môn học
                  </label>
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={(e) =>
                      setFormData({ ...formData, subject: e.target.value })
                    }
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Nhập tên môn học"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phòng học
                  </label>
                  <input
                    type="text"
                    value={formData.room}
                    onChange={(e) =>
                      setFormData({ ...formData, room: e.target.value })
                    }
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Nhập phòng học"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Giáo viên
                  </label>
                  <input
                    type="text"
                    value={formData.teacher}
                    onChange={(e) =>
                      setFormData({ ...formData, teacher: e.target.value })
                    }
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Nhập tên giáo viên (không bắt buộc)"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                        <span>Đang xử lý...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>Lưu lịch học</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Loading Indicator */}
        {isLoading && !isModalOpen && (
          <div className="absolute inset-0 bg-white bg-opacity-50 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent" />
              <p className="text-gray-600 font-medium">Đang tải...</p>
            </div>
          </div>
        )}

        {/* Error Toast */}
        {error && (
          <div className="fixed bottom-4 right-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg shadow-lg max-w-sm animate-fade-in">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium">Có lỗi xảy ra</h4>
                <p className="text-sm mt-1">{error}</p>
              </div>
              <button
                onClick={() => setError("")}
                className="text-red-400 hover:text-red-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TimeSchedule;
