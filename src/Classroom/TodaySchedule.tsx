import React, { useEffect } from "react";
import { Clock, MapPin } from "lucide-react";
import { ScheduleItem, useScheduleStore } from "../type/type";
import { RealtimeResponseEvent } from "appwrite";
import { useAuth } from "../contexts/auth/authProvider";
interface TodayScheduleProps {
  schedule: ScheduleItem[];
  classroomId: string;
}

interface SessionSchedule {
  morning: ScheduleItem[];
  afternoon: ScheduleItem[];
  evening: ScheduleItem[];
}

const TodaySchedule: React.FC<TodayScheduleProps> = ({
  schedule,
  classroomId,
}) => {
  const DATABASE_ID = "674e5e7a0008e19d0ef0";
  const SCHEDULE_COLLECTION_ID = "675668e500195f7e0e72";
  const { client } = useAuth();

  const sortByTime = (schedules: ScheduleItem[]): ScheduleItem[] => {
    return [...schedules].sort((a, b) => {
      // Convert time strings to comparable numbers (e.g., "14:28" -> 1428)
      const timeToNumber = (time: string) => {
        const [hours, minutes] = time.split(":").map(Number);
        return hours * 100 + minutes;
      };

      return timeToNumber(a.startTime) - timeToNumber(b.startTime);
    });
  };

  useEffect(() => {
    const unsubscribe = client.subscribe(
      `databases.${DATABASE_ID}.collections.${SCHEDULE_COLLECTION_ID}.documents`,
      (response: RealtimeResponseEvent<ScheduleItem>) => {
        if (!response.payload || response.payload.classroomId !== classroomId)
          return;
        useScheduleStore.getState().updateSchedule(response.payload);
      }
    );

    return () => {
      if (typeof unsubscribe === "function") {
        unsubscribe();
      }
    };
  }, [classroomId]);
  // Hàm lấy ngày trong tuần (0-6, 0 là Chủ nhật)
  const getDayOfWeek = (): string => {
    const days: string[] = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ];
    return days[new Date().getDay()];
  };

  const todaySchedule: ScheduleItem[] = schedule.filter(
    (item) =>
      item.classroomId === classroomId && item.dayOfWeek === getDayOfWeek()
  );

  // Phân loại theo buổi học
  const categorizeBySession = (schedules: ScheduleItem[]): SessionSchedule => {
    const categorized = schedules.reduce(
      (acc: SessionSchedule, item: ScheduleItem) => {
        const hour: number = parseInt(item.startTime.split(":")[0]);
        if (hour >= 6 && hour < 12) {
          acc.morning.push(item);
        } else if (hour >= 12 && hour < 18) {
          acc.afternoon.push(item);
        } else {
          acc.evening.push(item);
        }
        return acc;
      },
      { morning: [], afternoon: [], evening: [] }
    );

    // Sort each session's schedules
    return {
      morning: sortByTime(categorized.morning),
      afternoon: sortByTime(categorized.afternoon),
      evening: sortByTime(categorized.evening),
    };
  };

  const scheduleBySession: SessionSchedule = categorizeBySession(todaySchedule);

  const formatTime = (time: string): string => {
    return time.slice(0, 5);
  };

  // Hiển thị lịch học cho một buổi
  const renderSession = (
    sessions: ScheduleItem[],
    title: string,
    bgColor: string
  ): React.ReactNode => {
    if (sessions.length === 0) return null;

    return (
      <div className={`p-4 rounded-lg ${bgColor} mb-4`}>
        <h3 className="font-medium text-gray-800 mb-3">{title}</h3>
        <div className="space-y-3">
          {sessions.map((item: ScheduleItem) => (
            <div
              key={item.$id}
              className="flex items-start space-x-3 bg-white p-3 rounded-md shadow-sm"
            >
              <div className="flex-1">
                <h4 className="font-medium text-gray-900">{item.subject}</h4>
                <div className="mt-1 space-y-1">
                  <div className="flex items-center text-sm text-gray-600">
                    <Clock className="w-4 h-4 mr-1" />
                    <span>
                      {formatTime(item.startTime)} - {formatTime(item.endTime)}
                    </span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <MapPin className="w-4 h-4 mr-1" />
                    <span>Phòng {item.room}</span>
                  </div>
                  {item.teacher && (
                    <div className="text-sm text-gray-600">
                      Giáo viên: {item.teacher}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Định dạng ngày
  const formatDate = (): string => {
    return new Date().toLocaleDateString("vi-VN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div>
      <div className="text-sm text-gray-600 mb-4">{formatDate()}</div>

      {todaySchedule.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          Không có lịch học nào trong ngày hôm nay
        </div>
      ) : (
        <>
          {renderSession(
            scheduleBySession.morning,
            "Buổi sáng",
            "bg-yellow-50"
          )}
          {renderSession(
            scheduleBySession.afternoon,
            "Buổi chiều",
            "bg-blue-50"
          )}
          {renderSession(scheduleBySession.evening, "Buổi tối", "bg-purple-50")}
        </>
      )}
    </div>
  );
};

export default TodaySchedule;
