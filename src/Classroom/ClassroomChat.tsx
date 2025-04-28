import React, { useState, useEffect, useRef } from "react";
import { Send, MoreVertical, Trash2, RotateCcw, X } from "lucide-react";
import { Client, Models, RealtimeResponseEvent, Query } from "appwrite";
import { useAuth } from "../contexts/auth/authProvider";
import { debounce } from "lodash";
import { useDataCache } from "../contexts/auth/DataCacheProvider";
import { useClassroomStore } from "../stores/classroomStore";
interface Message extends Models.Document {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  $permissions: string[];
  $collectionId: string;
  $databaseId: string;
  content: string;
  senderId: string;
  senderName: string;
  timestamp: string;
  classroomId: string;
}

interface ChatProps {
  classroomId: string;
}

const ClassroomChat: React.FC<ChatProps> = ({ classroomId }) => {
  const [, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { account, databases, client } = useAuth();
  const [currentUser, setCurrentUser] =
    useState<Models.User<Models.Preferences> | null>(null);
  const { getCachedData, setCachedData, isDataCached } = useDataCache();
  const { messages, refreshMessages, addMessage } = useClassroomStore();
  const CACHE_KEY = `chat-messages-${classroomId}`;
  const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes - shorter duration for chat
  const DATABASE_ID = "674e5e7a0008e19d0ef0";
  const MESSAGES_COLLECTION_ID = "67569a43002f288aa7d4";

  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const user = await account.get();
        setCurrentUser(user);
      } catch (error) {
        console.error("Error getting current user:", error);
      }
    };
    getCurrentUser();
  }, [account]);

  useEffect(() => {
    refreshMessages({ classroomId, databases });
    fetchMessages();
    const unsubscribe = client.subscribe(
      `databases.${DATABASE_ID}.collections.${MESSAGES_COLLECTION_ID}.documents`,
      (response: RealtimeResponseEvent<Message>) => {
        if (!response.payload || response.payload.classroomId !== classroomId)
          return;

        // Dùng addMessage từ store
        if (
          response.events.includes(
            "databases.*.collections.*.documents.*.create"
          )
        ) {
          addMessage(response.payload as Message);
        }
      }
    );

    return () => {
      unsubscribe();
    };
  }, [classroomId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    debouncedScrollToBottom();
    // Cleanup
    return () => {
      debouncedScrollToBottom.cancel();
    };
  }, [messages]);
  const fetchMessages = async () => {
    try {
      setIsLoading(true);

      // Check cache first
      if (isDataCached(CACHE_KEY)) {
        const cachedMessages = getCachedData(CACHE_KEY);
        setMessages(cachedMessages);
        return cachedMessages;
      }

      const response = await databases.listDocuments(
        DATABASE_ID,
        MESSAGES_COLLECTION_ID,
        [
          Query.equal("classroomId", [classroomId]),
          Query.orderAsc("$createdAt"),
          Query.limit(100),
        ]
      );

      const fetchedMessages = response.documents as Message[];

      // Cache the messages
      setCachedData(CACHE_KEY, fetchedMessages, CACHE_DURATION);
      return fetchedMessages;
    } catch (error) {
      console.error("Error fetching messages:", error);
      setError("Failed to load messages");
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  // Trong useEffect
  useEffect(() => {
    let isSubscribed = true;

    const loadData = async () => {
      try {
        setIsLoading(true);
        const messages = await fetchMessages();
        if (isSubscribed) {
          setMessages(messages);
        }
      } catch (error) {
        if (isSubscribed) {
          console.error("Error loading messages:", error);
          setError("Failed to load messages");
        }
      } finally {
        if (isSubscribed) {
          setIsLoading(false);
        }
      }
    };

    loadData();
    const unsubscribe = subscribeToMessages();

    return () => {
      isSubscribed = false;
      if (typeof unsubscribe === "function") {
        unsubscribe();
      }
    };
  }, [classroomId]);

  const debouncedScrollToBottom = debounce(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, 100);

  const subscribeToMessages = () => {
    const client = new Client()
      .setEndpoint("https://store.hjm.bid/v1")
      .setProject("674818e10034704a2276");

    return client.subscribe(
      `databases.${DATABASE_ID}.collections.${MESSAGES_COLLECTION_ID}.documents`,
      (response: RealtimeResponseEvent<Message>) => {
        if (!response.payload) return;

        if (response.payload.classroomId !== classroomId) return;

        if (
          response.events.includes(
            "databases.*.collections.*.documents.*.create"
          )
        ) {
          setMessages((prev) => [...prev, response.payload as Message]); // Thêm vào cuối
        }

        if (
          response.events.includes(
            "databases.*.collections.*.documents.*.delete"
          )
        ) {
          setMessages((prev) =>
            prev.filter((msg) => msg.$id !== response.payload.$id)
          );
        }

        if (
          response.events.includes(
            "databases.*.collections.*.documents.*.update"
          )
        ) {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.$id === response.payload.$id
                ? (response.payload as Message)
                : msg
            )
          );
        }
      }
    );
  };
  useEffect(() => {
    if (messages.length > 0) {
      const timeoutId = setTimeout(() => {
        debouncedScrollToBottom();
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [messages]);
  const sendMessage = async () => {
    if (!newMessage.trim() || !currentUser) return;
    const messageContent = newMessage.trim();

    try {
      setNewMessage("");

      const messageData = {
        content: messageContent,
        senderId: currentUser.$id,
        senderName: currentUser.name,
        timestamp: new Date().toISOString(),
        classroomId: classroomId,
      };

      // Gửi tin nhắn và đợi response
      const response = await databases.createDocument(
        DATABASE_ID,
        MESSAGES_COLLECTION_ID,
        "unique()",
        messageData
      );

      // Thêm message mới vào store ngay sau khi gửi thành công
      addMessage(response as Message);
    } catch (error) {
      console.error("Error sending message:", error);
      setError("Failed to send message");
      setNewMessage(messageContent);
    }
  };

  const deleteMessage = async (messageId: string) => {
    if (!messageId || messageId.startsWith("temp-")) {
      setError("Cannot delete message at this time. Please try again.");
      return;
    }

    try {
      await databases.deleteDocument(
        DATABASE_ID,
        MESSAGES_COLLECTION_ID,
        messageId
      );

      setMessages((prev) => prev.filter((msg) => msg.$id !== messageId));
      setSelectedMessage(null);
      setIsMenuOpen(false);
    } catch (error) {
      console.error("Error deleting message:", error);
      setError("Failed to delete message");
    }
  };

  const recallMessage = async (messageId: string) => {
    if (!messageId || messageId.startsWith("temp-")) {
      setError("Cannot recall message at this time. Please try again.");
      return;
    }

    try {
      await databases.updateDocument(
        DATABASE_ID,
        MESSAGES_COLLECTION_ID,
        messageId,
        {
          isRecalled: true,
        }
      );

      setMessages((prev) =>
        prev.map((msg) =>
          msg.$id === messageId ? { ...msg, isRecalled: true } : msg
        )
      );
      setSelectedMessage(null);
      setIsMenuOpen(false);
    } catch (error) {
      console.error("Error recalling message:", error);
      setError("Failed to recall message");
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="flex flex-col h-[600px] bg-white rounded-lg shadow">
      {/* Chat Header */}
      <div className="p-4 border-b">
        <h3 className="text-lg font-semibold">Class Chat</h3>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div
                key={message.$id}
                className={`flex ${
                  message.senderId === currentUser?.$id
                    ? "justify-end"
                    : "justify-start"
                }`}
              >
                <div className="relative group max-w-[70%]">
                  <div
                    className={`p-3 rounded-lg ${
                      message.senderId === currentUser?.$id
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-900"
                    }`}
                  >
                    {message.isRecalled ? (
                      <p className="italic text-gray-500">
                        Tin nhắn đã được thu hồi
                      </p>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium">
                            {message.senderName}
                          </span>
                          <span className="text-xs opacity-75">
                            {new Date(message.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <p>{message.content}</p>
                      </>
                    )}
                  </div>

                  {message.senderId === currentUser?.$id &&
                    !message.isRecalled && (
                      <div className="absolute top-0 right-0 -mt-2 -mr-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => {
                            setSelectedMessage(message);
                            setIsMenuOpen(true);
                          }}
                          className="p-1 bg-white rounded-full shadow-lg hover:bg-gray-100"
                        >
                          <MoreVertical className="w-4 h-4 text-gray-600" />
                        </button>
                      </div>
                    )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Message Input */}
      <div className="p-4 border-t">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            onKeyPress={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
          />
          <button
            onClick={sendMessage}
            className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Message Actions Modal */}
      {isMenuOpen && selectedMessage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-72">
            <div className="p-4 border-b">
              <h3 className="font-medium">Message Actions</h3>
            </div>
            <div className="p-4 space-y-2">
              <button
                onClick={() => recallMessage(selectedMessage.$id)}
                className="w-full flex items-center gap-2 px-4 py-2 text-left hover:bg-gray-100 rounded"
              >
                <RotateCcw className="w-4 h-4" />
                Recall Message
              </button>
              <button
                onClick={() => deleteMessage(selectedMessage.$id)}
                className="w-full flex items-center gap-2 px-4 py-2 text-left text-red-600 hover:bg-red-50 rounded"
              >
                <Trash2 className="w-4 h-4" />
                Delete Message
              </button>
            </div>
            <div className="p-4 border-t flex justify-end">
              <button
                onClick={() => {
                  setSelectedMessage(null);
                  setIsMenuOpen(false);
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded ">
          <span className="block sm:inline">{error}</span>
          <button
            onClick={() => setError(null)}
            className="absolute top-0 bottom-0 right-0 px-4 py-3"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export default ClassroomChat;
