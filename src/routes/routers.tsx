import { createBrowserRouter, Outlet } from "react-router-dom";
import { Suspense } from "react";
import Login from "../contexts/auth/Login";
import HomePage from "../HomePage";
import ProtectedRoute from "./protectedRoute";

import PageNotFound from "./pageNotFound";
import ProductManagement from "../compoments/products/ProductManagement";
import ProductDetail from "../compoments/products/ProductDetail";
import ProductForm from "../compoments/products/ProductForm";
import OrdersManagement from "../compoments/orders/OrdersManagement";
import OrderDetail from "../compoments/orders/OrderDetail";
import WarehouseManagement from "../compoments/warehouse/WarehouseManagement";
import WarehouseDetail from "../compoments/warehouse/WarehouseDetail";
import WarehouseForm from "../compoments/warehouse/WarehouseForm";
import CustomerManagement from "../compoments/customers/CustomerManagement";
import CustomerDetail from "../compoments/customers/CustomerDetail";
import CustomerForm from "../compoments/customers/CustomerForm";
import RecipeManagement from "../compoments/recipe/RecipeManagement";
import RecipeDetail from "../compoments/recipe/RecipeDetail";
import RecipeForm from "../compoments/recipe/RecipeForm";
import EventsManagement from "../compoments/events/EventsManagement";
import EventForm from "../compoments/events/EventForm";
import EventDetail from "../compoments/events/EventDetail";
// Import các component mã giảm giá
import CouponManagement from "../compoments/coupon/CouponManagement";
import CouponDetail from "../compoments/coupon/CouponDetail";
import CouponForm from "../compoments/coupon/CouponForm";
import PromotionManagement from "../compoments/Promotion/PromotionManagement";
import PromotionDetail from "../compoments/Promotion/PromotionDetail";
import PromotionForm from "../compoments/Promotion/PromotionForm";

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
      {
        path: "/orders",
        element: (
          <ProtectedRoute>
            <OrdersManagement />
          </ProtectedRoute>
        ),
      },
      {
        path: "/orders/:id",
        element: (
          <ProtectedRoute>
            <OrderDetail />
          </ProtectedRoute>
        ),
      },
      {
        path: "/warehouse",
        element: (
          <ProtectedRoute>
            <WarehouseManagement />
          </ProtectedRoute>
        ),
      },
      {
        path: "/warehouse/:id",
        element: (
          <ProtectedRoute>
            <WarehouseDetail />
          </ProtectedRoute>
        ),
      },
      {
        path: "/warehouse/new",
        element: (
          <ProtectedRoute>
            <WarehouseForm />
          </ProtectedRoute>
        ),
      },
      {
        path: "/warehouse/edit/:id",
        element: (
          <ProtectedRoute>
            <WarehouseForm />
          </ProtectedRoute>
        ),
      },

      {
        path: "/customers",
        element: (
          <ProtectedRoute>
            <CustomerManagement />
          </ProtectedRoute>
        ),
      },
      {
        path: "/customers/:id",
        element: (
          <ProtectedRoute>
            <CustomerDetail />
          </ProtectedRoute>
        ),
      },
      {
        path: "/customers/new",
        element: (
          <ProtectedRoute>
            <CustomerForm />
          </ProtectedRoute>
        ),
      },
      {
        path: "/customers/edit/:id",
        element: (
          <ProtectedRoute>
            <CustomerForm isEditing={true} />
          </ProtectedRoute>
        ),
      },
      {
        path: "/recipes",
        element: (
          <ProtectedRoute>
            <RecipeManagement />
          </ProtectedRoute>
        ),
      },
      {
        path: "/recipes/:id",
        element: (
          <ProtectedRoute>
            <RecipeDetail />
          </ProtectedRoute>
        ),
      },
      {
        path: "/recipes/new",
        element: (
          <ProtectedRoute>
            <RecipeForm />
          </ProtectedRoute>
        ),
      },
      {
        path: "/recipes/edit/:id",
        element: (
          <ProtectedRoute>
            <RecipeForm isEditing={true} />
          </ProtectedRoute>
        ),
      },
      {
        path: "/events",
        element: (
          <ProtectedRoute>
            <EventsManagement />
          </ProtectedRoute>
        ),
      },
      {
        path: "/events/:id",
        element: (
          <ProtectedRoute>
            <EventDetail />
          </ProtectedRoute>
        ),
      },
      {
        path: "/events/new",
        element: (
          <ProtectedRoute>
            <EventForm />
          </ProtectedRoute>
        ),
      },
      {
        path: "/events/edit/:id",
        element: (
          <ProtectedRoute>
            <EventForm isEditing={true} />
          </ProtectedRoute>
        ),
      },
      // Thêm các routes cho mã giảm giá
      {
        path: "/coupons",
        element: (
          <ProtectedRoute>
            <CouponManagement />
          </ProtectedRoute>
        ),
      },
      {
        path: "/coupons/:id",
        element: (
          <ProtectedRoute>
            <CouponDetail />
          </ProtectedRoute>
        ),
      },
      {
        path: "/coupons/new",
        element: (
          <ProtectedRoute>
            <CouponForm />
          </ProtectedRoute>
        ),
      },
      {
        path: "/coupons/edit/:id",
        element: (
          <ProtectedRoute>
            <CouponForm isEditing={true} />
          </ProtectedRoute>
        ),
      },

      // Trong danh sách routes của router, thêm các đường dẫn sau:
      {
        path: "/promotions",
        element: (
          <ProtectedRoute>
            <PromotionManagement />
          </ProtectedRoute>
        ),
      },
      {
        path: "/promotions/:id",
        element: (
          <ProtectedRoute>
            <PromotionDetail />
          </ProtectedRoute>
        ),
      },
      {
        path: "/promotions/new",
        element: (
          <ProtectedRoute>
            <PromotionForm />
          </ProtectedRoute>
        ),
      },
      {
        path: "/promotions/edit/:id",
        element: (
          <ProtectedRoute>
            <PromotionForm isEditing={true} />
          </ProtectedRoute>
        ),
      },
    ],
    errorElement: <PageNotFound />,
  },
]);
