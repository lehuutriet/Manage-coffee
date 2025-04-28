import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "../contexts/auth/authProvider";
import { Query, Models } from "appwrite";

interface AudioFile extends Models.Document {
  name: string;
  bucketId: string;
  fileId: string;
  description?: string;
  soundType: "consonant" | "vowel";
}

const PronunciationLesson = () => {
  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(
    null
  );
  const [playingId, setPlayingId] = useState<string | null>(null);
  const { storage, databases } = useAuth();

  const DATABASE_ID = "674e5e7a0008e19d0ef0";
  const FILES_COLLECTION_ID = "6757aef2001ea2c6930a";

  useEffect(() => {
    fetchAudioFiles();
    return () => {
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
      }
    };
  }, []);

  const fetchAudioFiles = async () => {
    try {
      setLoading(true);
      const response = await databases.listDocuments<AudioFile>(
        DATABASE_ID,
        FILES_COLLECTION_ID,
        [Query.equal("contentType", ["reading"]), Query.orderDesc("$createdAt")]
      );

      setAudioFiles(response.documents);
    } catch (error) {
      console.error("Lỗi khi tải file âm thanh:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatFileName = (name: string) => {
    return name
      .replace(/\.[^/.]+$/, "")
      .replace(/\[hanhtrangso\.nxbgd\.vn\]\s*/g, "")
      .replace(/_HTS$/g, "")
      .replace(/_/g, " ")
      .trim();
  };

  const handlePlay = async (file: AudioFile) => {
    try {
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        setPlayingId(null);
      }

      setPlayingId(file.$id);
      const fileUrl = storage.getFileView(file.bucketId, file.fileId);
      const audio = new Audio(fileUrl);

      audio.onended = () => {
        setPlayingId(null);
        setCurrentAudio(null);
      };

      setCurrentAudio(audio);
      await audio.play();
    } catch (error) {
      console.error("Lỗi khi phát âm thanh:", error);
      setPlayingId(null);
      setCurrentAudio(null);
    }
  };
  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Tách audio files thành 2 mảng riêng
  const vowelFiles = audioFiles.filter((file) => file.soundType === "vowel");
  const consonantFiles = audioFiles.filter(
    (file) => file.soundType === "consonant"
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Header Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Khám Phá Âm Thanh Tiếng Việt
          </h1>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Tập nghe và học phát âm các âm trong tiếng Việt một cách dễ dàng và
            hiệu quả
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="space-y-16">
            {/* Nguyên âm Section */}
            <section>
              <div className="flex items-center justify-center gap-4 mb-8">
                <div className="h-px bg-gray-200 flex-1" />
                <h2 className="text-2xl font-bold text-gray-800 px-4">
                  Nguyên âm
                </h2>
                <div className="h-px bg-gray-200 flex-1" />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {vowelFiles.map((file) => (
                  <button
                    key={file.$id}
                    onClick={() => handlePlay(file)}
                    className={`relative group p-6 rounded-2xl transition-all duration-300
                      ${
                        playingId === file.$id
                          ? "bg-blue-50 ring-2 ring-blue-500 shadow-lg"
                          : "bg-white hover:bg-blue-50 shadow-sm hover:shadow-md border border-gray-100"
                      }`}
                  >
                    <div className="flex flex-col items-center">
                      <span className="text-3xl font-medium mb-3 text-gray-800">
                        {formatFileName(file.name).split(" ").pop() || ""}
                      </span>

                      {/* Playing Animation */}
                      {playingId === file.$id ? (
                        <div className="flex space-x-1 mt-2">
                          <div className="w-1.5 h-4 bg-blue-500 rounded-full animate-pulse" />
                          <div className="w-1.5 h-4 bg-blue-500 rounded-full animate-pulse delay-75" />
                          <div className="w-1.5 h-4 bg-blue-500 rounded-full animate-pulse delay-150" />
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-blue-100 group-hover:bg-blue-200 transition-colors" />
                      )}

                      {file.description && (
                        <p className="text-sm text-gray-500 mt-3">
                          {file.description}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </section>

            {/* Phụ âm Section */}
            <section>
              <div className="flex items-center justify-center gap-4 mb-8">
                <div className="h-px bg-gray-200 flex-1" />
                <h2 className="text-2xl font-bold text-gray-800 px-4">
                  Phụ âm
                </h2>
                <div className="h-px bg-gray-200 flex-1" />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {consonantFiles.map((file) => (
                  <button
                    key={file.$id}
                    onClick={() => handlePlay(file)}
                    className={`relative group p-6 rounded-2xl transition-all duration-300
                      ${
                        playingId === file.$id
                          ? "bg-blue-50 ring-2 ring-blue-500 shadow-lg"
                          : "bg-white hover:bg-blue-50 shadow-sm hover:shadow-md border border-gray-100"
                      }`}
                  >
                    <div className="flex flex-col items-center">
                      <span className="text-3xl font-medium mb-3 text-gray-800">
                        {formatFileName(file.name).split(" ").pop() || ""}
                      </span>

                      {/* Playing Animation */}
                      {playingId === file.$id ? (
                        <div className="flex space-x-1 mt-2">
                          <div className="w-1.5 h-4 bg-blue-500 rounded-full animate-pulse" />
                          <div className="w-1.5 h-4 bg-blue-500 rounded-full animate-pulse delay-75" />
                          <div className="w-1.5 h-4 bg-blue-500 rounded-full animate-pulse delay-150" />
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-blue-100 group-hover:bg-blue-200 transition-colors" />
                      )}

                      {file.description && (
                        <p className="text-sm text-gray-500 mt-3">
                          {file.description}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </section>

            {audioFiles.length === 0 && (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <p className="text-gray-500">Chưa có file âm thanh nào</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PronunciationLesson;
