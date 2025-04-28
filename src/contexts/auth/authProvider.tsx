import React, { createContext, useState, useContext, useEffect } from "react";
import {
  Client,
  Databases,
  Account,
  Functions,
  Storage,
  Teams,
  ID,
  Query,
} from "appwrite";
import { showNotification } from "@mantine/notifications";
import { DataCacheProvider } from "./DataCacheProvider";

// Thêm định nghĩa COLLECTION_IDS
export const COLLECTION_IDS = {
  products: "products",
  categories: "categories",
  orders: "orders",
  tables: "tables",
  returns: "returns",
  warehouse: "warehouse",
  recipes: "recipes",
  customers: "customers",
  promotions: "promotions",
  coupons: "coupons",
  suppliers: "suppliers",
  supplierTransactions: "supplierTransactions",
  events: "events",
  walletTransactions: "walletTransactions",
  orderClients: "orderClients",
  bankAccounts: "bankAccounts",
};

// Các hằng số Database
export const DATABASE_ID = "muoi-store";
export const BUCKET_ID = "muoi-store-storage";

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  userRole: string | null;
  login: (email: string, password: string) => Promise<any>;
  logout: () => Promise<void>;
  checkAuthStatus: () => Promise<boolean>;
  getUserPrefs: () => Promise<any>;
  updateUserPrefs: (prefs: any) => Promise<boolean>;
  createUser: (email: string, password: string, name: string) => Promise<any>;
  updatePassword: (oldPass: string, newPass: string) => Promise<any>;
  updateEmail: (email: string, password: string) => Promise<boolean>;
  updateName: (name: string) => Promise<boolean>;
  joinTeam: (
    teamId: string,
    email: string,
    role: any,
    redirectUrl: string
  ) => Promise<boolean>;
  getAllItems: (collectionId: string, queries?: any[]) => Promise<any[]>;
  getSingleItem: (collectionId: string, documentId: string) => Promise<any>;
  createItem: (collectionId: string, data: any) => Promise<any>;
  updateItem: (
    collectionId: string,
    documentId: string,
    data: any
  ) => Promise<any>;
  deleteItem: (collectionId: string, documentId: string) => Promise<any>;
  getCurrentUserId: () => Promise<string | null>;
  databases: Databases;
  functions: Functions;
  storage: Storage;
  client: Client;
  account: Account;
  teams: Teams;
  COLLECTION_IDS: Record<string, string>;
  BUCKET_ID: string;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Các giá trị mặc định cho user preferences
const DEFAULT_USER_PREFS = {
  DATABASE_ID: DATABASE_ID,
  BUCKET_ID: BUCKET_ID,
  STORE_NAME: "AYAI-Coffee",
  PUSH_TOKEN: "",
  NAME: "",
  PHONE: "",
  ADDRESS: "",
  returns: "returns",
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);

  const client = new Client()
    .setEndpoint("https://cloud.appwrite.io/v1")
    .setProject("66a085e60016a161b67b");

  const storage = new Storage(client);
  const databases = new Databases(client);
  const account = new Account(client);
  const functions = new Functions(client);
  const teams = new Teams(client);

  const getCurrentUserId = async () => {
    try {
      const user = await account.get();
      return user.$id;
    } catch (error) {
      console.error("Error getting user:", error);
      return null;
    }
  };

  // Database functions
  const getAllItems = async (collectionId: string, queries: any[] = []) => {
    try {
      const userPrefs = await getUserPrefs();
      const userId = await getCurrentUserId();
      const databaseId = userPrefs.DATABASE_ID || DATABASE_ID;

      let finalQueries = [...queries];
      if (
        collectionId !== COLLECTION_IDS.products &&
        collectionId !== COLLECTION_IDS.categories &&
        collectionId !== COLLECTION_IDS.coupons &&
        collectionId !== COLLECTION_IDS.promotions &&
        userId
      ) {
        finalQueries.push(Query.equal("userId", userId));
      }

      const items = await databases.listDocuments(
        databaseId,
        collectionId,
        finalQueries
      );

      return items.documents;
    } catch (error) {
      console.error("Error getting items:", error);
      return [];
    }
  };

  const getSingleItem = async (collectionId: string, documentId: string) => {
    try {
      const userPrefs = await getUserPrefs();
      const databaseId = userPrefs.DATABASE_ID || DATABASE_ID;

      return await databases.getDocument(databaseId, collectionId, documentId);
    } catch (error) {
      console.error("Error getting item:", error);
      return null;
    }
  };

  const createItem = async (collectionId: string, data: any) => {
    try {
      const userPrefs = await getUserPrefs();
      const databaseId = userPrefs.DATABASE_ID || DATABASE_ID;

      // Thêm userId cho mọi collection trừ products
      let finalData = { ...data };
      const user = await account.get();
      if (collectionId !== COLLECTION_IDS.products && user.$id) {
        finalData.userId = user.$id;
      }

      return await databases.createDocument(
        databaseId,
        collectionId,
        ID.unique(),
        finalData
      );
    } catch (error) {
      console.error("Error creating item:", error);
      throw error;
    }
  };

  const updateItem = async (
    collectionId: string,
    documentId: string,
    data: any
  ) => {
    try {
      const userPrefs = await getUserPrefs();
      const databaseId = userPrefs.DATABASE_ID || DATABASE_ID;

      return await databases.updateDocument(
        databaseId,
        collectionId,
        documentId,
        data
      );
    } catch (error) {
      console.error("Error updating item:", error);
      throw error;
    }
  };

  const deleteItem = async (collectionId: string, documentId: string) => {
    try {
      const userPrefs = await getUserPrefs();
      const databaseId = userPrefs.DATABASE_ID || DATABASE_ID;

      return await databases.deleteDocument(
        databaseId,
        collectionId,
        documentId
      );
    } catch (error) {
      console.error("Error deleting item:", error);
      throw error;
    }
  };

  const getUserPrefs = async () => {
    try {
      // Cố gắng lấy từ server trước
      const prefs = await account.getPrefs();
      if (prefs && Object.keys(prefs).length > 0) {
        // Nếu thành công, cập nhật localStorage
        localStorage.setItem("userPrefs", JSON.stringify(prefs));
        return prefs;
      }

      // Nếu không lấy được từ server, thử lấy từ localStorage
      const storedPrefs = localStorage.getItem("userPrefs");
      if (storedPrefs) {
        return JSON.parse(storedPrefs);
      }

      return DEFAULT_USER_PREFS;
    } catch (error) {
      console.error("Error getting user prefs:", error);

      // Fallback đến localStorage
      const storedPrefs = localStorage.getItem("userPrefs");
      return storedPrefs ? JSON.parse(storedPrefs) : DEFAULT_USER_PREFS;
    }
  };

  const updateUserPrefs = async (prefs = {}) => {
    return account
      .updatePrefs(prefs)
      .then(
        function () {
          return true;
        },
        function (error) {
          console.log("Error updating user prefs:", error);
          return false;
        }
      )
      .catch((error) => {
        console.log(error);
        return false;
      });
  };

  const updateName = async (name: string) => {
    return account.updateName(name).then(
      function (response) {
        console.log("updateName success:", response);
        return true;
      },
      function (error) {
        console.log("updateName error:", error);
        return false;
      }
    );
  };

  const updateEmail = async (email: string, password: string) => {
    return account.updateEmail(email, password).then(
      function (response) {
        console.log("updateEmail success:", response);
        return true;
      },
      function (error) {
        console.log("updateEmail error:", error);
        return false;
      }
    );
  };

  const updatePassword = async (oldPass: string, newPass: string) => {
    return account.updatePassword(newPass, oldPass).then(
      function (response) {
        console.log("updatePassword success:", response);
        return response;
      },
      function (error) {
        console.log("updatePassword error:", error);
        return {
          status: false,
          message: error.message,
        };
      }
    );
  };

  const joinTeam = async (
    teamId: string,
    email: string,
    role: any,
    redirectUrl: string
  ) => {
    return teams.createMembership(teamId, [email], role, redirectUrl).then(
      function (response) {
        console.log("joinTeam success:", response);
        return true;
      },
      function (error) {
        console.log("joinTeam error:", error);
        return false;
      }
    );
  };

  const checkAuthStatus = async (): Promise<boolean> => {
    if (!navigator.onLine) {
      console.log("You are offline. Skipping API call.");
      setIsAuthenticated(true);
      setIsLoading(false);
      return true;
    }

    try {
      const session = await account.getSession("current");
      if (session) {
        const user = await account.get();
        const userRole =
          user.labels && user.labels.includes("Admin") ? "Admin" : "User";
        setIsAuthenticated(true);
        setUserRole(userRole);
        setIsLoading(false);
        return true;
      }
    } catch (error: any) {
      console.log("Error checking auth status:", error);
      setIsAuthenticated(false);
      setUserRole(null);
    }

    setIsAuthenticated(false);
    setUserRole(null);
    setIsLoading(false);
    return false;
  };

  const createUser = async (
    email: string,
    password: string,
    name: string = ""
  ) => {
    try {
      console.log("createUser called:", email, password, name);
      const response = await account.create(ID.unique(), email, password, name);
      console.log("create user response:", response);
      await updateUserPrefs(DEFAULT_USER_PREFS);
      await joinTeam("muoi-user-team", email, [], window.location.origin);
      return true;
    } catch (err: any) {
      console.error("Lỗi đăng ký:", err);
      return {
        success: false,
        message: err.message || "Đăng ký thất bại",
        code: err.code,
      };
    }
  };

  useEffect(() => {
    const handleNetworkChange = () => {
      if (navigator.onLine) {
        showNotification({
          title: "Đã kết nối lại",
          message: "Bạn đã được kết nối lại internet.",
          color: "green",
        });
        checkAuthStatus(); // Kiểm tra lại session khi có kết nối
      } else {
        showNotification({
          title: "Mất kết nối",
          message:
            "Bạn đã mất kết nối internet. Một số tính năng có thể không hoạt động.",
          color: "red",
          icon: <span className="ri-alert-circle-line" />,
        });
      }
    };

    window.addEventListener("online", handleNetworkChange);
    window.addEventListener("offline", handleNetworkChange);

    return () => {
      window.removeEventListener("online", handleNetworkChange);
      window.removeEventListener("offline", handleNetworkChange);
    };
  }, []);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await account.createEmailPasswordSession(
        email,
        password
      );
      localStorage.setItem("currentSessionID", response.$id);
      localStorage.setItem("userEmail", email);

      const isAuthed = await checkAuthStatus();
      if (isAuthed) {
        const user = await account.get();
        const userRole =
          user.labels && user.labels.includes("Admin") ? "Admin" : "User";
        setUserRole(userRole);
      }

      return response;
    } catch (err: any) {
      console.log("Login error:", err);
      return err.code === 0 ? "error" : false;
    }
  };

  const logout = async () => {
    try {
      // Lưu userPrefs hiện tại và xóa PUSH_TOKEN
      let userPrefs = await getUserPrefs();
      userPrefs.PUSH_TOKEN = "";
      await updateUserPrefs(userPrefs);

      // Xóa dữ liệu đăng nhập khỏi localStorage
      localStorage.removeItem("currentSessionID");
      localStorage.removeItem("userEmail");
      localStorage.removeItem("userPrefs");

      // Xóa session hiện tại
      await account.deleteSession("current");

      // Cập nhật state
      setIsAuthenticated(false);
      setUserRole(null);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        userRole,
        login,
        logout,
        checkAuthStatus,
        getUserPrefs,
        updateUserPrefs,
        createUser,
        updatePassword,
        updateEmail,
        updateName,
        joinTeam,
        getAllItems,
        getSingleItem,
        createItem,
        updateItem,
        deleteItem,
        getCurrentUserId,
        databases,
        functions,
        storage,
        client,
        account,
        teams,
        COLLECTION_IDS,
        BUCKET_ID,
      }}
    >
      <DataCacheProvider>{children}</DataCacheProvider>
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
