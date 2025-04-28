// types.ts
import { Models } from "appwrite";
import { create } from 'zustand';
export interface ScheduleItem extends Models.Document {
    classroomId: string;
    dayOfWeek: string;
    startTime: string;
    endTime: string;
    subject: string;
    room: string;
    teacher?: string;
    
  }
  interface ScheduleStore {
  schedules: ScheduleItem[]; // Danh sách schedule
  updateSchedule: (newSchedule: ScheduleItem) => void; // Hàm cập nhật schedule
}

export const useScheduleStore = create<ScheduleStore>((set) => ({
  schedules: [],
  updateSchedule: (newSchedule) =>
    set((state) => {
      // Kiểm tra nếu schedule đã tồn tại
      const existingIndex = state.schedules.findIndex(
        (item) => item.id === newSchedule.id
      );

      if (existingIndex !== -1) {
        // Cập nhật schedule hiện có
        const updatedSchedules = [...state.schedules];
        updatedSchedules[existingIndex] = newSchedule;
        return { schedules: updatedSchedules };
      } else {
        // Thêm schedule mới
        return { schedules: [...state.schedules, newSchedule] };
      }
    }),
}));

export interface Slide {

  type: 'image' | 'video' | 'content';

  title?: string;

  content?: string;

  imageUrl?: string;

  videoUrl?: string;

}
