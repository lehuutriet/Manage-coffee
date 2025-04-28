import { createBrowserRouter, Outlet } from "react-router-dom";
import { Suspense } from "react";
import Login from "../contexts/auth/Login";
import HomePage from "../HomePage";
import ProtectedRoute from "./protectedRoute";
import AdminPage from "../AdminPage";
import PageNotFound from "./pageNotFound";
import ExamManagement from "../Education/ExamManagement";
import Exercise from "../Management/exercise";
import Register from "../contexts/auth/Register";
import ForgotPassword from "../contexts/auth/ForgotPassword";
import ClassroomPage from "../Classroom/ClassroomPage";
import ClassroomManagement from "../Classroom/ClassroomManagement";
import Story from "../Education/Story";
import ResetPassword from "../contexts/auth/ResetPassword";
import LessonGrid from "../learning/LessonGrid";
import FeedbackForm from "../Navigation/Feedback";
import Discussion from "../Navigation/Discussion";
import SignLanguage from "../Navigation/SignLanguage";
import OnlineClassroom from "../Navigation/OnlineClassroom";
import Dictionary from "../Navigation/Dictionary/Dictionary";
import WordDetail from "../Navigation/Dictionary/WordDetail";
import FavoriteWords from "../Navigation/FavoriteWords";
const App = () => {
  return (
    <Suspense
      fallback={
        <div className="h-full w-full flex items-center justify-center">
          {/* <Spinner size="xl" /> */}
        </div>
      }
    >
      <Outlet />
    </Suspense>
  );
};

export const Router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      // Public routes
      {
        path: "",
        element: <Login />,
      },
      {
        path: "/register",
        element: <Register />,
      },
      {
        path: "/forgot-password",
        element: <ForgotPassword />,
      },
      {
        path: "/reset-password",
        element: <ResetPassword />,
      },

      {
        path: "/admin",
        element: (
          <ProtectedRoute requiredRole="Admin">
            <AdminPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "/homepage",
        element: (
          <ProtectedRoute>
            <HomePage />
          </ProtectedRoute>
        ),
      },

      {
        path: "/favorite-words",
        element: (
          <ProtectedRoute>
            <FavoriteWords />
          </ProtectedRoute>
        ),
      },
      // Changed FileViewer to Exercise
      {
        path: "/uploadExercise",
        element: (
          <ProtectedRoute>
            <Exercise />
          </ProtectedRoute>
        ),
      },
      {
        path: "/feedback",
        element: (
          <ProtectedRoute>
            <FeedbackForm />
          </ProtectedRoute>
        ),
      },
      {
        path: "/online-classroom",
        element: (
          <ProtectedRoute>
            <OnlineClassroom />
          </ProtectedRoute>
        ),
      },
      {
        path: "/dictionary",
        element: (
          <ProtectedRoute>
            <Dictionary />
          </ProtectedRoute>
        ),
      },
      {
        path: "/dictionary/:wordId",
        element: (
          <ProtectedRoute>
            <WordDetail />
          </ProtectedRoute>
        ),
      },
      {
        path: "/discussion",
        element: (
          <ProtectedRoute>
            <Discussion />
          </ProtectedRoute>
        ),
      },
      {
        path: "/story",
        element: (
          <ProtectedRoute>
            <Story />
          </ProtectedRoute>
        ),
      },
      {
        path: "/exam",
        element: (
          <ProtectedRoute>
            <ExamManagement />
          </ProtectedRoute>
        ),
      },
      {
        path: "/sign-language",
        element: (
          <ProtectedRoute>
            <SignLanguage />
          </ProtectedRoute>
        ),
      },

      {
        path: "/lessonGrid",
        element: (
          <ProtectedRoute>
            <LessonGrid />
          </ProtectedRoute>
        ),
      },
      {
        path: "/classroomManagement",
        element: (
          <ProtectedRoute>
            <ClassroomManagement />
          </ProtectedRoute>
        ),
      },

      {
        path: "/classroom/:classroomId",
        element: (
          <ProtectedRoute>
            <ClassroomPage />
          </ProtectedRoute>
        ),
      },
    ],
    errorElement: <PageNotFound />,
  },
]);
