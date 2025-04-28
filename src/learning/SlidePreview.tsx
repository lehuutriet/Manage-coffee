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
  slide: Slide;
}

const SlidePreview: React.FC<SlidePreviewProps> = ({ slide }) => {
  if (!slide) return null;

  const renderSlideContent = () => {
    switch (slide.type) {
      case "cover":
        return (
          <div className="flex flex-col items-center justify-center h-full">
            <h1 className="text-5xl font-bold text-center mb-8">
              {slide.title}
            </h1>
            {slide.content && (
              <div className="text-2xl text-center text-gray-600">
                {slide.content}
              </div>
            )}
          </div>
        );

      case "content":
        return (
          <div className="flex flex-col h-full">
            <h2 className="text-4xl font-bold mb-8 text-center">
              {slide.title}
            </h2>
            <div className="flex-1 flex items-center justify-center">
              <div className="prose max-w-3xl text-2xl leading-relaxed">
                {slide.content}
              </div>
            </div>
          </div>
        );

      case "image":
        return (
          <div className="flex flex-col h-full">
            <h2 className="text-4xl font-bold mb-8 text-center">
              {slide.title}
            </h2>
            <div className="flex-1 flex items-center justify-center">
              {slide.imageUrl ? (
                <img
                  src={slide.imageUrl}
                  alt={slide.title}
                  className="max-h-[70vh] w-auto object-contain rounded-lg"
                />
              ) : (
                <div className="text-2xl text-gray-400">No image available</div>
              )}
            </div>
            {slide.content && (
              <div className="mt-6 text-xl text-center">{slide.content}</div>
            )}
          </div>
        );

      case "video":
        return (
          <div className="flex flex-col h-full">
            <h2 className="text-4xl font-bold mb-8 text-center">
              {slide.title}
            </h2>
            <div className="flex-1 flex items-center justify-center">
              {slide.videoUrl ? (
                <div className="w-full max-w-4xl aspect-video">
                  <video
                    src={slide.videoUrl}
                    controls
                    className="w-full h-full rounded-lg"
                  />
                </div>
              ) : (
                <div className="text-2xl text-gray-400">No video available</div>
              )}
            </div>
            {slide.content && (
              <div className="mt-6 text-xl text-center">{slide.content}</div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex-1 bg-white p-12 flex items-center justify-center">
      <div className="w-full h-full max-w-6xl mx-auto">
        {renderSlideContent()}
      </div>
    </div>
  );
};

export default SlidePreview;
