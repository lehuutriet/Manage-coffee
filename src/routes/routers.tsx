import { createBrowserRouter, Outlet } from "react-router-dom";
import { Suspense } from "react";
import Login from "../contexts/auth/Login";
import HomePage from "../HomePage";
import ProtectedRoute from "./protectedRoute";

import PageNotFound from "./pageNotFound";
import ProductManagement from "../compoments/products/ProductManagement";
import ProductDetail from "../compoments/products/ProductDetail";
import ProductForm from "../compoments/products/ProductForm";

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
        path: "/homepage",
        element: (
          <ProtectedRoute>
            <HomePage />
          </ProtectedRoute>
        ),
      },
      {
        path: "/products",
        element: (
          <ProtectedRoute>
            <ProductManagement />
          </ProtectedRoute>
        ),
      },
      {
        path: "/products/:id",
        element: <ProductDetail />,
      },
      {
        path: "/products/new",
        element: <ProductForm />,
      },
      {
        path: "/products/edit/:id",
        element: <ProductForm />,
      },
    ],
    errorElement: <PageNotFound />,
  },
]);
