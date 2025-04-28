import React from "react";

interface Slide {
  id: string;
  type: "cover" | "content" | "image" | "video";
  title?: string;
  content?: string;
  imageUrl?: string | null;
  videoUrl?: string | null;
  order?: number;
}

interface SlidePreviewProps {
  slides: Slide[];
  currentSlide: number;
  onSlideClick: (index: number) => void;
}

const SlideThumbnails: React.FC<SlidePreviewProps> = ({
  slides,
  currentSlide,
  onSlideClick,
}) => {
  const renderThumbnail = (slide: Slide, index: number) => {
    return (
      <div
        key={slide.id}
        onClick={() => onSlideClick(index)}
        className={`w-full h-32 border rounded-lg overflow-hidden cursor-pointer transition-all mb-2
          ${
            currentSlide === index
              ? "border-blue-500 shadow-md"
              : "border-gray-200 hover:border-gray-300"
          }`}
      >
        {slide.type === "image" && slide.imageUrl ? (
          <img
            src={slide.imageUrl}
            alt={slide.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-50 p-3">
            <div className="text-center">
              <div className="font-medium text-gray-800">
                {index + 1}. {slide.title || `Slide ${index + 1}`}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {slide.type === "video"
                  ? "Video"
                  : slide.type === "content"
                  ? "Nội dung"
                  : slide.type === "cover"
                  ? "Slide bìa"
                  : "Hình ảnh"}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-64 bg-white p-4 overflow-y-auto flex flex-col">
      {slides.map((slide, index) => renderThumbnail(slide, index))}
    </div>
  );
};

export default SlideThumbnails;
