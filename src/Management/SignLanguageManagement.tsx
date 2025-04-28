import React, { useState, useEffect } from "react";
import { Upload, Plus, Trash2, Loader2, Play, X, Edit2 } from "lucide-react";
import { useAuth } from "../contexts/auth/authProvider";
import { ID } from "appwrite";
import { toast } from "react-hot-toast";

interface Video {
  id: string;
  title: string;
  subtitle?: string;
  category: string;
  description: string;
  thumbnailId: string;
  imageId?: string;
  duration: string;
  videoId: string; // Video miền Bắc (mặc định)
  videoId_trung?: string; // Video miền Trung
  videoId_nam?: string; // Video miền Nam
}

interface ImagePreviewModalProps {
  imageUrl: string;
  onClose: () => void;
}

const SignLanguageManagement = () => {
  const { storage, databases } = useAuth();
  const [videos, setVideos] = useState<Video[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState("bac"); // Tab Bắc, Trung, Nam
  const DATABASE_ID = "674e5e7a0008e19d0ef0";
  const COLLECTION_ID_SIGNLANGUAGE = "67a1c0f8002253f461fa";
  const BUCKET_ID_SIGNLANGUAGE = "67a1c2fd0025c74b9e3c";
  const [, setError] = useState<string | null>(null);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{
    isOpen: boolean;
    videoId: string | null;
    fileId: string | null;
    thumbnailId: string | null;
  }>({
    isOpen: false,
    videoId: null,
    fileId: null,
    thumbnailId: null,
  });

  const [formData, setFormData] = useState({
    title: "",
    subtitle: "",
    category: "basic",
    description: "",
    videoFile: null as File | null, // Video miền Bắc
    videoFile_trung: null as File | null, // Video miền Trung
    videoFile_nam: null as File | null, // Video miền Nam
    imageFile: null as File | null,
  });

  const resetForm = () => {
    setFormData({
      title: "",
      subtitle: "",
      category: "basic",
      description: "",
      videoFile: null,
      videoFile_trung: null,
      videoFile_nam: null,
      imageFile: null,
    });
    setIsEditing(false);
    setSelectedVideo(null);
    setError(null);
  };

  const categories = [
    { id: "basic", name: "Từ vựng cơ bản" },
    { id: "numbers", name: "Số đếm và đơn vị" },
    { id: "conversation", name: "Hội thoại" },
    { id: "education", name: "Giáo dục" },
  ];

  // Hàm tạo thumbnail từ video
  const generateThumbnail = (videoFile: File): Promise<File> => {
    return new Promise((resolve) => {
      const video = document.createElement("video");
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      // Thêm sự kiện loadedmetadata để đảm bảo video đã load
      video.onloadedmetadata = () => {
        // Đặt kích thước canvas bằng với video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Đặt thời gian video về frame đầu tiên
        video.currentTime = 1; // Lấy frame tại giây thứ 1 để tránh màn đen
      };

      // Sự kiện khi video đã seek tới thời điểm mong muốn
      video.onseeked = () => {
        // Vẽ frame hiện tại lên canvas
        ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Chuyển canvas thành file
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const thumbnailFile = new File([blob], "thumbnail.jpg", {
                type: "image/jpeg",
              });
              resolve(thumbnailFile);
            }
          },
          "image/jpeg",
          0.8
        );
      };

      // Load video từ file
      video.src = URL.createObjectURL(videoFile);
    });
  };

  const getVideoDuration = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        const duration = video.duration;
        const minutes = Math.floor(duration / 60);
        const seconds = Math.floor(duration % 60);
        resolve(`${minutes}:${seconds.toString().padStart(2, "0")}`);
      };
      video.src = URL.createObjectURL(file);
    });
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (!selectedVideo) return;

      // Kiểm tra có ít nhất một video được cung cấp
      if (
        !formData.videoFile &&
        !formData.videoFile_trung &&
        !formData.videoFile_nam &&
        !selectedVideo.videoId &&
        !selectedVideo.videoId_trung &&
        !selectedVideo.videoId_nam
      ) {
        throw new Error("Vui lòng cung cấp ít nhất một video cho một miền");
      }

      const updateData: any = {
        title: formData.title,
        subtitle: formData.subtitle || null,
        category: formData.category,
        description: formData.description,
        updatedAt: new Date().toISOString(),
      };

      // Upload video miền Bắc mới nếu có
      if (formData.videoFile) {
        // Xóa video miền Bắc cũ nếu có
        if (selectedVideo.videoId && selectedVideo.videoId.trim() !== "") {
          try {
            await storage.deleteFile(
              BUCKET_ID_SIGNLANGUAGE,
              selectedVideo.videoId
            );
          } catch (error) {
            console.error("Error deleting old Bac video:", error);
          }
        }

        // Upload video miền Bắc mới
        const videoFile = await storage.createFile(
          BUCKET_ID_SIGNLANGUAGE,
          ID.unique(),
          formData.videoFile
        );
        updateData.videoId = videoFile.$id;

        // Tạo thumbnail mới từ video miền Bắc
        const thumbnailFile = await generateThumbnail(formData.videoFile);
        const uploadedThumbnail = await storage.createFile(
          BUCKET_ID_SIGNLANGUAGE,
          ID.unique(),
          thumbnailFile
        );
        updateData.thumbnailId = uploadedThumbnail.$id;
        updateData.duration = await getVideoDuration(formData.videoFile);
      } else if (
        !selectedVideo.videoId ||
        selectedVideo.videoId.trim() === ""
      ) {
        // Nếu không có video miền Bắc mới và cũng không có video miền Bắc cũ
        updateData.videoId = ""; // Cập nhật rõ ràng thành string rỗng
      }

      // Upload video miền Trung mới nếu có
      if (formData.videoFile_trung) {
        // Xóa video miền Trung cũ nếu có
        if (
          selectedVideo.videoId_trung &&
          selectedVideo.videoId_trung.trim() !== ""
        ) {
          try {
            await storage.deleteFile(
              BUCKET_ID_SIGNLANGUAGE,
              selectedVideo.videoId_trung
            );
          } catch (error) {
            console.error("Error deleting old Trung video:", error);
          }
        }

        // Upload video miền Trung mới
        const trungFile = await storage.createFile(
          BUCKET_ID_SIGNLANGUAGE,
          ID.unique(),
          formData.videoFile_trung
        );
        updateData.videoId_trung = trungFile.$id;

        // Nếu không có thumbnail mới từ video miền Bắc, tạo từ video miền Trung
        if (!updateData.thumbnailId) {
          const thumbnailFile = await generateThumbnail(
            formData.videoFile_trung
          );
          const uploadedThumbnail = await storage.createFile(
            BUCKET_ID_SIGNLANGUAGE,
            ID.unique(),
            thumbnailFile
          );
          updateData.thumbnailId = uploadedThumbnail.$id;
          updateData.duration = await getVideoDuration(
            formData.videoFile_trung
          );
        }
      } else if (
        !selectedVideo.videoId_trung ||
        selectedVideo.videoId_trung.trim() === ""
      ) {
        updateData.videoId_trung = ""; // Cập nhật rõ ràng thành string rỗng
      }

      // Upload video miền Nam mới nếu có
      if (formData.videoFile_nam) {
        // Xóa video miền Nam cũ nếu có
        if (
          selectedVideo.videoId_nam &&
          selectedVideo.videoId_nam.trim() !== ""
        ) {
          try {
            await storage.deleteFile(
              BUCKET_ID_SIGNLANGUAGE,
              selectedVideo.videoId_nam
            );
          } catch (error) {
            console.error("Error deleting old Nam video:", error);
          }
        }

        // Upload video miền Nam mới
        const namFile = await storage.createFile(
          BUCKET_ID_SIGNLANGUAGE,
          ID.unique(),
          formData.videoFile_nam
        );
        updateData.videoId_nam = namFile.$id;

        // Nếu không có thumbnail mới, tạo từ video miền Nam
        if (!updateData.thumbnailId) {
          const thumbnailFile = await generateThumbnail(formData.videoFile_nam);
          const uploadedThumbnail = await storage.createFile(
            BUCKET_ID_SIGNLANGUAGE,
            ID.unique(),
            thumbnailFile
          );
          updateData.thumbnailId = uploadedThumbnail.$id;
          updateData.duration = await getVideoDuration(formData.videoFile_nam);
        }
      } else if (
        !selectedVideo.videoId_nam ||
        selectedVideo.videoId_nam.trim() === ""
      ) {
        updateData.videoId_nam = ""; // Cập nhật rõ ràng thành string rỗng
      }

      // Upload ảnh mới nếu có
      if (formData.imageFile) {
        // Xóa ảnh cũ nếu có
        if (selectedVideo.imageId && selectedVideo.imageId.trim() !== "") {
          try {
            await storage.deleteFile(
              BUCKET_ID_SIGNLANGUAGE,
              selectedVideo.imageId
            );
          } catch (error) {
            console.error("Error deleting old image:", error);
          }
        }
        const uploadedImage = await storage.createFile(
          BUCKET_ID_SIGNLANGUAGE,
          ID.unique(),
          formData.imageFile
        );
        updateData.imageId = uploadedImage.$id;
      }

      // Cập nhật document
      await databases.updateDocument(
        DATABASE_ID,
        COLLECTION_ID_SIGNLANGUAGE,
        selectedVideo.id,
        updateData
      );

      // Cập nhật UI
      setVideos(
        videos.map((v) =>
          v.id === selectedVideo.id ? { ...v, ...updateData } : v
        )
      );

      setIsModalOpen(false);
      setIsEditing(false);
      setSelectedVideo(null);
      resetForm();
      toast.success("Cập nhật video thành công!");
    } catch (error) {
      console.error("Error updating:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Có lỗi xảy ra khi cập nhật video"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const ImagePreviewModal = ({ imageUrl, onClose }: ImagePreviewModalProps) => (
    <div className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center">
      <div className="relative w-[80vw] max-w-[900px]">
        <img
          src={imageUrl}
          alt="Preview"
          className="w-full object-contain rounded-lg"
        />
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 w-10 h-10 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center transition-colors"
        >
          <X className="w-6 h-6 text-white" />
        </button>
      </div>
    </div>
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validate các trường bắt buộc - yêu cầu ít nhất 1 video và title
      if (
        (!formData.videoFile &&
          !formData.videoFile_trung &&
          !formData.videoFile_nam) ||
        !formData.title
      ) {
        throw new Error(
          "Vui lòng điền đầy đủ thông tin và tải lên ít nhất một video"
        );
      }

      // Lưu trữ các ID và thông tin của video
      let videoId = null;
      let videoId_trung = null;
      let videoId_nam = null;
      let thumbnailId = null;
      let duration = "0:00";
      let thumbnailSourceVideo = null;

      // Xác định video nào sẽ dùng làm thumbnail
      if (formData.videoFile) {
        thumbnailSourceVideo = formData.videoFile;
      } else if (formData.videoFile_trung) {
        thumbnailSourceVideo = formData.videoFile_trung;
      } else if (formData.videoFile_nam) {
        thumbnailSourceVideo = formData.videoFile_nam;
      }

      // Tạo và upload thumbnail từ video có sẵn
      if (!thumbnailSourceVideo) {
        throw new Error("No video file available for thumbnail generation");
      }
      const thumbnailFile = await generateThumbnail(thumbnailSourceVideo);
      const uploadedThumbnail = await storage.createFile(
        BUCKET_ID_SIGNLANGUAGE,
        ID.unique(),
        thumbnailFile
      );
      thumbnailId = uploadedThumbnail.$id;

      // Lấy thời lượng video từ video đầu tiên
      duration = await getVideoDuration(thumbnailSourceVideo);

      // Upload video miền Bắc nếu có
      if (formData.videoFile) {
        if (formData.videoFile.size > 100 * 1024 * 1024) {
          throw new Error("Video miền Bắc không được vượt quá 100MB");
        }
        const videoFile = await storage.createFile(
          BUCKET_ID_SIGNLANGUAGE,
          ID.unique(),
          formData.videoFile
        );
        videoId = videoFile.$id;
      }

      // Upload video miền Trung nếu có
      if (formData.videoFile_trung) {
        if (formData.videoFile_trung.size > 100 * 1024 * 1024) {
          throw new Error("Video miền Trung không được vượt quá 100MB");
        }
        const trungFile = await storage.createFile(
          BUCKET_ID_SIGNLANGUAGE,
          ID.unique(),
          formData.videoFile_trung
        );
        videoId_trung = trungFile.$id;
      }

      // Upload video miền Nam nếu có
      if (formData.videoFile_nam) {
        if (formData.videoFile_nam.size > 100 * 1024 * 1024) {
          throw new Error("Video miền Nam không được vượt quá 100MB");
        }
        const namFile = await storage.createFile(
          BUCKET_ID_SIGNLANGUAGE,
          ID.unique(),
          formData.videoFile_nam
        );
        videoId_nam = namFile.$id;
      }

      // Upload ảnh phụ nếu có
      let imageId = undefined;
      if (formData.imageFile) {
        if (formData.imageFile.size > 5 * 1024 * 1024) {
          throw new Error("Ảnh không được vượt quá 5MB");
        }
        const uploadedImage = await storage.createFile(
          BUCKET_ID_SIGNLANGUAGE,
          ID.unique(),
          formData.imageFile
        );
        imageId = uploadedImage.$id;
      }

      // Tạo document trong database
      const document = await databases.createDocument(
        DATABASE_ID,
        COLLECTION_ID_SIGNLANGUAGE,
        ID.unique(),
        {
          title: formData.title,
          subtitle: formData.subtitle || null,
          category: formData.category,
          description: formData.description,
          thumbnailId: thumbnailId,
          imageId: imageId,
          videoId: videoId || "",
          videoId_trung: videoId_trung || "",
          videoId_nam: videoId_nam || "",
          duration: duration,
          viewCount: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      );

      // Tạo object video mới để cập nhật UI
      const newVideo: Video = {
        id: document.$id,
        title: document.title,
        subtitle: document.subtitle,
        category: document.category,
        description: document.description,
        thumbnailId: thumbnailId,
        imageId: imageId,
        duration: duration,
        videoId: videoId || "", // Đảm bảo không bao giờ là null
        videoId_trung: videoId_trung || "",
        videoId_nam: videoId_nam || "",
      };

      // Cập nhật state videos
      setVideos((prevVideos) => [...prevVideos, newVideo]);

      // Reset form và đóng modal
      resetForm();
      setIsModalOpen(false);
      toast.success("Thêm video thành công!");

      // Xử lý cleanup
      if (formData.videoFile) {
        URL.revokeObjectURL(URL.createObjectURL(formData.videoFile));
      }
      if (formData.videoFile_trung) {
        URL.revokeObjectURL(URL.createObjectURL(formData.videoFile_trung));
      }
      if (formData.videoFile_nam) {
        URL.revokeObjectURL(URL.createObjectURL(formData.videoFile_nam));
      }
      if (formData.imageFile) {
        URL.revokeObjectURL(URL.createObjectURL(formData.imageFile));
      }
    } catch (error) {
      console.error("Error uploading:", error);

      // Xử lý các loại lỗi cụ thể
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Có lỗi xảy ra khi thêm video");
      }

      // Cleanup trong trường hợp lỗi
      try {
        // Xóa các file đã upload nếu có lỗi xảy ra
        if (formData.videoFile) {
          URL.revokeObjectURL(URL.createObjectURL(formData.videoFile));
        }
        if (formData.videoFile_trung) {
          URL.revokeObjectURL(URL.createObjectURL(formData.videoFile_trung));
        }
        if (formData.videoFile_nam) {
          URL.revokeObjectURL(URL.createObjectURL(formData.videoFile_nam));
        }
        if (formData.imageFile) {
          URL.revokeObjectURL(URL.createObjectURL(formData.imageFile));
        }
      } catch (cleanupError) {
        console.error("Error during cleanup:", cleanupError);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = (
    videoId: string,
    fileId: string,
    thumbnailId: string
  ) => {
    setDeleteConfirmModal({
      isOpen: true,
      videoId,
      fileId,
      thumbnailId,
    });
  };

  const confirmDelete = async () => {
    if (!deleteConfirmModal.videoId || !deleteConfirmModal.thumbnailId) return;

    setIsDeleting(true);
    try {
      // Lấy thông tin video để xóa các file liên quan
      const video = videos.find((v) => v.id === deleteConfirmModal.videoId);

      if (!video) {
        throw new Error("Không tìm thấy video để xóa");
      }

      // Xóa video miền Bắc nếu có
      if (video.videoId && video.videoId.trim() !== "") {
        try {
          await storage.deleteFile(BUCKET_ID_SIGNLANGUAGE, video.videoId);
        } catch (error) {
          console.error("Error deleting Bac video:", error);
        }
      }

      // Xóa thumbnail
      try {
        await storage.deleteFile(BUCKET_ID_SIGNLANGUAGE, video.thumbnailId);
      } catch (error) {
        console.error("Error deleting thumbnail:", error);
      }

      // Xóa video miền Trung nếu có
      if (video.videoId_trung && video.videoId_trung.trim() !== "") {
        try {
          await storage.deleteFile(BUCKET_ID_SIGNLANGUAGE, video.videoId_trung);
        } catch (error) {
          console.error("Error deleting Trung video:", error);
        }
      }

      // Xóa video miền Nam nếu có
      if (video.videoId_nam && video.videoId_nam.trim() !== "") {
        try {
          await storage.deleteFile(BUCKET_ID_SIGNLANGUAGE, video.videoId_nam);
        } catch (error) {
          console.error("Error deleting Nam video:", error);
        }
      }

      // Xóa ảnh phụ nếu có
      if (video.imageId && video.imageId.trim() !== "") {
        try {
          await storage.deleteFile(BUCKET_ID_SIGNLANGUAGE, video.imageId);
        } catch (error) {
          console.error("Error deleting image:", error);
        }
      }

      // Xóa document
      await databases.deleteDocument(
        DATABASE_ID,
        COLLECTION_ID_SIGNLANGUAGE,
        deleteConfirmModal.videoId
      );

      setVideos(
        videos.filter((video) => video.id !== deleteConfirmModal.videoId)
      );
      toast.success("Xóa video thành công!");
    } catch (error) {
      console.error("Error deleting:", error);
      toast.error("Có lỗi xảy ra khi xóa video");
    } finally {
      setIsDeleting(false);
      setDeleteConfirmModal({
        isOpen: false,
        videoId: null,
        fileId: null,
        thumbnailId: null,
      });
    }
  };

  const handleVideoClick = (video: Video) => {
    setSelectedVideo(video);

    // Xác định tab mặc định dựa trên video có sẵn
    if (video.videoId && video.videoId.trim() !== "") {
      setActiveTab("bac");
    } else if (video.videoId_trung && video.videoId_trung.trim() !== "") {
      setActiveTab("trung");
    } else if (video.videoId_nam && video.videoId_nam.trim() !== "") {
      setActiveTab("nam");
    }

    setShowVideoModal(true);
  };

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const response = await databases.listDocuments(
          DATABASE_ID,
          COLLECTION_ID_SIGNLANGUAGE
        );

        const fetchedVideos: Video[] = response.documents.map((doc) => ({
          id: doc.$id,
          title: doc.title,
          subtitle: doc.subtitle || "",
          category: doc.category,
          description: doc.description || "",
          thumbnailId: doc.thumbnailId || "",
          videoId: doc.videoId || "",
          videoId_trung: doc.videoId_trung || "",
          videoId_nam: doc.videoId_nam || "",
          duration: doc.duration || "0:00",
          imageId: doc.imageId || "",
        }));

        setVideos(fetchedVideos);
      } catch (error) {
        console.error("Error fetching videos:", error);
        toast.error("Không thể tải danh sách video");
      }
    };
    fetchVideos();
  }, []);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-semibold">
            Quản lý video ngôn ngữ ký hiệu
          </h2>
          <p className="text-gray-600">
            Thêm và quản lý các video bài giảng ngôn ngữ ký hiệu
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Thêm video mới
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {videos.map((video) => (
          <div
            key={video.id}
            className="bg-white rounded-lg shadow border border-gray-200"
          >
            <div
              className="relative aspect-video cursor-pointer group"
              onClick={() => handleVideoClick(video)}
            >
              <img
                src={storage
                  .getFilePreview(BUCKET_ID_SIGNLANGUAGE, video.thumbnailId)
                  .toString()}
                alt={video.title}
                className="w-full h-full object-cover rounded-t-lg"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="w-16 h-16 flex items-center justify-center rounded-full bg-white/25">
                  <Play className="w-8 h-8 text-white" />
                </div>
              </div>
              <div className="absolute bottom-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-sm">
                {video.duration}
              </div>
              {/* Badge cho các video theo miền */}
              <div className="absolute top-2 left-2 flex gap-1">
                {video.videoId && video.videoId.trim() !== "" && (
                  <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded">
                    Bắc
                  </span>
                )}
                {video.videoId_trung && video.videoId_trung.trim() !== "" && (
                  <span className="bg-green-500 text-white text-xs px-2 py-1 rounded">
                    Trung
                  </span>
                )}
                {video.videoId_nam && video.videoId_nam.trim() !== "" && (
                  <span className="bg-yellow-500 text-white text-xs px-2 py-1 rounded">
                    Nam
                  </span>
                )}
              </div>
            </div>

            <div className="p-4">
              <h3 className="font-medium mb-2">{video.title}</h3>
              <span className="inline-block px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                {categories.find((cat) => cat.id === video.category)?.name ||
                  video.category}
              </span>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setFormData({
                      title: video.title,
                      subtitle: video.subtitle || "",
                      category: video.category,
                      description: video.description,
                      videoFile: null,
                      videoFile_trung: null,
                      videoFile_nam: null,
                      imageFile: null,
                    });
                    setIsEditing(true);
                    setIsModalOpen(true);
                    setSelectedVideo(video);
                  }}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(video.id, video.videoId, video.thumbnailId);
                  }}
                  disabled={isDeleting}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                >
                  {isDeleting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Video Modal với tab Bắc-Trung-Nam */}
      {showVideoModal && selectedVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => {
              setShowVideoModal(false);
              setSelectedVideo(null);
            }}
          />

          {/* Modal Container */}
          <div className="relative w-full max-w-4xl h-[90vh] overflow-auto bg-white dark:bg-gray-900 rounded-2xl shadow-2xl transform transition-all">
            {/* Header */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {selectedVideo.title}
              </h1>
            </div>

            {/* Tabs Bắc - Trung - Nam */}
            <div className="flex border-b border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setActiveTab("bac")}
                className={`flex-1 py-4 font-medium text-center transition-colors ${
                  activeTab === "bac"
                    ? "border-b-2 border-blue-600 text-blue-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Miền Bắc
              </button>
              <button
                onClick={() => setActiveTab("trung")}
                className={`flex-1 py-4 font-medium text-center transition-colors ${
                  activeTab === "trung"
                    ? "border-b-2 border-green-600 text-green-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Miền Trung
              </button>
              <button
                onClick={() => setActiveTab("nam")}
                className={`flex-1 py-4 font-medium text-center transition-colors ${
                  activeTab === "nam"
                    ? "border-b-2 border-yellow-600 text-yellow-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Miền Nam
              </button>
            </div>

            {/* Subtitle và Image Section */}
            <div className="flex flex-col md:flex-row p-6 gap-6">
              <div className="w-full md:w-2/3 md:pr-6 flex items-center">
                {selectedVideo.subtitle && (
                  <h2 className="text-xl font-semibold text-gray-800">
                    {selectedVideo.subtitle}
                  </h2>
                )}
              </div>

              {selectedVideo.imageId && (
                <div className="w-full md:w-1/3">
                  <div
                    className="relative group rounded-xl overflow-hidden cursor-zoom-in"
                    onClick={() => setShowImagePreview(true)}
                  >
                    <img
                      src={storage
                        .getFilePreview(
                          BUCKET_ID_SIGNLANGUAGE,
                          selectedVideo.imageId
                        )
                        .toString()}
                      alt="Supplementary"
                      className="w-full h-40 object-cover transition-transform group-hover:scale-105"
                      onError={(e) => {
                        console.error("Error loading image");
                        e.currentTarget.style.display = "none";
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center">
                      <span className="text-white font-medium px-4 py-2 rounded-lg bg-black/30 backdrop-blur-sm">
                        Xem chi tiết
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Video Player dựa trên tab đang chọn */}
            <div className="px-6 pb-6">
              <div className="aspect-video rounded-xl overflow-hidden bg-black/95 shadow-lg">
                {activeTab === "bac" &&
                  (selectedVideo.videoId &&
                  selectedVideo.videoId.trim() !== "" ? (
                    <video
                      key={`bac-${selectedVideo.videoId}`}
                      src={storage
                        .getFileView(
                          BUCKET_ID_SIGNLANGUAGE,
                          selectedVideo.videoId
                        )
                        .toString()}
                      controls
                      autoPlay
                      className="w-full h-full"
                      playsInline
                      onError={(e) => {
                        console.error("Error loading video for Miền Bắc:", e);
                        e.currentTarget.style.display = "none";
                        document
                          .getElementById("error-bac")
                          ?.classList.remove("hidden");
                      }}
                    >
                      Trình duyệt của bạn không hỗ trợ video.
                    </video>
                  ) : (
                    <div
                      id="error-bac"
                      className="h-full flex flex-col items-center justify-center bg-gray-100 text-gray-500 p-8"
                    >
                      <p className="text-xl font-medium mb-2">
                        Chưa có video cho miền Bắc
                      </p>
                      <p>
                        Video ngôn ngữ ký hiệu cho miền Bắc đang được cập nhật
                      </p>
                    </div>
                  ))}

                {activeTab === "trung" &&
                  (selectedVideo.videoId_trung &&
                  selectedVideo.videoId_trung.trim() !== "" ? (
                    <video
                      key={`trung-${selectedVideo.videoId_trung}`}
                      src={storage
                        .getFileView(
                          BUCKET_ID_SIGNLANGUAGE,
                          selectedVideo.videoId_trung
                        )
                        .toString()}
                      controls
                      autoPlay
                      className="w-full h-full"
                      playsInline
                      onError={(e) => {
                        console.error("Error loading video for Miền Trung:", e);
                        e.currentTarget.style.display = "none";
                        document
                          .getElementById("error-trung")
                          ?.classList.remove("hidden");
                      }}
                    >
                      Trình duyệt của bạn không hỗ trợ video.
                    </video>
                  ) : (
                    <div
                      id="error-trung"
                      className="h-full flex flex-col items-center justify-center bg-gray-100 text-gray-500 p-8"
                    >
                      <p className="text-xl font-medium mb-2">
                        Chưa có video cho miền Trung
                      </p>
                      <p>
                        Video ngôn ngữ ký hiệu cho miền Trung đang được cập nhật
                      </p>
                    </div>
                  ))}

                {activeTab === "nam" &&
                  (selectedVideo.videoId_nam &&
                  selectedVideo.videoId_nam.trim() !== "" ? (
                    <video
                      key={`nam-${selectedVideo.videoId_nam}`}
                      src={storage
                        .getFileView(
                          BUCKET_ID_SIGNLANGUAGE,
                          selectedVideo.videoId_nam
                        )
                        .toString()}
                      controls
                      autoPlay
                      className="w-full h-full"
                      playsInline
                      onError={(e) => {
                        console.error("Error loading video for Miền Nam:", e);
                        e.currentTarget.style.display = "none";
                        document
                          .getElementById("error-nam")
                          ?.classList.remove("hidden");
                      }}
                    >
                      Trình duyệt của bạn không hỗ trợ video.
                    </video>
                  ) : (
                    <div
                      id="error-nam"
                      className="h-full flex flex-col items-center justify-center bg-gray-100 text-gray-500 p-8"
                    >
                      <p className="text-xl font-medium mb-2">
                        Chưa có video cho miền Nam
                      </p>
                      <p>
                        Video ngôn ngữ ký hiệu cho miền Nam đang được cập nhật
                      </p>
                    </div>
                  ))}
              </div>
            </div>

            {/* Mô tả video nếu có */}
            {selectedVideo.description && (
              <div className="px-6 pb-6">
                <h3 className="font-medium text-gray-800 mb-2">Mô tả:</h3>
                <p className="text-gray-600">{selectedVideo.description}</p>
              </div>
            )}

            {/* Footer */}
            <div className="p-6 bg-gray-50 dark:bg-gray-800/50">
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setShowVideoModal(false);
                    setSelectedVideo(null);
                  }}
                  className="px-6 py-2.5 bg-gray-900 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-800 dark:hover:bg-gray-600 transition-colors duration-200 font-medium"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-xl p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold mb-4">
              {isEditing ? "Chỉnh sửa video" : "Thêm video mới"}
            </h3>
            <form
              onSubmit={isEditing ? handleEdit : handleSubmit}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tiêu đề
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tiêu đề phụ (không bắt buộc)
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  value={formData.subtitle}
                  onChange={(e) =>
                    setFormData({ ...formData, subtitle: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mô tả (không bắt buộc)
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  rows={3}
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Danh mục
                </label>
                <select
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value })
                  }
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ảnh phụ (không bắt buộc)
                </label>
                {/* Hiển thị ảnh hiện tại nếu đang chỉnh sửa và có ảnh */}
                {isEditing && selectedVideo?.imageId && !formData.imageFile && (
                  <div className="mb-2">
                    <img
                      src={storage
                        .getFilePreview(
                          BUCKET_ID_SIGNLANGUAGE,
                          selectedVideo.imageId
                        )
                        .toString()}
                      alt="Current supplementary"
                      className="w-32 h-32 object-cover rounded-lg"
                    />
                    <p className="text-sm text-gray-500 mt-1">Ảnh hiện tại</p>
                  </div>
                )}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setFormData({ ...formData, imageFile: file });
                      }
                    }}
                    className="hidden"
                    id="image-upload"
                  />
                  <label htmlFor="image-upload" className="cursor-pointer">
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">
                      {formData.imageFile
                        ? formData.imageFile.name
                        : "Kéo thả ảnh hoặc click để chọn file"}
                    </p>
                  </label>
                </div>
              </div>

              {/* Video miền Bắc */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Video miền Bắc (không bắt buộc)
                </label>

                {/* Hiển thị video hiện tại nếu đang ở chế độ edit */}
                {isEditing &&
                  selectedVideo &&
                  selectedVideo.videoId &&
                  selectedVideo.videoId.trim() !== "" &&
                  !formData.videoFile && (
                    <div className="mb-4">
                      <video
                        src={storage
                          .getFileView(
                            BUCKET_ID_SIGNLANGUAGE,
                            selectedVideo.videoId
                          )
                          .toString()}
                        controls
                        className="w-full h-48 object-cover rounded-lg"
                      >
                        Trình duyệt không hỗ trợ video
                      </video>
                      <p className="text-sm text-gray-500 mt-1">
                        Video miền Bắc hiện tại
                      </p>
                    </div>
                  )}

                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                  <input
                    type="file"
                    accept="video/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setFormData({ ...formData, videoFile: file });
                      }
                    }}
                    className="hidden"
                    id="video-upload-bac"
                  />
                  <label htmlFor="video-upload-bac" className="cursor-pointer">
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">
                      {formData.videoFile
                        ? formData.videoFile.name
                        : isEditing
                        ? "Chọn video mới cho miền Bắc (không bắt buộc)"
                        : "Kéo thả video miền Bắc hoặc click để chọn file"}
                    </p>
                  </label>
                </div>
              </div>

              {/* Video miền Trung */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Video miền Trung (không bắt buộc)
                </label>

                {/* Hiển thị video hiện tại nếu đang ở chế độ edit */}
                {isEditing &&
                  selectedVideo?.videoId_trung &&
                  selectedVideo.videoId_trung.trim() !== "" &&
                  !formData.videoFile_trung && (
                    <div className="mb-4">
                      <video
                        src={storage
                          .getFileView(
                            BUCKET_ID_SIGNLANGUAGE,
                            selectedVideo.videoId_trung
                          )
                          .toString()}
                        controls
                        className="w-full h-48 object-cover rounded-lg"
                      >
                        Trình duyệt không hỗ trợ video
                      </video>
                      <p className="text-sm text-gray-500 mt-1">
                        Video miền Trung hiện tại
                      </p>
                    </div>
                  )}

                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                  <input
                    type="file"
                    accept="video/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setFormData({ ...formData, videoFile_trung: file });
                      }
                    }}
                    className="hidden"
                    id="video-upload-trung"
                  />
                  <label
                    htmlFor="video-upload-trung"
                    className="cursor-pointer"
                  >
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">
                      {formData.videoFile_trung
                        ? formData.videoFile_trung.name
                        : "Kéo thả video miền Trung hoặc click để chọn file"}
                    </p>
                  </label>
                </div>
              </div>

              {/* Video miền Nam */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Video miền Nam (không bắt buộc)
                </label>

                {/* Hiển thị video hiện tại nếu đang ở chế độ edit */}
                {isEditing &&
                  selectedVideo?.videoId_nam &&
                  selectedVideo.videoId_nam.trim() !== "" &&
                  !formData.videoFile_nam && (
                    <div className="mb-4">
                      <video
                        src={storage
                          .getFileView(
                            BUCKET_ID_SIGNLANGUAGE,
                            selectedVideo.videoId_nam
                          )
                          .toString()}
                        controls
                        className="w-full h-48 object-cover rounded-lg"
                      >
                        Trình duyệt không hỗ trợ video
                      </video>
                      <p className="text-sm text-gray-500 mt-1">
                        Video miền Nam hiện tại
                      </p>
                    </div>
                  )}

                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                  <input
                    type="file"
                    accept="video/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setFormData({ ...formData, videoFile_nam: file });
                      }
                    }}
                    className="hidden"
                    id="video-upload-nam"
                  />
                  <label htmlFor="video-upload-nam" className="cursor-pointer">
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">
                      {formData.videoFile_nam
                        ? formData.videoFile_nam.name
                        : "Kéo thả video miền Nam hoặc click để chọn file"}
                    </p>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setIsEditing(false);
                    setSelectedVideo(null);
                    resetForm();
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                  disabled={isLoading}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Đang xử lý...
                    </>
                  ) : isEditing ? (
                    "Cập nhật"
                  ) : (
                    "Thêm mới"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h3 className="text-xl font-semibold mb-4">Xác nhận xóa</h3>
            <p className="text-gray-600 mb-6">
              Bạn có chắc chắn muốn xóa video này? Hành động này không thể hoàn
              tác.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() =>
                  setDeleteConfirmModal({
                    isOpen: false,
                    videoId: null,
                    fileId: null,
                    thumbnailId: null,
                  })
                }
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                disabled={isDeleting}
              >
                Hủy
              </button>
              <button
                onClick={confirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Đang xóa...
                  </>
                ) : (
                  "Xóa"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {showImagePreview && selectedVideo?.imageId && (
        <ImagePreviewModal
          imageUrl={storage
            .getFilePreview(BUCKET_ID_SIGNLANGUAGE, selectedVideo.imageId)
            .toString()}
          onClose={() => setShowImagePreview(false)}
        />
      )}
    </div>
  );
};

export default SignLanguageManagement;
