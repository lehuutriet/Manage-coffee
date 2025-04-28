import React, { createContext, useState, useContext, useEffect } from "react";
import { Client, Databases, Account, Functions, Storage } from "appwrite";
import { showNotification } from "@mantine/notifications";
import { DataCacheProvider } from "./DataCacheProvider";
interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  userRole: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuthStatus: () => Promise<boolean>;
  databases: Databases;
  functions: Functions;
  storage: Storage; // Thêm storage vào interface
  client: Client;
  account: Account;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);

  const client = new Client()
    .setEndpoint("https://store.hjm.bid/v1")
    .setProject("674818e10034704a2276");

  const storage = new Storage(client); // Khởi tạo storage
  const databases = new Databases(client);
  const account = new Account(client);
  const functions = new Functions(client);

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
    await account.createEmailPasswordSession(email, password);
    const isAuthed = await checkAuthStatus();
    if (isAuthed) {
      const user = await account.get();
      const userRole =
        user.labels && user.labels.includes("Admin") ? "Admin" : "User";
      setUserRole(userRole);
    }
  };

  const logout = async () => {
    await account.deleteSession("current");
    setIsAuthenticated(false);
    setUserRole(null);
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
        databases,
        functions,
        storage, // Thêm storage vào Provider
        client,
        account,
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
