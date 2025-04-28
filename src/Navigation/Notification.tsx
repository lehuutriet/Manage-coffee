import { useState, useEffect, useRef } from "react"; // Add useRef import
import { useAuth } from "../contexts/auth/authProvider";
import { Query } from "appwrite";
import { Bell, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";

interface Notification {
  $id: string;
  userId: string;
  feedbackId: string;
  type: "feedback_response" | "new_feedback";
  isRead: boolean;
  createdAt: string;
  title: string;
  message: string;
}

const NotificationComponent = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const { databases, account } = useAuth();
  const navigate = useNavigate();
  const notificationRef = useRef<HTMLDivElement>(null); // Add this ref

  const DATABASE_ID = "674e5e7a0008e19d0ef0";
  const NOTIFICATION_COLLECTION = "6780e316003b3a0ade3c";
  const [lastFetch, setLastFetch] = useState<number>(0);
  const FETCH_COOLDOWN = 2000;
  const [isMarkingRead, setIsMarkingRead] = useState(false);
  // Thêm state để theo dõi trạng thái đang xóa tất cả
  const [isDeletingAll, setIsDeletingAll] = useState(false);

  // Thêm hàm để xóa tất cả thông báo
  const deleteAllNotifications = async () => {
    if (isDeletingAll) return; // Tránh double click

    try {
      setIsDeletingAll(true);

      // Xóa từng thông báo
      await Promise.all(
        notifications.map((notification) =>
          databases.deleteDocument(
            DATABASE_ID,
            NOTIFICATION_COLLECTION,
            notification.$id
          )
        )
      );

      // Xóa cache
      localStorage.removeItem("notifications");

      // Cập nhật state
      setNotifications([]);
      setUnreadCount(0);
    } catch (error) {
      console.error("Error deleting all notifications:", error);
    } finally {
      setIsDeletingAll(false);
    }
  };
  // Thêm hàm lấy thông báo từ cache
  const getCachedNotifications = () => {
    const cached = localStorage.getItem("notifications");
    if (cached) {
      const parsedCache = JSON.parse(cached);
      setNotifications(parsedCache.notifications);
      setUnreadCount(parsedCache.unreadCount);
      return true;
    }
    return false;
  };
  const fetchNotifications = async () => {
    const now = Date.now();
    if (now - lastFetch < FETCH_COOLDOWN) {
      // Kiểm tra cache trước
      if (getCachedNotifications()) {
        return;
      }
    }

    try {
      const user = await account.get();
      const response = await databases.listDocuments(
        DATABASE_ID,
        NOTIFICATION_COLLECTION,
        [Query.equal("userId", user.$id)]
      );

      const sortedNotifications = response.documents.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      const unreadCount = sortedNotifications.filter((n) => !n.isRead).length;

      // Lưu vào cache
      localStorage.setItem(
        "notifications",
        JSON.stringify({
          notifications: sortedNotifications,
          unreadCount,
          timestamp: now,
        })
      );

      setNotifications(sortedNotifications as unknown as Notification[]);
      setUnreadCount(unreadCount);
      setLastFetch(now);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };

  useEffect(() => {
    if (showNotifications) {
      fetchNotifications();
    }
  }, [showNotifications]);
  useEffect(() => {
    fetchNotifications();
  }, []);
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 5000);
    return () => clearInterval(interval);
  }, []);
  // Sửa lại các hàm xử lý để cập nhật cache
  // Thêm hàm cập nhật cache
  const updateCache = (newData: Notification) => {
    const cached = localStorage.getItem("notifications");
    if (cached) {
      const parsedCache = JSON.parse(cached);
      // Thêm thông báo mới vào đầu danh sách
      const updatedNotifications = [newData, ...parsedCache.notifications];
      const newUnreadCount = parsedCache.unreadCount + 1;

      // Cập nhật cache
      localStorage.setItem(
        "notifications",
        JSON.stringify({
          notifications: updatedNotifications,
          unreadCount: newUnreadCount,
          timestamp: Date.now(),
        })
      );

      // Cập nhật state
      setNotifications(updatedNotifications);
      setUnreadCount(newUnreadCount);
    }
  };

  // Sửa lại các hàm xử lý
  const markAsRead = async (notificationId: string) => {
    try {
      await databases.updateDocument(
        DATABASE_ID,
        NOTIFICATION_COLLECTION,
        notificationId,
        { isRead: true }
      );
      // Cập nhật cache thay vì xóa
      const cached = localStorage.getItem("notifications");
      if (cached) {
        const parsedCache = JSON.parse(cached);
        const updatedNotifications = parsedCache.notifications.map(
          (n: Notification) =>
            n.$id === notificationId ? { ...n, isRead: true } : n
        );
        localStorage.setItem(
          "notifications",
          JSON.stringify({
            ...parsedCache,
            notifications: updatedNotifications,
            unreadCount: parsedCache.unreadCount - 1,
          })
        );
        setNotifications(updatedNotifications);
        setUnreadCount((prev) => prev - 1);
      }
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    if (isMarkingRead) return; // Tránh double click

    try {
      setIsMarkingRead(true);
      const unreadNotifications = notifications.filter((n) => !n.isRead);
      await Promise.all(
        unreadNotifications.map((notification) =>
          databases.updateDocument(
            DATABASE_ID,
            NOTIFICATION_COLLECTION,
            notification.$id,
            { isRead: true }
          )
        )
      );

      // Cập nhật UI ngay lập tức
      const updatedNotifications = notifications.map((n) => ({
        ...n,
        isRead: true,
      }));
      setNotifications(updatedNotifications);
      setUnreadCount(0);
    } catch (error) {
      console.error("Error marking all as read:", error);
    } finally {
      setIsMarkingRead(false);
    }
  };

  useEffect(() => {
    // Kiểm tra cache trước
    if (!getCachedNotifications()) {
      fetchNotifications();
    }

    // Fetch định kỳ và cập nhật cache khi có thông báo mới
    const interval = setInterval(async () => {
      try {
        const user = await account.get();
        const response = await databases.listDocuments(
          DATABASE_ID,
          NOTIFICATION_COLLECTION,
          [Query.equal("userId", user.$id)]
        );

        const sortedNotifications = response.documents.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        // Check nếu có thông báo mới
        const cached = localStorage.getItem("notifications");
        if (cached) {
          const parsedCache = JSON.parse(cached);
          const newNotifications = sortedNotifications.filter(
            (newNotif) =>
              !parsedCache.notifications.find(
                (cachedNotif: Notification) => cachedNotif.$id === newNotif.$id
              )
          );

          // Nếu có thông báo mới thì update cache
          if (newNotifications.length > 0) {
            newNotifications.forEach((notification) => {
              updateCache(notification as unknown as Notification);
            });
          }
        }
      } catch (error) {
        console.error("Error checking new notifications:", error);
      }
    }, FETCH_COOLDOWN);

    return () => clearInterval(interval);
  }, []);
  const deleteNotification = async (notificationId: string) => {
    try {
      await databases.deleteDocument(
        DATABASE_ID,
        NOTIFICATION_COLLECTION,
        notificationId
      );

      // Xóa cache để fetch lại
      localStorage.removeItem("notifications");

      setNotifications((prev) => prev.filter((n) => n.$id !== notificationId));
      setUnreadCount((prev) => {
        const notification = notifications.find(
          (n) => n.$id === notificationId
        );
        return notification && !notification.isRead ? prev - 1 : prev;
      });
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    try {
      await markAsRead(notification.$id);

      // Kiểm tra type của notification để điều hướng
      if (notification.type === "feedback_response") {
        // Nếu là feedback thì vào trang hỗ trợ
        navigate(`/feedback?id=${notification.feedbackId}`);
        setShowNotifications(false);
      } else if (notification.type === "new_feedback") {
        // Nếu là feedback mới thì vào trang hỗ trợ
        navigate(`/feedback?id=${notification.feedbackId}`);
        setShowNotifications(false);
      } else if (
        notification.type === "discussion_comment" ||
        notification.type === "discussion_reply"
      ) {
        // Nếu là bình luận/phản hồi thảo luận thì vào trang thảo luận
        navigate(`/discussion?id=${notification.feedbackId}`);
        setShowNotifications(false);
      }
    } catch (error) {
      console.error("Error handling notification click:", error);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target as Node)
      ) {
        setShowNotifications(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="relative" ref={notificationRef}>
      <button
        onClick={() => setShowNotifications(!showNotifications)}
        className="relative p-2  rounded-full transition-colors"
      >
        <Bell className="w-6 h-6 text-gray-600" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {showNotifications && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="absolute right-0 mt-2 w-[450px] bg-white rounded-xl shadow-xl border border-gray-100 z-[9999]"
          >
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-900">Thông báo</h3>
              <div className="flex items-center gap-2">
                {notifications.length > 0 && (
                  <button
                    onClick={deleteAllNotifications}
                    disabled={isDeletingAll}
                    className={`text-sm text-red-600 hover:text-red-700 font-medium px-3 py-2 rounded-lg hover:bg-red-50 transition-colors ${
                      isDeletingAll ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                  >
                    {isDeletingAll ? "Đang xóa..." : "Xóa tất cả"}
                  </button>
                )}
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    disabled={isMarkingRead}
                    className={`text-sm text-blue-600 hover:text-blue-700 font-medium px-3 py-2 rounded-lg hover:bg-blue-50 transition-colors ${
                      isMarkingRead ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                  >
                    {isMarkingRead ? "Đang xử lý..." : "Đánh dấu đã đọc tất cả"}
                  </button>
                )}
              </div>
            </div>

            <div className="max-h-[85vh] overflow-y-auto custom-scrollbar">
              {notifications.length > 0 ? (
                notifications.map((notification) => (
                  <motion.div
                    key={notification.$id}
                    className={`relative group p-4 border-b border-gray-100 hover:bg-gray-50 
                        transition-colors cursor-pointer ${
                          !notification.isRead ? "bg-blue-50" : ""
                        }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex gap-4">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center text-white">
                          {notification.type === "feedback_response" ? (
                            <i className="ri-message-3-line text-xl"></i>
                          ) : (
                            <i className="ri-notification-3-line text-xl"></i>
                          )}
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-gray-900">
                            {notification.title}
                          </h4>
                          {/* Thay đổi phần này */}
                          <div className="flex items-center gap-4">
                            {" "}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteNotification(notification.$id);
                              }}
                              className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                        <div
                          className="p-3 bg-gray-50 rounded-lg"
                          onClick={() => handleNotificationClick(notification)}
                        >
                          <p className="text-gray-700 text-sm whitespace-pre-wrap break-words">
                            {notification.message}
                          </p>
                        </div>
                        <span className="text-xs text-gray-500 mt-2 block">
                          {new Date(notification.createdAt).toLocaleDateString(
                            "vi-VN",
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="p-8 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                    <Bell className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500 font-medium">
                    Chưa có thông báo nào
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationComponent;
