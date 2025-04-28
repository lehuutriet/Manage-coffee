import { useState, useEffect } from "react";
import { useAuth } from "../contexts/auth/authProvider";
import Navigation from "../Navigation/Navigation";
import { Play, Video, Music, Book } from "lucide-react";
import { useDataCache } from "../contexts/auth/DataCacheProvider";
import EducationalFooter from "../EducationalFooter/EducationalFooter";
import { Query } from "appwrite";

interface UploadedFile {
  $id: string;
  name: string;
  fileId: string;
  bucketId: string;
  type: string;
}

const Story = () => {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<UploadedFile | null>(null);
  const [selectedType, setSelectedType] = useState<string>("Video");
  const [isLoading, setIsLoading] = useState(false);
  const [, setError] = useState<string | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);

  const { databases, storage } = useAuth();
  const DATABASE_ID = "674e5e7a0008e19d0ef0";
  const FILES_COLLECTION_ID = "6757aef2001ea2c6930a";
  const BUCKET_ID = "675fa4df00276e666e01";
  const { getCachedData, setCachedData, isDataCached } = useDataCache();
  const CACHE_KEY = `story-files-${selectedType}`;
  const CACHE_DURATION = 5 * 60 * 1000;

  useEffect(() => {
    const fetchFiles = async () => {
      if (isDataCached(CACHE_KEY)) {
        const cachedFiles = getCachedData(CACHE_KEY);
        setUploadedFiles(cachedFiles);
        return;
      }

      setIsLoading(true);
      try {
        // Thêm query để lọc theo contentType="story"
        const response = await databases.listDocuments(
          DATABASE_ID,
          FILES_COLLECTION_ID,
          [
            Query.equal("contentType", "story"), // Thêm điều kiện này
          ]
        );

        const files = response.documents.map((doc) => ({
          $id: doc.$id,
          name: doc.name,
          fileId: doc.fileId,
          bucketId: doc.bucketId,
          type: doc.type,
        }));

        // Lọc theo định dạng file
        const filteredFiles = files.filter((file) => {
          if (selectedType === "Video") {
            return file.type.startsWith("video/"); // Lọc các file video
          } else {
            return file.type.startsWith("audio/"); // Lọc các file audio
          }
        });

        setCachedData(CACHE_KEY, filteredFiles, CACHE_DURATION);
        setUploadedFiles(filteredFiles);
      } catch (error) {
        console.error("Error fetching files:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFiles();
  }, [selectedType]);

  const handleFileClick = async (file: UploadedFile) => {
    try {
      setSelectedFile(file);
      const fileView = await storage.getFileView(BUCKET_ID, file.fileId);
      setFileUrl(fileView); // Không fetch, set trực tiếp URL
    } catch (error) {
      console.error("Error getting file view:", error);
      setError("Không thể tải file. Vui lòng thử lại sau.");
    }
  };

  // Cleanup blob URLs when component unmounts or file changes
  useEffect(() => {
    return () => {
      if (fileUrl && fileUrl.startsWith("blob:")) {
        URL.revokeObjectURL(fileUrl);
      }
    };
  }, [fileUrl]);

  const formatFileName = (name: string) => {
    // Loại bỏ đuôi file và _HTS
    return name.replace(/\..*$/, "").replace("_HTS", "");
  };
  const renderMediaPlayer = () => {
    if (!fileUrl || !selectedFile) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
        <div className="w-full max-w-4xl p-6">
          <button
            onClick={() => {
              if (fileUrl && fileUrl.startsWith("blob:")) {
                URL.revokeObjectURL(fileUrl);
              }
              setFileUrl(null);
              setSelectedFile(null);
            }}
            className="absolute top-4 right-4 text-white hover:text-gray-300"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>

          {selectedType === "Video" ? (
            <div className="bg-white rounded-lg overflow-hidden">
              <video
                key={fileUrl}
                src={fileUrl}
                className="w-full"
                controls
                autoPlay
                controlsList="nodownload"
                onContextMenu={(e) => e.preventDefault()}
              />
              <div className="p-4 text-center">
                <h2 className="text-xl font-semibold text-gray-900">
                  {formatFileName(selectedFile.name)}
                </h2>
                <p className="text-gray-600 mt-1">
                  Hãy thư giãn và tận hưởng câu chuyện
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg p-8 text-center ">
              <div className="w-24 h-24 mx-auto mb-6 bg-purple-100 rounded-full flex items-center justify-center">
                <Music className="w-12 h-12 text-purple-600" />
              </div>
              <audio
                key={fileUrl}
                src={fileUrl}
                className="w-full mb-4"
                controls
                autoPlay
                controlsList="nodownload"
                onContextMenu={(e) => e.preventDefault()}
              />
              <h2 className="text-2xl font-bold  text-gray-900 mb-2">
                {formatFileName(selectedFile.name)}
              </h2>
              <p className="text-gray-600">
                Hãy thư giãn và tận hưởng câu chuyện
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white">
      <Navigation />

      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Khám phá thế giới qua những câu chuyện
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Hãy để chúng tôi đưa bạn vào thế giới của những câu chuyện thú vị và
            bổ ích
          </p>
        </div>

        <div className="flex justify-center gap-4 mb-12">
          <button
            onClick={() => setSelectedType("Video")}
            className={`flex items-center gap-2 px-6 py-3 rounded-full text-lg font-medium transition-all ${
              selectedType === "Video"
                ? "bg-purple-600 text-white shadow-lg scale-105"
                : "bg-white text-gray-700 hover:bg-gray-50 shadow"
            }`}
          >
            <Video className="w-5 h-5" />
            Video Kể chuyện
          </button>
          <button
            onClick={() => setSelectedType("Mp3")}
            className={`flex items-center gap-2 px-6 py-3 rounded-full text-lg font-medium transition-all ${
              selectedType === "Mp3"
                ? "bg-purple-600 text-white shadow-lg scale-105"
                : "bg-white text-gray-700 hover:bg-gray-50 shadow"
            }`}
          >
            <Music className="w-5 h-5" />
            Audio Kể chuyện
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {uploadedFiles.map((file) => (
              <div
                key={file.$id}
                onClick={() => handleFileClick(file)}
                className="group relative bg-white rounded-xl shadow-lg overflow-hidden cursor-pointer transform hover:scale-105 transition-all duration-300"
              >
                {selectedType === "Video" ? (
                  <div className="aspect-video bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center relative">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-20 h-20 rounded-full bg-white shadow-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Play className="w-10 h-10 text-purple-600" />
                      </div>
                    </div>
                    <div className="absolute inset-0 bg-black bg-opacity-10 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                ) : (
                  <div className="aspect-video bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center relative">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-20 h-20 rounded-full bg-white shadow-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Music className="w-10 h-10 text-purple-600" />
                      </div>
                    </div>
                    <div className="absolute inset-0 bg-black bg-opacity-10 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black to-transparent">
                  <h3 className="font-semibold text-lg text-white mb-2 line-clamp-2">
                    {formatFileName(file.name)}
                  </h3>
                  <p className="text-gray-200 text-sm flex items-center gap-2">
                    <Book className="w-4 h-4" />
                    {selectedType === "Video"
                      ? "Video Học Tập"
                      : "Audio Kể Chuyện"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {uploadedFiles.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <div className="w-20 h-20 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
              {selectedType === "Video" ? (
                <Video className="w-10 h-10 text-gray-400" />
              ) : (
                <Music className="w-10 h-10 text-gray-400" />
              )}
            </div>
            <h3 className="text-xl font-medium text-gray-900 mb-2">
              Chưa có nội dung
            </h3>
            <p className="text-gray-600">
              Hiện chưa có {selectedType === "Video" ? "video" : "audio"} nào
              được tải lên
            </p>
          </div>
        )}
      </div>

      {renderMediaPlayer()}

      <EducationalFooter />
    </div>
  );
};

export default Story;
