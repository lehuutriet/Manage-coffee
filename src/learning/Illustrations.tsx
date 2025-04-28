import { useState, useEffect } from "react";
import {
  Search,
  Filter,
  Bookmark,
  BookmarkCheck,
  X,
  Heart,
  Trash2,
} from "lucide-react";
import { useAuth } from "../contexts/auth/authProvider";
import { Query, ID } from "appwrite";

interface Illustration {
  $id: string;
  title: string;
  category: string;
  description: string;
  keywords: string[];
  imageId: string;
  bucketId: string;
  difficulty: "beginner" | "intermediate" | "advanced";
}

// interface FavoriteItem {
//   $id: string;
//   userId: string;
//   itemId: string;
//   type: string;
//   createdAt: string;
// }

const Illustrations = () => {
  const [illustrations, setIllustrations] = useState<Illustration[]>([]);
  const [filteredIllustrations, setFilteredIllustrations] = useState<
    Illustration[]
  >([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Tất cả");
  const [selectedDifficulty, setSelectedDifficulty] = useState("Tất cả");
  const [loading, setLoading] = useState(true);
  const [favoriteItems, setFavoriteItems] = useState<string[]>([]);
  const [isFavoritesModalOpen, setIsFavoritesModalOpen] = useState(false);
  const [favoriteIllustrations, setFavoriteIllustrations] = useState<
    Illustration[]
  >([]);
  const { databases, storage, account } = useAuth();

  const DATABASE_ID = "674e5e7a0008e19d0ef0";
  const ILLUSTRATIONS_COLLECTION_ID = "ILLUSTRATIONS"; // Collection cho hình ảnh
  const FAVORITES_COLLECTION_ID = "favorites"; // Collection riêng cho yêu thích

  useEffect(() => {
    fetchIllustrations();
    fetchFavorites();
  }, []);

  useEffect(() => {
    filterIllustrations();
  }, [searchQuery, selectedCategory, selectedDifficulty, illustrations]);

  const fetchIllustrations = async () => {
    try {
      setLoading(true);
      const response = await databases.listDocuments(
        DATABASE_ID,
        ILLUSTRATIONS_COLLECTION_ID
      );
      setIllustrations(response.documents as unknown as Illustration[]);
      setFilteredIllustrations(response.documents as unknown as Illustration[]);
    } catch (error) {
      console.error("Lỗi khi tải hình ảnh minh họa:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFavorites = async () => {
    try {
      const user = await account.get();
      const response = await databases.listDocuments(
        DATABASE_ID,
        FAVORITES_COLLECTION_ID,
        [
          Query.equal("userId", [user.$id]),
          Query.equal("type", ["illustration"]),
        ]
      );

      const favoriteIds = response.documents.map((doc) => doc.itemId);
      setFavoriteItems(favoriteIds);
    } catch (error) {
      console.error("Lỗi khi tải danh sách yêu thích:", error);
    }
  };

  const loadFavoriteIllustrations = async () => {
    if (favoriteItems.length === 0) {
      setFavoriteIllustrations([]);
      return;
    }

    try {
      // Tìm tất cả các hình ảnh có ID nằm trong danh sách yêu thích
      const favoriteIllusts = illustrations.filter((illust) =>
        favoriteItems.includes(illust.$id)
      );

      setFavoriteIllustrations(favoriteIllusts);
    } catch (error) {
      console.error("Lỗi khi tải hình ảnh yêu thích:", error);
    }
  };

  // Gọi hàm này khi mở modal
  const openFavoritesModal = () => {
    loadFavoriteIllustrations();
    setIsFavoritesModalOpen(true);
  };

  const filterIllustrations = () => {
    let filtered = [...illustrations];

    // Lọc theo từ khóa tìm kiếm
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (item) =>
          item.title.toLowerCase().includes(query) ||
          item.description.toLowerCase().includes(query) ||
          (item.keywords &&
            item.keywords.some((keyword) =>
              keyword.toLowerCase().includes(query)
            ))
      );
    }

    // Lọc theo danh mục
    if (selectedCategory !== "Tất cả") {
      filtered = filtered.filter((item) => item.category === selectedCategory);
    }

    // Lọc theo cấp độ
    if (selectedDifficulty !== "Tất cả") {
      const difficultyMap: { [key: string]: string } = {
        "Cơ bản": "beginner",
        "Trung cấp": "intermediate",
        "Nâng cao": "advanced",
      };
      filtered = filtered.filter(
        (item) => item.difficulty === difficultyMap[selectedDifficulty]
      );
    }

    setFilteredIllustrations(filtered);
  };

  const toggleFavorite = async (illustrationId: string) => {
    try {
      const user = await account.get();
      const isFavorite = favoriteItems.includes(illustrationId);

      if (isFavorite) {
        // Xóa khỏi danh sách yêu thích
        const favorites = await databases.listDocuments(
          DATABASE_ID,
          FAVORITES_COLLECTION_ID,
          [
            Query.equal("userId", [user.$id]),
            Query.equal("itemId", [illustrationId]),
            Query.equal("type", ["illustration"]),
          ]
        );

        if (favorites.documents.length > 0) {
          await databases.deleteDocument(
            DATABASE_ID,
            FAVORITES_COLLECTION_ID,
            favorites.documents[0].$id
          );
        }

        // Cập nhật favoriteItems state
        setFavoriteItems(favoriteItems.filter((id) => id !== illustrationId));

        // Cập nhật trực tiếp danh sách hiển thị trong modal
        setFavoriteIllustrations(
          favoriteIllustrations.filter(
            (illust) => illust.$id !== illustrationId
          )
        );
      } else {
        // Thêm vào danh sách yêu thích
        await databases.createDocument(
          DATABASE_ID,
          FAVORITES_COLLECTION_ID,
          ID.unique(),
          {
            userId: user.$id,
            itemId: illustrationId,
            type: "illustration",
            createdAt: new Date().toISOString(),
          }
        );

        setFavoriteItems([...favoriteItems, illustrationId]);

        // Nếu modal đang mở, thêm hình ảnh vào danh sách hiển thị
        if (isFavoritesModalOpen) {
          const illustrationToAdd = illustrations.find(
            (illust) => illust.$id === illustrationId
          );
          if (illustrationToAdd) {
            setFavoriteIllustrations([
              ...favoriteIllustrations,
              illustrationToAdd,
            ]);
          }
        }
      }
    } catch (error) {
      console.error("Lỗi khi cập nhật danh sách yêu thích:", error);
    }
  };

  const categories = [
    "Tất cả",
    "Đồ vật",
    "Động vật",
    "Thực phẩm",
    "Hoạt động",
    "Nghề nghiệp",
    "Phương tiện",
    "Gia đình",
    "Thời tiết",
    "Màu sắc",
    "Số đếm",
  ];
  const difficulties = ["Tất cả", "Cơ bản", "Trung cấp", "Nâng cao"];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Hình Ảnh Minh Họa Tiếng Việt
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Học từ vựng tiếng Việt thông qua hình ảnh minh họa trực quan. Tra
            cứu, khám phá và lưu lại các hình ảnh yêu thích để học hiệu quả.
          </p>
        </div>

        {/* Search and filter section */}
        <div className="bg-white p-6 rounded-xl shadow-sm mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search input */}
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Tìm kiếm hình ảnh..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Search
                className="absolute left-3 top-3.5 text-gray-400"
                size={18}
              />
            </div>

            {/* Category dropdown */}
            <div className="relative">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="appearance-none pl-10 pr-10 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              <Filter
                className="absolute left-3 top-3.5 text-gray-400"
                size={18}
              />
            </div>

            {/* Difficulty dropdown */}
            <div className="relative">
              <select
                value={selectedDifficulty}
                onChange={(e) => setSelectedDifficulty(e.target.value)}
                className="appearance-none pl-10 pr-10 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                {difficulties.map((difficulty) => (
                  <option key={difficulty} value={difficulty}>
                    {difficulty}
                  </option>
                ))}
              </select>
              <Filter
                className="absolute left-3 top-3.5 text-gray-400"
                size={18}
              />
            </div>

            {/* Button hiển thị yêu thích */}
            <button
              onClick={openFavoritesModal}
              className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors flex items-center gap-2"
            >
              <Heart size={18} />
              <span>Yêu thích ({favoriteItems.length})</span>
            </button>
          </div>
        </div>

        {/* Illustrations grid */}
        {filteredIllustrations.length === 0 ? (
          <div className="bg-white p-12 rounded-xl text-center">
            <p className="text-lg text-gray-500">
              Không tìm thấy hình ảnh phù hợp
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredIllustrations.map((illustration) => (
              <div
                key={illustration.$id}
                className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group"
              >
                <div className="relative aspect-square">
                  <img
                    src={storage
                      .getFilePreview(
                        illustration.bucketId,
                        illustration.imageId
                      )
                      .toString()}
                    alt={illustration.title}
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={() => toggleFavorite(illustration.$id)}
                    className="absolute top-3 right-3 bg-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    {favoriteItems.includes(illustration.$id) ? (
                      <BookmarkCheck className="w-5 h-5 text-blue-600" />
                    ) : (
                      <Bookmark className="w-5 h-5 text-gray-600" />
                    )}
                  </button>
                </div>
                <div className="p-4">
                  <h3 className="text-xl font-semibold mb-1">
                    {illustration.title}
                  </h3>
                  <p className="text-gray-600 text-sm mb-2">
                    {illustration.description}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">
                      {illustration.category}
                    </span>
                    <span className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded-full">
                      {illustration.difficulty === "beginner"
                        ? "Cơ bản"
                        : illustration.difficulty === "intermediate"
                        ? "Trung cấp"
                        : "Nâng cao"}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal hiển thị danh sách yêu thích */}
      {isFavoritesModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Heart className="text-red-500" size={24} />
                <span>Hình ảnh yêu thích</span>
              </h2>
              <button
                onClick={() => setIsFavoritesModalOpen(false)}
                className="p-2 rounded-lg hover:bg-gray-100"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6">
              {favoriteIllustrations.length === 0 ? (
                <div className="p-12 text-center">
                  <p className="text-gray-500 text-lg">
                    Bạn chưa có hình ảnh yêu thích nào
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                  {favoriteIllustrations.map((illustration) => (
                    <div
                      key={illustration.$id}
                      className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-200 group"
                    >
                      <div className="relative aspect-square">
                        <img
                          src={storage
                            .getFilePreview(
                              illustration.bucketId,
                              illustration.imageId
                            )
                            .toString()}
                          alt={illustration.title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-3 right-3 flex gap-2">
                          <button
                            onClick={() => toggleFavorite(illustration.$id)}
                            className="bg-white p-2 rounded-full shadow-md hover:bg-red-50"
                            title="Xóa khỏi danh sách yêu thích"
                          >
                            <Trash2 className="w-5 h-5 text-red-500" />
                          </button>
                        </div>
                      </div>
                      <div className="p-4">
                        <h3 className="text-xl font-semibold mb-1">
                          {illustration.title}
                        </h3>
                        <p className="text-gray-600 text-sm mb-2">
                          {illustration.description}
                        </p>
                        <div className="flex flex-wrap gap-2 mt-3">
                          <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">
                            {illustration.category}
                          </span>
                          <span className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded-full">
                            {illustration.difficulty === "beginner"
                              ? "Cơ bản"
                              : illustration.difficulty === "intermediate"
                              ? "Trung cấp"
                              : "Nâng cao"}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setIsFavoritesModalOpen(false)}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 w-full"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Illustrations;
