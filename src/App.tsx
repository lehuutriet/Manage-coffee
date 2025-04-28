import { AuthProvider } from "./contexts/auth/authProvider";
import { RouterProvider } from "react-router-dom";
import { Router } from "./routes/routers";
import { Toaster } from "react-hot-toast";

import * as React from "react";
import { ErrorBoundary } from "react-error-boundary";
import { Spinner } from "../src/ui/spinner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const ErrorFallback = () => (
  <div
    className="text-red-500 w-screen h-screen flex flex-col justify-center items-center"
    role="alert"
  >
    <h2 className="text-lg font-semibold">Ooops, something went wrong :( </h2>
  </div>
);

type AppProviderProps = {};

const queryClient = new QueryClient();

export const App = ({}: AppProviderProps) => (
  <React.Suspense
    fallback={
      <div className="flex items-center justify-center w-screen h-screen">
        <Spinner size="xl" />
      </div>
    }
  >
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Toaster position="top-right" />
          <RouterProvider router={Router} />
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.Suspense>
);

export default App;
