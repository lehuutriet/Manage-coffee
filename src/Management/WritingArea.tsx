import { Plus, Trash2, Video, X } from "lucide-react";
import { useRef, useEffect, useState } from "react";
import { useAuth } from "../contexts/auth/authProvider";
import { ID } from "appwrite";

const WritingArea = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [customWord, setCustomWord] = useState("");
  const [currentWord, setCurrentWord] = useState("");
  const [lastPosition, setLastPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [drawingPoints, setDrawingPoints] = useState<
    { x: number; y: number }[]
  >([]);
  const [strokeIndex, setStrokeIndex] = useState(0);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [isAddVideoModalOpen, setIsAddVideoModalOpen] = useState(false);
  const [videoFormData, setVideoFormData] = useState({
    title: "",
    file: null as File | null,
  });
  const [showDeleteModal, setShowDeleteModal] = useState<{
    show: boolean;
    videoId: string | null;
  }>({
    show: false,
    videoId: null,
  });
  const { databases, storage, account } = useAuth();
  const [userRole, setUserRole] = useState<string>("");
  const DATABASE_ID = "674e5e7a0008e19d0ef0";
  const VIDEOS_COLLECTION = "67808744003393c85e32"; // Tạo collection mới trong database
  const VIDEO_BUCKET = "6780873300361b0c5420"; // Tạo bucket mới trong storage
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const user = await account.get();
        setUserRole(user.labels?.[0] || "");
      } catch (error) {
        console.error("Error getting current user:", error);
      }
    };
    getCurrentUser();
  }, []);
  const isStaffMember = () => {
    return ["Admin", "Teacher"].includes(userRole);
  };
  const handleAddVideo = async () => {
    try {
      if (!videoFormData.file || !videoFormData.title) {
        alert("Vui lòng điền đầy đủ thông tin");
        return;
      }

      // Upload video file
      const uploadedFile = await storage.createFile(
        VIDEO_BUCKET,
        ID.unique(),
        videoFormData.file
      );

      // Lưu thông tin video vào database
      const videoDoc = await databases.createDocument(
        DATABASE_ID,
        VIDEOS_COLLECTION,
        ID.unique(),
        {
          title: videoFormData.title,
          bucketId: VIDEO_BUCKET,
          fileId: uploadedFile.$id,
          uploadedAt: new Date().toISOString(),
        }
      );

      // Cập nhật state videos
      setVideos((prev) => [
        ...prev,
        {
          id: videoDoc.$id,
          title: videoFormData.title,
          url: storage.getFileView(VIDEO_BUCKET, uploadedFile.$id).toString(),
        },
      ]);

      setVideoFormData({ title: "", file: null });
      setIsAddVideoModalOpen(false);
    } catch (error) {
      console.error("Error adding video:", error);
      alert("Có lỗi xảy ra khi thêm video");
    }
  };
  const handleDeleteVideo = async (videoId: string) => {
    setShowDeleteModal({ show: true, videoId });
  };

  const confirmDelete = async () => {
    try {
      if (!showDeleteModal.videoId) return;

      // Tìm video cần xóa
      const videoToDelete = videos.find(
        (v) => v.id === showDeleteModal.videoId
      );
      if (!videoToDelete) return;

      // Lấy thông tin file từ database
      const doc = await databases.getDocument(
        DATABASE_ID,
        VIDEOS_COLLECTION,
        showDeleteModal.videoId
      );

      // Xóa file từ storage bucket
      await storage.deleteFile(doc.bucketId, doc.fileId);

      // Xóa document từ database
      await databases.deleteDocument(
        DATABASE_ID,
        VIDEOS_COLLECTION,
        showDeleteModal.videoId
      );

      // Cập nhật UI
      setVideos(videos.filter((v) => v.id !== showDeleteModal.videoId));
      if (selectedVideo === videoToDelete.url) {
        setSelectedVideo(null);
      }

      setShowDeleteModal({ show: false, videoId: null });
    } catch (error) {
      console.error("Error deleting video:", error);
      alert("Có lỗi xảy ra khi xóa video");
    }
  };
  const fetchVideos = async () => {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        VIDEOS_COLLECTION
      );
      const fetchedVideos = response.documents.map((doc) => ({
        id: doc.$id,
        title: doc.title,
        url: storage.getFileView(doc.bucketId, doc.fileId).toString(),
      }));
      setVideos(fetchedVideos);
    } catch (error) {
      console.error("Error fetching videos:", error);
    }
  };
  useEffect(() => {
    fetchVideos();
  }, []);
  // State quản lý danh sách video
  const [videos, setVideos] = useState<
    Array<{ id: string; title: string; url: string }>
  >([]);
  // Từ mẫu có sẵn
  const sampleWords = [
    "xin chào",
    "học tập",
    "viết chữ",
    "tập viết",
    "bài tập",
    "luyện viết",
  ];

  useEffect(() => {
    setupCanvas();
  }, [currentWord]);

  const setupCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = 800;
    canvas.height = 400;

    drawGrid(ctx);
    drawWritingFrame(ctx);

    if (currentWord) {
      // Vẽ từ mẫu mờ
      ctx.globalAlpha = 0.2;
      ctx.font = "120px Arial";
      ctx.fillStyle = "#000000";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(currentWord, canvas.width / 2, canvas.height / 2);
      ctx.globalAlpha = 1;
    }
  };

  const drawGrid = (ctx: CanvasRenderingContext2D) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    ctx.beginPath();
    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = 1;

    // Vẽ lưới ngang
    for (let i = 0; i < canvas.height; i += 30) {
      ctx.moveTo(0, i);
      ctx.lineTo(canvas.width, i);
    }

    // Vẽ lưới dọc
    for (let i = 0; i < canvas.width; i += 30) {
      ctx.moveTo(i, 0);
      ctx.lineTo(i, canvas.height);
    }

    ctx.stroke();
  };

  const drawWritingFrame = (ctx: CanvasRenderingContext2D) => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    ctx.beginPath();
    ctx.strokeStyle = "#3b82f6";
    ctx.lineWidth = 2;
    ctx.strokeRect(50, 50, canvas.width - 100, canvas.height - 100);

    // Đường gióng giữa
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.strokeStyle = "#93c5fd";
    ctx.moveTo(canvas.width / 2, 50);
    ctx.lineTo(canvas.width / 2, canvas.height - 50);
    ctx.moveTo(50, canvas.height / 2);
    ctx.lineTo(canvas.width - 50, canvas.height / 2);
    ctx.stroke();
    ctx.setLineDash([]);
  };

  const loadRandomWord = () => {
    const randomIndex = Math.floor(Math.random() * sampleWords.length);
    setCurrentWord(sampleWords[randomIndex]);
    setCustomWord(""); // Reset input
    clearCanvas();
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    setLastPosition({ x, y });
    setDrawingPoints([{ x, y }]);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !lastPosition) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    ctx.beginPath();
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.moveTo(lastPosition.x, lastPosition.y);
    ctx.lineTo(x, y);
    ctx.stroke();

    setLastPosition({ x, y });
    setDrawingPoints([...drawingPoints, { x, y }]);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    setLastPosition(null);
    setStrokeIndex((prev) => prev + 1);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGrid(ctx);
    drawWritingFrame(ctx);
    if (currentWord) {
      ctx.globalAlpha = 0.2;
      ctx.font = "120px Arial";
      ctx.fillStyle = "#000000";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(currentWord, canvas.width / 2, canvas.height / 2);
      ctx.globalAlpha = 1;
    }
    setDrawingPoints([]);
    setStrokeIndex(0);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Left sidebar */}
      <div className="w-80 bg-white shadow-lg">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold">Danh sách video</h2>
            {isStaffMember() && (
              <button
                className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                onClick={() => setIsAddVideoModalOpen(true)}
              >
                <Plus className="w-4 h-4" />
                Thêm video
              </button>
            )}
          </div>

          <div className="space-y-2 overflow-y-auto max-h-[calc(100vh-120px)]">
            {videos.map((video) => (
              <div
                key={video.id}
                className={`group p-3 rounded-xl transition-all duration-200 
                ${
                  selectedVideo === video.url
                    ? "bg-blue-50 shadow-sm"
                    : "hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setSelectedVideo(video.url)}
                    className="flex items-center gap-3 flex-1"
                  >
                    <Video
                      className={`w-5 h-5 ${
                        selectedVideo === video.url ? "text-blue-600" : ""
                      }`}
                    />
                    <span
                      className={`font-medium truncate ${
                        selectedVideo === video.url ? "text-blue-600" : ""
                      }`}
                    >
                      {video.title}
                    </span>
                  </button>
                  {isStaffMember() && (
                    <button
                      onClick={() => handleDeleteVideo(video.id)}
                      className="hidden group-hover:flex p-2 text-gray-400 hover:text-red-500 rounded-lg"
                      title="Xóa video"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Center canvas area */}
      <div className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="flex gap-4 mb-6">
              <input
                type="text"
                value={customWord}
                onChange={(e) => setCustomWord(e.target.value)}
                placeholder="Nhập từ bạn muốn luyện viết..."
                className="flex-1 px-6 py-3 border-2 border-gray-200 rounded-xl
                focus:ring-2 focus:ring-blue-500 focus:border-transparent 
                outline-none transition-all duration-200"
              />
              <button
                onClick={() => {
                  if (customWord.trim()) {
                    setCurrentWord(customWord.trim());
                    clearCanvas();
                  }
                }}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 
                text-white rounded-xl hover:from-blue-600 hover:to-blue-700 
                transition-all duration-200 shadow-md"
              >
                Bắt đầu viết
              </button>
              <button
                onClick={loadRandomWord}
                className="px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 
                text-white rounded-xl hover:from-green-600 hover:to-green-700 
                transition-all duration-200 shadow-md"
              >
                Từ ngẫu nhiên
              </button>
            </div>

            {currentWord && (
              <div
                className="flex justify-between items-center mb-6 bg-blue-50 
              rounded-xl p-4 border border-blue-100"
              >
                <h3 className="text-lg">
                  Đang luyện viết:{" "}
                  <span className="text-2xl font-bold text-blue-600">
                    {currentWord}
                  </span>
                </h3>
                <div
                  className="px-4 py-2 bg-blue-100 rounded-lg text-blue-600 
                font-medium"
                >
                  Số nét: {strokeIndex}
                </div>
              </div>
            )}

            <canvas
              ref={canvasRef}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseOut={stopDrawing}
              className="border-2 border-gray-100 rounded-xl shadow-lg bg-white 
              w-full cursor-crosshair transition-all duration-200 hover:shadow-xl"
              style={{ touchAction: "none" }}
            />

            <div className="flex justify-center mt-6">
              <button
                onClick={clearCanvas}
                className="px-8 py-3 bg-gray-100 text-gray-700 rounded-xl 
                hover:bg-gray-200 transition-all duration-200 font-medium"
              >
                Xóa và viết lại
              </button>
            </div>
          </div>

          <div
            className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl 
          p-8 border border-blue-100"
          >
            <h4 className="font-bold text-lg text-blue-800 mb-4">
              Hướng dẫn sử dụng:
            </h4>
            <ul className="text-blue-700 space-y-3">
              <li>• Nhập từ bạn muốn luyện viết vào ô trên</li>
              <li>• Hoặc bấm "Từ ngẫu nhiên" để chọn từ có sẵn</li>
              <li>• Viết theo mẫu mờ trên màn hình</li>
              <li>• Chú ý thứ tự nét và hướng viết của từng chữ</li>
              <li>• Cố gắng viết trong khung cho sẵn</li>
              <li>• Bấm "Xóa và viết lại" nếu muốn thử lại</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Right video area */}
      <div
        className="w-96 bg-white shadow-lg"
        style={{ height: "fit-content" }}
      >
        {selectedVideo ? (
          <div className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-xl text-gray-800">
                Video đang phát
              </h3>
              <button
                onClick={() => setSelectedVideo(null)}
                className="p-2.5 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>
            <video
              src={selectedVideo}
              controls
              autoPlay
              playsInline
              className="w-full aspect-video rounded-xl bg-black shadow-lg"
            />
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center text-gray-400 font-medium">
            Chọn một video để phát
          </div>
        )}
      </div>

      {/* Modal */}
      {isAddVideoModalOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex 
        items-center justify-center z-50"
        >
          <div
            className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl 
          transform transition-all"
          >
            <h3 className="text-2xl font-bold text-gray-800 mb-6">
              Thêm video mới
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Tiêu đề video
                </label>
                <input
                  type="text"
                  value={videoFormData.title}
                  onChange={(e) =>
                    setVideoFormData((prev) => ({
                      ...prev,
                      title: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Nhập tiêu đề video"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  File video
                </label>
                <input
                  type="file"
                  accept="video/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setVideoFormData((prev) => ({ ...prev, file }));
                    }
                  }}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setIsAddVideoModalOpen(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Hủy
              </button>
              <button
                onClick={handleAddVideo}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Thêm video
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal Xóa */}
      {showDeleteModal.show && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl transform transition-all">
            <h3 className="text-2xl font-bold text-gray-800 mb-4">
              Xác nhận xóa
            </h3>
            <p className="text-gray-600 mb-8">
              Bạn có chắc chắn muốn xóa video này? Hành động này không thể hoàn
              tác.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() =>
                  setShowDeleteModal({ show: false, videoId: null })
                }
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Hủy
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WritingArea;
