import { useEffect, useState } from "react";
import { useAuth } from "./contexts/auth/authProvider";
import { useDataCache } from "./contexts/auth/DataCacheProvider";
import {
  Coffee,
  ShoppingBag,
  Users,
  Package,
  Receipt,
  Calendar,
  LogOut,
  Tag,
  Gift,
  RotateCcw,
  Truck,
  FileText,
  LayoutGrid,
  Ticket,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
const HomePage = () => {
  const { account, getAllItems, COLLECTION_IDS, logout } = useAuth();
  const { setCachedData, getCachedData } = useDataCache();
  const [userData, setUserData] = useState({ name: "", email: "" });
  const [isAdmin, setIsAdmin] = useState(false);
  const [stats, setStats] = useState({
    products: 0,
    orders: 0,
    customers: 0,
    events: 0,
  });
  const navigate = useNavigate();

  useEffect(() => {
    const getUserData = async () => {
      try {
        const user = await account.get();
        const isAdminUser = user.labels?.includes("Admin") || false;
        setIsAdmin(isAdminUser);
        setUserData({
          name: user.name || "",
          email: user.email || "",
        });
      } catch (error) {
        console.error("Lỗi khi lấy dữ liệu người dùng:", error);
      }
    };

    const loadDashboardStats = async () => {
      // Kiểm tra cache trước
      const cachedStats = getCachedData("dashboardStats");
      if (cachedStats) {
        setStats(cachedStats);
      }

      try {
        // Tải dữ liệu thống kê từ các collection
        const products = await getAllItems(COLLECTION_IDS.products);
        const orders = await getAllItems(COLLECTION_IDS.orders);
        const customers = await getAllItems(COLLECTION_IDS.customers);
        const events = await getAllItems(COLLECTION_IDS.events);

        const newStats = {
          products: products.length,
          orders: orders.length,
          customers: customers.length,
          events: events.length,
        };

        setStats(newStats);
        // Lưu vào cache với thời gian hết hạn 5 phút
        setCachedData("dashboardStats", newStats, 5 * 60 * 1000);
      } catch (error) {
        console.error("Lỗi khi tải dữ liệu thống kê:", error);
      }
    };

    getUserData();
    loadDashboardStats();
  }, [account, getAllItems, setCachedData, getCachedData]);
  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Đăng xuất thành công");
      navigate("/");
    } catch (error) {
      console.error("Lỗi khi đăng xuất:", error);
      toast.error("Có lỗi xảy ra khi đăng xuất");
    }
  };

  const managementModules = [
    {
      icon: Coffee,
      title: "Quản lý sản phẩm",
      description: "Thêm, sửa, xóa các sản phẩm của cửa hàng",
      path: "/products",
      collection: COLLECTION_IDS.products,
    },
    {
      icon: Tag,
      title: "Danh mục",
      description: "Quản lý danh mục sản phẩm",
      path: "/categories",
      collection: COLLECTION_IDS.categories,
    },
    {
      icon: ShoppingBag,
      title: "Quản lý đơn hàng",
      description: "Theo dõi và quản lý các đơn đặt hàng",
      path: "/orders",
      collection: COLLECTION_IDS.orders,
    },
    {
      icon: Users,
      title: "Quản lý khách hàng",
      description: "Thông tin và lịch sử giao dịch khách hàng",
      path: "/customers",
      collection: COLLECTION_IDS.customers,
    },
    {
      icon: Package,
      title: "Quản lý kho hàng",
      description: "Kiểm soát tồn kho và nhập xuất hàng",
      path: "/warehouse",
      collection: COLLECTION_IDS.warehouse,
    },
    {
      icon: Receipt,
      title: "Công thức pha chế",
      description: "Quản lý công thức cho các sản phẩm",
      path: "/recipes",
      collection: COLLECTION_IDS.recipes,
    },
    {
      icon: Calendar,
      title: "Sự kiện",
      description: "Quản lý các sự kiện khuyến mãi",
      path: "/events",
      collection: COLLECTION_IDS.events,
    },
    {
      icon: Ticket,
      title: "Mã giảm giá",
      description: "Quản lý các mã giảm giá",
      path: "/coupons",
      collection: COLLECTION_IDS.coupons,
    },
    {
      icon: Gift,
      title: "Khuyến mãi",
      description: "Quản lý chương trình khuyến mãi",
      path: "/promotions",
      collection: COLLECTION_IDS.promotions,
    },
    {
      icon: RotateCcw,
      title: "Trả hàng",
      description: "Quản lý các đơn trả hàng",
      path: "/returns",
      collection: COLLECTION_IDS.returns,
    },
    {
      icon: Truck,
      title: "Nhà cung cấp",
      description: "Quản lý nhà cung cấp",
      path: "/suppliers",
      collection: COLLECTION_IDS.suppliers,
    },
    {
      icon: FileText,
      title: "Giao dịch nhà cung cấp",
      description: "Lịch sử giao dịch với nhà cung cấp",
      path: "/supplier-transactions",
      collection: COLLECTION_IDS.supplierTransactions,
    },
    {
      icon: LayoutGrid,
      title: "Bàn",
      description: "Quản lý bàn trong cửa hàng",
      path: "/tables",
      collection: COLLECTION_IDS.tables,
    },
  ];

  const handleNavigate = (path: any) => {
    navigate(path);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Nút đăng xuất ở góc phải trên cùng */}
        <div className="flex justify-end mb-3">
          <button
            onClick={handleLogout}
            className="flex items-center px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Đăng xuất
          </button>
        </div>

        {/* Header */}
        <div className="bg-white shadow-lg rounded-lg p-6 mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Xin chào, {userData.name || "Admin"}
              </h1>
              <p className="text-gray-600 mt-1">
                Chào mừng trở lại với hệ thống quản lý AYAI-Coffee
              </p>
            </div>
            <div className="mt-4 md:mt-0">
              <div className="bg-blue-50 px-4 py-2 rounded-lg">
                <p className="text-blue-700 text-sm font-medium">
                  {isAdmin ? "Quản trị viên" : "Nhân viên"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Thống kê */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-purple-100">Sản phẩm</p>
                <h3 className="text-3xl font-bold mt-2">{stats.products}</h3>
              </div>
              <Coffee className="w-12 h-12 text-purple-200" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-blue-100">Đơn hàng</p>
                <h3 className="text-3xl font-bold mt-2">{stats.orders}</h3>
              </div>
              <ShoppingBag className="w-12 h-12 text-blue-200" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-green-100">Khách hàng</p>
                <h3 className="text-3xl font-bold mt-2">{stats.customers}</h3>
              </div>
              <Users className="w-12 h-12 text-green-200" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg shadow-lg p-6 text-white">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-amber-100">Sự kiện</p>
                <h3 className="text-3xl font-bold mt-2">{stats.events}</h3>
              </div>
              <Calendar className="w-12 h-12 text-amber-200" />
            </div>
          </div>
        </div>

        {/* Modules quản lý */}
        <h2 className="text-2xl font-bold text-gray-800 mb-6">
          Quản lý cửa hàng
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {managementModules.map((module, index) => (
            <div
              key={index}
              onClick={() => handleNavigate(module.path)}
              className="bg-white p-6 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:-translate-y-1"
            >
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                  <module.icon className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800">
                  {module.title}
                </h3>
              </div>
              <p className="text-gray-600 text-sm">{module.description}</p>
            </div>
          ))}
        </div>

        {/* Hành động nhanh */}
        <div className="mt-10">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">
            Hành động nhanh
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <button
              onClick={() => navigate("/products/new")}
              className="bg-green-600 text-white px-6 py-4 rounded-lg hover:bg-green-700 transition-colors duration-300 flex items-center justify-center"
            >
              <span className="mr-2">+ Thêm sản phẩm mới</span>
            </button>
            <button
              onClick={() => navigate("/orders/new")}
              className="bg-blue-600 text-white px-6 py-4 rounded-lg hover:bg-blue-700 transition-colors duration-300 flex items-center justify-center"
            >
              <span className="mr-2">+ Tạo đơn hàng mới</span>
            </button>
            <button
              onClick={() => navigate("/reports")}
              className="bg-purple-600 text-white px-6 py-4 rounded-lg hover:bg-purple-700 transition-colors duration-300 flex items-center justify-center"
            >
              <span className="mr-2">Xem báo cáo</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
