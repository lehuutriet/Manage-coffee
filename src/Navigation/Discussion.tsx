import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../contexts/auth/authProvider";
import { Query } from "appwrite";
import { toast } from "react-hot-toast";
import { Loader2 } from "lucide-react";
import Navigation from "./Navigation";
import EducationalFooter from "../EducationalFooter/EducationalFooter";
import { Dialog } from "@headlessui/react";

interface Post {
  $id: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: string;
  imageIds: string[]; // Đổi thành array
  videoIds: string[]; // Đổi thành array
  documentIds: string[]; // Đổi thành array
  likes: number;
  comments: Comment[];
  authorAvatarId?: string;
}
interface Comment {
  $id: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: string;
  postId: string;
  authorAvatarId?: string;
  parentId?: string;
  replyToUser?: string;
}
interface UploadedFile extends File {
  $id?: string;
}
const Discussion = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPost, setNewPost] = useState({
    content: "",
  });

  const [, setSelectedPost] = useState<string | null>(null);

  const { databases, account, storage } = useAuth();
  // Thêm các state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{
    id: string;
    type: "post" | "comment";
  } | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [replyComment, setReplyComment] = useState("");
  const [replyTo, setReplyTo] = useState<{
    commentId: string;
    authorName: string;
    position: number;
  } | null>(null);
  const [userData, setUserData] = useState({
    name: "",
    email: "",
    avatarUrl: "",
  });
  const [commentInputs, setCommentInputs] = useState<{ [key: string]: string }>(
    {}
  );
  const [isCommentLoading, setIsCommentLoading] = useState<string>(""); // Lưu ID của post đang loading
  const DATABASE_ID = "674e5e7a0008e19d0ef0";
  const POSTS_COLLECTION = "6785ec67003d7e3402ba";
  const COMMENTS_COLLECTION = "6785ec7900058f905a2a";
  const DATAFORDiscussion = "67886619002bc2cbf342"; // ID của bucket chứa avatar
  const imageforProfile = "677b9ade002576cc5ecf";
  const NOTIFICATION_COLLECTION = "6780e316003b3a0ade3c";
  const [selectedFiles, setSelectedFiles] = useState<{
    images: UploadedFile[];
    videos: UploadedFile[];
    documents: UploadedFile[];
  }>({
    images: [],
    videos: [],
    documents: [],
  });
  const [isLoading, setIsLoading] = useState(false); // Thêm state này vào đầu component
  // Thêm refs cho input file
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);

  // Hàm xử lý khi chọn file
  // Trong hàm handleFileSelect, sau khi upload thành công:
  const handleFileSelect = async (
    type: "images" | "videos" | "documents",
    files: FileList | null
  ) => {
    if (!files) return;

    const fileArray = Array.from(files);
    const filtered = fileArray.filter(
      (newFile) =>
        !selectedFiles[type].some(
          (existingFile) =>
            existingFile.name === newFile.name &&
            existingFile.size === newFile.size
        )
    );

    // Thay vì upload ngay, chỉ lưu file vào state
    const newFiles = filtered.map((file) => {
      const uploadedFile = file as UploadedFile;
      return uploadedFile;
    });

    setSelectedFiles((prev) => ({
      ...prev,
      [type]: [...prev[type], ...newFiles],
    }));
  };
  // Hàm xóa file
  const removeFile = async (
    type: "images" | "videos" | "documents",
    index: number
  ) => {
    try {
      const fileToRemove = selectedFiles[type][index] as UploadedFile;

      if (fileToRemove.$id) {
        await storage.deleteFile(DATAFORDiscussion, fileToRemove.$id);
      }

      setSelectedFiles((prev) => ({
        ...prev,
        [type]: prev[type].filter((_, i) => i !== index),
      }));

      // Reset input file
      if (type === "images" && imageInputRef.current) {
        imageInputRef.current.value = "";
      } else if (type === "videos" && videoInputRef.current) {
        videoInputRef.current.value = "";
      } else if (type === "documents" && documentInputRef.current) {
        documentInputRef.current.value = "";
      }
    } catch (error) {
      console.error("Error removing file:", error);
      toast.error("Không thể xóa file");
    }
  };
  useEffect(() => {
    fetchPosts();
  }, []);
  useEffect(() => {
    const getUserData = async () => {
      try {
        const user = await account.get();
        setUserData({
          name: user.name || "",
          email: user.email || "",
          avatarUrl: user.prefs?.avatarUrl || "",
        });
      } catch (error) {
        console.error("Error getting user data:", error);
      }
    };
    getUserData();
  }, []);
  const fetchPosts = async () => {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        POSTS_COLLECTION,
        [Query.orderDesc("createdAt")]
      );

      // Lấy comments cho mỗi bài post
      const postsWithComments = await Promise.all(
        response.documents.map(async (post) => {
          const comments = await databases.listDocuments(
            DATABASE_ID,
            COMMENTS_COLLECTION,
            [Query.equal("postId", post.$id)]
          );
          return {
            ...post,
            comments: comments.documents,
          };
        })
      );

      setPosts(postsWithComments as unknown as Post[]);
    } catch (error) {
      console.error("Error fetching posts:", error);
      toast.error("Không thể tải bài viết");
    } finally {
      setLoading(false);
    }
  };

  const createPost = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check nội dung và files
    if (
      !newPost.content.trim() &&
      selectedFiles.images.length === 0 &&
      selectedFiles.videos.length === 0 &&
      selectedFiles.documents.length === 0
    ) {
      toast.error("Vui lòng nhập nội dung hoặc chọn file");
      return;
    }

    // Thêm loading state
    setIsLoading(true);

    try {
      const user = await account.get();
      const avatarUrl = user.prefs?.avatarUrl;
      let avatarId = null;
      if (avatarUrl) {
        const urlParts = avatarUrl.split("/");
        avatarId = urlParts[urlParts.indexOf("files") + 1];
      }

      // Upload all files first
      let uploadedFiles: {
        images: string[];
        videos: string[];
        documents: string[];
      } = {
        images: [],
        videos: [],
        documents: [],
      };

      // Upload images
      if (selectedFiles.images.length > 0) {
        const imageUploads = await Promise.all(
          selectedFiles.images.map((file) =>
            storage.createFile(DATAFORDiscussion, "unique()", file)
          )
        );
        uploadedFiles.images = imageUploads.map((file) => file.$id);
      }

      // Upload videos
      if (selectedFiles.videos.length > 0) {
        const videoUploads = await Promise.all(
          selectedFiles.videos.map((file) =>
            storage.createFile(DATAFORDiscussion, "unique()", file)
          )
        );
        uploadedFiles.videos = videoUploads.map((file) => file.$id);
      }

      // Upload documents
      if (selectedFiles.documents.length > 0) {
        const documentUploads = await Promise.all(
          selectedFiles.documents.map((file) =>
            storage.createFile(DATAFORDiscussion, "unique()", file)
          )
        );
        uploadedFiles.documents = documentUploads.map((file) => file.$id);
      }

      // Create post with uploaded file IDs
      await databases.createDocument(
        DATABASE_ID,
        POSTS_COLLECTION,
        "unique()",
        {
          content: newPost.content,
          authorId: user.$id,
          authorName: user.name,
          authorAvatarId: avatarId,
          createdAt: new Date().toISOString(),
          likes: 0,
          imageIds: uploadedFiles.images,
          videoIds: uploadedFiles.videos,
          documentIds: uploadedFiles.documents,
        }
      );

      // Reset form
      setNewPost({ content: "" });
      setSelectedFiles({ images: [], videos: [], documents: [] });
      // Reset input files
      if (imageInputRef.current) imageInputRef.current.value = "";
      if (videoInputRef.current) videoInputRef.current.value = "";
      if (documentInputRef.current) documentInputRef.current.value = "";

      toast.success("Đăng bài thành công");
      fetchPosts();
    } catch (error) {
      console.error("Error creating post:", error);
      toast.error("Không thể đăng bài");
    } finally {
      setIsLoading(false);
    }
  };
  // Thêm useEffect để lấy current user
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
  }, []);
  const handleReply = async (postId: string, parentCommentId: string) => {
    if (!replyComment.trim()) {
      toast.error("Vui lòng nhập nội dung phản hồi");
      return;
    }

    try {
      const user = await account.get();
      const avatarUrl = user.prefs?.avatarUrl;
      let avatarId = null;
      const comments = await databases.listDocuments(
        DATABASE_ID,
        COMMENTS_COLLECTION,
        [Query.equal("$id", parentCommentId)]
      );
      const parentComment = comments.documents[0];
      if (avatarUrl) {
        const urlParts = avatarUrl.split("/");
        avatarId = urlParts[urlParts.indexOf("files") + 1];
      }

      await databases.createDocument(
        DATABASE_ID,
        COMMENTS_COLLECTION,
        "unique()",
        {
          content: replyComment,
          postId,
          authorId: user.$id,
          authorName: user.name,
          authorAvatarId: avatarId,
          createdAt: new Date().toISOString(),
          parentId: parentCommentId,
          replyToUser: replyTo?.authorName || "",
        }
      );
      setReplyComment("");
      setReplyTo(null);
      fetchPosts();
      toast.success("Đã phản hồi bình luận");
      // Trong hàm handleReply
      // Sau khi tạo reply thành công
      await databases.createDocument(
        DATABASE_ID,
        NOTIFICATION_COLLECTION,
        "unique()",
        {
          userId: parentComment.authorId,
          feedbackId: postId,
          type: "discussion_reply",

          isRead: false,
          title: "Có phản hồi mới",
          message: `${user.name} đã phản hồi`, // Rút ngắn message
          createdAt: new Date().toISOString(),
        }
      );
    } catch (error) {
      console.error("Error replying to comment:", error);
      toast.error("Không thể phản hồi bình luận");
    }
  };
  const deletePost = async (postId: string) => {
    try {
      // Lấy thông tin post trước khi xóa
      const postToDelete = posts.find((p) => p.$id === postId);
      if (!postToDelete) return;

      // Xóa các files từ storage nếu có
      if (postToDelete.imageIds && postToDelete.imageIds.length > 0) {
        await Promise.all(
          postToDelete.imageIds.map((imageId) =>
            storage.deleteFile(DATAFORDiscussion, imageId)
          )
        );
      }

      if (postToDelete.videoIds && postToDelete.videoIds.length > 0) {
        await Promise.all(
          postToDelete.videoIds.map((videoId) =>
            storage.deleteFile(DATAFORDiscussion, videoId)
          )
        );
      }

      if (postToDelete.documentIds && postToDelete.documentIds.length > 0) {
        await Promise.all(
          postToDelete.documentIds.map((docId) =>
            storage.deleteFile(DATAFORDiscussion, docId)
          )
        );
      }

      // Xóa tất cả comments của post
      const comments = await databases.listDocuments(
        DATABASE_ID,
        COMMENTS_COLLECTION,
        [Query.equal("postId", postId)]
      );

      await Promise.all(
        comments.documents.map((comment) =>
          databases.deleteDocument(
            DATABASE_ID,
            COMMENTS_COLLECTION,
            comment.$id
          )
        )
      );

      // Sau đó xóa post
      await databases.deleteDocument(DATABASE_ID, POSTS_COLLECTION, postId);

      toast.success("Đã xóa bài viết");
      fetchPosts();
    } catch (error) {
      console.error("Error deleting post:", error);
      toast.error("Không thể xóa bài viết");
    }
  };
  const deleteComment = async (commentId: string) => {
    try {
      // Lấy tất cả replies của comment này
      const replies = await databases.listDocuments(
        DATABASE_ID,
        COMMENTS_COLLECTION,
        [Query.equal("parentId", commentId)]
      );

      // Xóa tất cả replies trước
      await Promise.all(
        replies.documents.map((reply) =>
          databases.deleteDocument(DATABASE_ID, COMMENTS_COLLECTION, reply.$id)
        )
      );

      // Sau đó xóa comment chính
      await databases.deleteDocument(
        DATABASE_ID,
        COMMENTS_COLLECTION,
        commentId
      );

      toast.success("Đã xóa bình luận");
      fetchPosts();
    } catch (error) {
      console.error("Error deleting comment:", error);
      toast.error("Không thể xóa bình luận");
    }
  };
  // Thay đổi hàm delete
  const handleDelete = () => {
    if (!itemToDelete) return;

    if (itemToDelete.type === "post") {
      deletePost(itemToDelete.id);
    } else {
      deleteComment(itemToDelete.id);
    }
    setShowDeleteModal(false);
    setItemToDelete(null);
  };
  const handleLike = async (postId: string) => {
    try {
      // Lấy thông tin post hiện tại
      const post = posts.find((p) => p.$id === postId);
      if (!post) return;

      // Cập nhật số like trong database
      await databases.updateDocument(DATABASE_ID, POSTS_COLLECTION, postId, {
        likes: (post.likes || 0) + 1,
      });

      // Cập nhật UI
      setPosts(
        posts.map((p) =>
          p.$id === postId ? { ...p, likes: (p.likes || 0) + 1 } : p
        )
      );
    } catch (error) {
      console.error("Error liking post:", error);
      toast.error("Không thể thực hiện like");
    }
  };
  const addComment = async (postId: string) => {
    if (!commentInputs[postId]?.trim()) {
      toast.error("Vui lòng nhập nội dung bình luận");
      return;
    }

    setIsCommentLoading(postId);
    try {
      const user = await account.get();
      const avatarUrl = user.prefs?.avatarUrl;
      let avatarId = null;

      // Lấy thông tin post
      const posts = await databases.listDocuments(
        DATABASE_ID,
        POSTS_COLLECTION,
        [Query.equal("$id", postId)]
      );
      const post = posts.documents[0];
      if (avatarUrl) {
        const urlParts = avatarUrl.split("/");
        avatarId = urlParts[urlParts.indexOf("files") + 1];
      }
      await databases.createDocument(
        DATABASE_ID,
        COMMENTS_COLLECTION,
        "unique()",
        {
          content: commentInputs[postId],
          postId,
          authorId: user.$id,
          authorName: user.name,
          authorAvatarId: avatarId,
          createdAt: new Date().toISOString(),
        }
      );
      // Trong hàm addComment
      await databases.createDocument(
        DATABASE_ID,
        NOTIFICATION_COLLECTION,
        "unique()",
        {
          userId: post.authorId,
          feedbackId: post.$id,
          type: "discussion_comment",
          isRead: false,
          title: "Có bình luận mới",
          message: `${user.name} đã bình luận`, // Rút ngắn message xuống dưới 30 ký tự
          createdAt: new Date().toISOString(),
        }
      );
      // Clear input của post đó
      setCommentInputs((prev) => ({ ...prev, [postId]: "" }));
      fetchPosts();
      toast.success("Bình luận thành công");
    } catch (error) {
      console.error("Error adding comment:", error);
      toast.error("Không thể thêm bình luận");
    } finally {
      setIsCommentLoading(""); // Reset loading state
    }
  };

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="max-w-5xl mx-auto px-4 py-12">
          <div className="mb-10 text-center">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-3">
              Diễn đàn thảo luận
            </h1>
            <p className="text-gray-600 text-lg">
              Nơi chia sẻ kiến thức và kết nối cộng đồng
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full overflow-hidden">
                {userData.avatarUrl ? (
                  <img
                    src={userData.avatarUrl}
                    alt={userData.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white text-xl">
                    {userData.name?.[0] || "U"}
                  </div>
                )}
              </div>

              <div className="flex-1">
                <input
                  type="text"
                  placeholder={`${userData.name}, bạn muốn thảo luận gì?`}
                  value={newPost.content}
                  onChange={(e) =>
                    setNewPost({ ...newPost, content: e.target.value })
                  }
                  className="w-full bg-gray-100 hover:bg-gray-200 transition-colors rounded-full py-3 px-6 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 placeholder-gray-500"
                />
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center justify-around mb-4">
                <input
                  type="file"
                  ref={imageInputRef}
                  className="hidden"
                  accept="image/*"
                  multiple
                  onChange={(e) => handleFileSelect("images", e.target.files)}
                />
                <input
                  type="file"
                  ref={videoInputRef}
                  className="hidden"
                  accept="video/*"
                  multiple
                  onChange={(e) => handleFileSelect("videos", e.target.files)}
                />
                <input
                  type="file"
                  ref={documentInputRef}
                  className="hidden"
                  accept=".doc,.docx,.pdf,.txt"
                  multiple
                  onChange={(e) =>
                    handleFileSelect("documents", e.target.files)
                  }
                />

                <button
                  onClick={() => imageInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <i className="ri-image-line text-blue-500 text-xl"></i>
                  Hình ảnh
                </button>

                <button
                  onClick={() => videoInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <i className="ri-video-line text-green-500 text-xl"></i>
                  Video
                </button>

                <button
                  onClick={() => documentInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <i className="ri-attachment-line text-orange-500 text-xl"></i>
                  Tài liệu
                </button>
              </div>
              {/* File previews */}
              {(selectedFiles.images.length > 0 ||
                selectedFiles.videos.length > 0 ||
                selectedFiles.documents.length > 0) && (
                <div className="space-y-4 mt-4">
                  {/* Image previews */}
                  {selectedFiles.images.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-gray-700">
                        Hình ảnh đã chọn:
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedFiles.images.map((file, index) => (
                          <div key={index} className="relative">
                            <img
                              src={URL.createObjectURL(file)}
                              alt={file.name}
                              className="w-20 h-20 object-cover rounded-lg"
                            />
                            <button
                              onClick={() => removeFile("images", index)}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                            >
                              <i className="ri-close-line"></i>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Video previews */}
                  {selectedFiles.videos.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-gray-700">
                        Video đã chọn:
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedFiles.videos.map((file, index) => (
                          <div
                            key={index}
                            className="relative flex items-center bg-gray-100 p-2 rounded-lg"
                          >
                            <i className="ri-video-line text-green-500 mr-2"></i>
                            <span className="text-sm text-gray-600">
                              {file.name}
                            </span>
                            <button
                              onClick={() => removeFile("videos", index)}
                              className="ml-2 text-red-500 hover:text-red-600"
                            >
                              <i className="ri-close-line"></i>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Document previews */}
                  {selectedFiles.documents.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-gray-700">
                        Tài liệu đã chọn:
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedFiles.documents.map((file, index) => (
                          <div
                            key={index}
                            className="relative flex items-center bg-gray-100 p-2 rounded-lg"
                          >
                            <i className="ri-file-line text-orange-500 mr-2"></i>
                            <span className="text-sm text-gray-600">
                              {file.name}
                            </span>
                            <button
                              onClick={() => removeFile("documents", index)}
                              className="ml-2 text-red-500 hover:text-red-600"
                            >
                              <i className="ri-close-line"></i>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              <button
                onClick={createPost}
                disabled={isLoading}
                className="w-full flex justify-center items-center gap-2 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Đang đăng bài...
                  </>
                ) : (
                  <>
                    Đăng bài
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M13 7l5 5m0 0l-5 5m5-5H6"
                      />
                    </svg>
                  </>
                )}
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
            </div>
          ) : (
            <div className="space-y-8">
              {posts.map((post) => (
                <div
                  key={post.$id}
                  className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100 p-6 backdrop-blur-sm backdrop-filter"
                >
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <div className="flex items-center gap-3 text-sm text-gray-500">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full overflow-hidden">
                            {post.authorAvatarId ? (
                              <img
                                src={storage.getFileView(
                                  imageforProfile,
                                  post.authorAvatarId
                                )}
                                alt={post.authorName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center text-white text-xs">
                                {post.authorName[0]}
                              </div>
                            )}
                          </div>
                          <span className="font-medium">{post.authorName}</span>
                        </div>
                        <span>•</span>
                        <span>
                          {new Date(post.createdAt).toLocaleDateString(
                            "vi-VN",
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                            }
                          )}
                        </span>
                      </div>
                    </div>

                    {post.authorId === currentUser?.$id && (
                      <button
                        onClick={() => {
                          setItemToDelete({ id: post.$id, type: "post" });
                          setShowDeleteModal(true);
                        }}
                        className="text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-red-50"
                      >
                        <i className="ri-delete-bin-line text-lg"></i>
                      </button>
                    )}
                  </div>

                  <p className="text-gray-700 leading-relaxed mb-6 whitespace-pre-wrap">
                    {post.content}
                  </p>
                  {/* Hiển thị hình ảnh */}
                  {post.imageIds && post.imageIds.length > 0 && (
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      {post.imageIds.map((imageId: string) => (
                        <img
                          key={imageId}
                          src={storage.getFilePreview(
                            DATAFORDiscussion,
                            imageId,
                            2000 // width
                          )}
                          alt="Post image"
                          className="rounded-lg w-full h-48 object-cover cursor-pointer"
                          onClick={() =>
                            window.open(
                              storage.getFileView(DATAFORDiscussion, imageId),
                              "_blank"
                            )
                          }
                        />
                      ))}
                    </div>
                  )}
                  {/* Hiển thị video */}
                  {post.videoIds && post.videoIds.length > 0 && (
                    <div className="space-y-2 mb-4">
                      {post.videoIds.map((videoId) => (
                        <video
                          key={videoId}
                          src={storage.getFileView(DATAFORDiscussion, videoId)}
                          controls
                          className="rounded-lg w-full"
                        />
                      ))}
                    </div>
                  )}
                  {/* Hiển thị tài liệu */}
                  {post.documentIds && post.documentIds.length > 0 && (
                    <div className="space-y-2 mb-4">
                      {post.documentIds.map((docId) => (
                        <a
                          key={docId}
                          href={storage.getFileView(DATAFORDiscussion, docId)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg hover:bg-gray-100"
                        >
                          <i className="ri-file-line text-orange-500"></i>
                          <span className="text-blue-600 hover:underline">
                            Xem tài liệu
                          </span>
                        </a>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-6 text-gray-500">
                    <button
                      onClick={() => handleLike(post.$id)}
                      className="flex items-center gap-2 hover:text-blue-600 transition-colors group"
                    >
                      <i className="ri-thumb-up-line text-xl group-hover:scale-110 transition-transform"></i>
                      <span className="font-medium">{post.likes || 0}</span>
                    </button>

                    <button
                      onClick={() => setSelectedPost(post.$id)}
                      className="flex items-center gap-2 hover:text-blue-600 transition-colors group"
                    >
                      <i className="ri-chat-3-line text-xl group-hover:scale-110 transition-transform"></i>
                      <span className="font-medium">
                        {post.comments?.length || 0} bình luận
                      </span>
                    </button>
                  </div>

                  {/* Comment section */}
                  <div className="mt-8 pt-6 border-t border-gray-100">
                    {/* Comment form */}
                    <div className="flex items-start gap-4 mb-8">
                      <div className="w-10 h-10 rounded-full overflow-hidden shadow-sm">
                        {userData.avatarUrl ? (
                          <img
                            src={userData.avatarUrl}
                            alt={userData.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-medium text-lg">
                            {userData.name?.[0] || "U"}
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <textarea
                          value={commentInputs[post.$id] || ""}
                          onChange={(e) =>
                            setCommentInputs((prev) => ({
                              ...prev,
                              [post.$id]: e.target.value,
                            }))
                          }
                          className="w-full px-4 py-3 bg-gray-50 hover:bg-white focus:bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                          placeholder="Chia sẻ suy nghĩ của bạn..."
                          rows={1}
                        />
                        {commentInputs[post.$id]?.trim() && (
                          <div className="mt-3 flex justify-end">
                            <button
                              onClick={() => addComment(post.$id)}
                              disabled={isCommentLoading === post.$id}
                              className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                              {isCommentLoading === post.$id ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  Đang đăng...
                                </>
                              ) : (
                                "Đăng bình luận"
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Comments list */}
                    {post.comments?.length > 0 && (
                      <div className="space-y-6">
                        {post.comments
                          .filter((c) => !c.parentId)
                          .map((comment, index) => (
                            <div key={comment.$id} className="space-y-4">
                              <div className="flex gap-4">
                                <div className="w-10 h-10 rounded-full overflow-hidden shadow-sm flex-shrink-0">
                                  {comment.authorAvatarId ? (
                                    <img
                                      src={storage.getFileView(
                                        imageforProfile,
                                        comment.authorAvatarId
                                      )}
                                      alt={comment.authorName}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-medium">
                                      {comment.authorName?.[0] || "U"}
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1">
                                  <div className="bg-gray-100 rounded-2xl px-4 py-2">
                                    <div className="font-medium text-gray-900">
                                      {comment.authorName}
                                    </div>
                                    <p className="text-gray-700">
                                      {comment.content}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-4 mt-1 text-sm">
                                    <button
                                      onClick={() =>
                                        setReplyTo({
                                          commentId: comment.$id,
                                          authorName: comment.authorName,
                                          position: index,
                                        })
                                      }
                                      className="text-gray-500 hover:text-blue-600"
                                    >
                                      Phản hồi
                                    </button>
                                    <span>
                                      {new Date(
                                        comment.createdAt
                                      ).toLocaleDateString("vi-VN", {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                        day: "2-digit",
                                        month: "2-digit",
                                        year: "numeric",
                                      })}
                                    </span>
                                    {(comment.authorId === currentUser?.$id ||
                                      post.authorId === currentUser?.$id) && (
                                      <button
                                        onClick={() => {
                                          setItemToDelete({
                                            id: comment.$id,
                                            type: "comment",
                                          });
                                          setShowDeleteModal(true);
                                        }}
                                        className="text-red-500 hover:text-red-700"
                                      >
                                        Xóa
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Replies section with similar styling updates */}
                              {post.comments
                                .filter((c) => c.parentId === comment.$id)
                                .map((reply) => (
                                  <div
                                    key={reply.$id}
                                    className="ml-12 space-y-3"
                                  >
                                    <div className="flex gap-3">
                                      <div className="w-8 h-8 rounded-full overflow-hidden shadow-sm flex-shrink-0">
                                        {reply.authorAvatarId ? (
                                          <img
                                            src={storage.getFileView(
                                              imageforProfile,
                                              reply.authorAvatarId
                                            )}
                                            alt={reply.authorName}
                                            className="w-full h-full object-cover"
                                          />
                                        ) : (
                                          <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-medium">
                                            {reply.authorName?.[0] || "U"}
                                          </div>
                                        )}
                                      </div>
                                      <div className="flex-1">
                                        <div className="bg-gray-100 rounded-2xl px-4 py-2">
                                          <div className="font-medium text-gray-900">
                                            {reply.authorName}
                                          </div>
                                          <p className="text-gray-700">
                                            <span className="text-blue-600 font-medium">
                                              @{reply.replyToUser}{" "}
                                            </span>{" "}
                                            {reply.content}
                                          </p>
                                        </div>
                                        <div className="flex items-center gap-4 mt-1 text-sm">
                                          <button
                                            onClick={() =>
                                              setReplyTo({
                                                commentId: comment.$id,
                                                authorName: reply.authorName,
                                                position: index,
                                              })
                                            }
                                            className="text-gray-500 hover:text-blue-600"
                                          >
                                            Phản hồi
                                          </button>
                                          <span>
                                            {new Date(
                                              post.createdAt
                                            ).toLocaleDateString("vi-VN", {
                                              hour: "2-digit",
                                              minute: "2-digit",
                                              day: "2-digit",
                                              month: "2-digit",
                                              year: "numeric",
                                            })}
                                          </span>
                                          {(reply.authorId ===
                                            currentUser?.$id ||
                                            post.authorId ===
                                              currentUser?.$id) && (
                                            <button
                                              onClick={() => {
                                                setItemToDelete({
                                                  id: reply.$id,
                                                  type: "comment",
                                                });
                                                setShowDeleteModal(true);
                                              }}
                                              className="text-red-500 hover:text-red-700"
                                            >
                                              Xóa
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}

                              {/* Form reply */}
                              {replyTo?.commentId === comment.$id && (
                                <div className="ml-12 mt-2">
                                  <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-full overflow-hidden">
                                      {userData.avatarUrl ? (
                                        <img
                                          src={userData.avatarUrl}
                                          alt={userData.name}
                                          className="w-full h-full object-cover"
                                        />
                                      ) : (
                                        <div className="w-full h-full bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white font-medium">
                                          {userData.name?.[0] || "U"}
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex-1">
                                      <textarea
                                        value={replyComment}
                                        onChange={(e) =>
                                          setReplyComment(e.target.value)
                                        }
                                        className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-50 focus:bg-white border border-transparent focus:border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                                        rows={1}
                                        placeholder="Viết phản hồi..."
                                      />
                                      <div className="text-sm text-blue-600 mt-1">
                                        Đang trả lời @{replyTo.authorName}
                                      </div>
                                      {replyComment.trim() && (
                                        <div className="mt-2 flex justify-end gap-2">
                                          <button
                                            onClick={() => setReplyTo(null)}
                                            className="px-3 py-1 text-gray-600 hover:bg-gray-100 rounded"
                                          >
                                            Hủy
                                          </button>
                                          <button
                                            onClick={() =>
                                              handleReply(post.$id, comment.$id)
                                            }
                                            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                                          >
                                            Phản hồi
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <Dialog
          open={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
        >
          <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Dialog.Panel className="bg-white rounded-lg p-6 max-w-sm">
              <Dialog.Title className="text-lg font-medium mb-4">
                Xác nhận xóa
              </Dialog.Title>
              <p>
                Bạn có chắc chắn muốn xóa{" "}
                {itemToDelete?.type === "post" ? "bài viết" : "bình luận"} này?
              </p>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Hủy
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Xóa
                </button>
              </div>
            </Dialog.Panel>
          </div>
        </Dialog>
      </div>
      <EducationalFooter />
    </>
  );
};

export default Discussion;
