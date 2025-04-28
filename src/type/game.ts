export interface WordGameData {
    $id: string;
    words: string[];
    correctAnswer: string;
    level: number;
  }
  
  export interface MemoryGameData {
    $id: string;
    equation: string;
    answer: string;
    level: number;
  }
  
  export interface QuizGameData {
    $id: string;
    question: string;
    options: string[];
    correctAnswer: number;
    level: number;
    category: string;
  }
  export interface RememberGameData {
    $id: string;
    numbers: string[];
  correctOrder: string[];
    level: number;
    timeLimit: number;
  }
  export interface LogicGameData {
    $id: string;
    type: 'sequence' | 'math' | 'pairs';
    question: string;
    data: string[];
    answer: string[];
    explanation?: string;
    level: number;
    timeLimit: number;
  }
  
  export const DATABASE_ID = "674e5e7a0008e19d0ef0";
  export const COLLECTIONS = {
    word: "6789dfaa000bb6b7ace9",
    memory: "6789dfb10025bb05631a", 
    quiz: "6789dfb80024b84acbb4",
      intelligence: "678f010e002c5c4d844c",
        logic: "678f26b00005b0c70011"
  };