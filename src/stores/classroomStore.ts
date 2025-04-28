// stores/classroomStore.ts
import { create } from 'zustand';
import { Databases } from 'appwrite';
import { Query } from 'appwrite';
import { Models } from 'appwrite';

// Định nghĩa interface
interface Assignment extends Models.Document {
  title: string;
  description: string;
  dueDate: string;
  attachments: string[];
  status: "draft" | "published" | "closed";
  classroomId: string;
}

interface ScheduleItem extends Models.Document {
  classroomId: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  subject: string;
  room: string;
  teacher: string;
}

interface Message extends Models.Document {
  content: string;
  senderId: string; 
  senderName: string;
  timestamp: string;
  classroomId: string;
}

// Định nghĩa các hằng số
const DATABASE_ID = "674e5e7a0008e19d0ef0";
const ASSIGNMENTS_COLLECTION_ID = "67566466003b28582c75";
const SCHEDULE_COLLECTION_ID = "675668e500195f7e0e72";
const MESSAGES_COLLECTION_ID = "67569a43002f288aa7d4";

interface ClassroomStore {
    assignments: Assignment[];
    schedule: ScheduleItem[];
    messages: Message[];
    refreshAssignments: (params: { classroomId: string; databases: Databases }) => Promise<void>;
    refreshSchedule: (params: { classroomId: string; databases: Databases }) => Promise<void>;
    refreshMessages: (params: { classroomId: string; databases: Databases }) => Promise<void>;
    addMessage: (message: Message) => void;
}
  
export const useClassroomStore = create<ClassroomStore>((set) => ({
    assignments: [],
    schedule: [],
    messages: [],
    refreshAssignments: async ({ classroomId, databases }) => {
      const response = await databases.listDocuments(
        DATABASE_ID,
        ASSIGNMENTS_COLLECTION_ID,
        [Query.equal("classroomId", [classroomId])]
      );
      set({ assignments: response.documents as Assignment[] });
    },
    refreshSchedule: async ({ classroomId, databases }) => {
      const response = await databases.listDocuments(
        DATABASE_ID,
        SCHEDULE_COLLECTION_ID,
        [Query.equal("classroomId", [classroomId])]
      );
      set({ schedule: response.documents as ScheduleItem[] });
    },
    refreshMessages: async ({ classroomId, databases }) => {
      const response = await databases.listDocuments(
        DATABASE_ID,
        MESSAGES_COLLECTION_ID, 
        [Query.equal("classroomId", [classroomId])]
      );
      set({ messages: response.documents as Message[] });
    },
    addMessage: (message) => set((state) => ({
      messages: [...state.messages, message]
    }))
}));