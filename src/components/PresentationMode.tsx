// PresentationMode.tsx
import React, { useState, useEffect } from "react";
import { X, ChevronLeft, ChevronRight, Play, Pause } from "lucide-react";

interface Slide {
  id: string;
  type: "cover" | "content" | "image" | "video";
  title?: string;
  content?: string;
  imageUrl?: string | null;
  videoUrl?: string | null;
  order?: number;
}

interface PresentationModeProps {
  slides: Slide[];
  onClose: () => void;
}

const PresentationMode: React.FC<PresentationModeProps> = ({
  slides,
  onClose,
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (isPlaying) {
      intervalId = setInterval(() => {
        setCurrentSlide((prev) => {
          if (prev < slides.length - 1) {
            return prev + 1;
          } else {
            setIsPlaying(false);
            return prev;
          }
        });
      }, 3000);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isPlaying, slides.length]);

  // Phần code điều hướng phím tắt giữ nguyên
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowRight":
        case "Space":
          if (currentSlide < slides.length - 1) {
            nextSlide();
          }
          break;
        case "ArrowLeft":
          if (currentSlide > 0) {
            previousSlide();
          }
          break;
        case "Escape":
          onClose();
          break;
      }
    };

    document.addEventListener("keydown", handleKeyPress);
    return () => document.removeEventListener("keydown", handleKeyPress);
  }, [currentSlide, slides.length, onClose]);

  const renderSlideContent = (slide: Slide) => {
    switch (slide.type) {
      case "image":
        return (
          <div className="flex items-center justify-center h-full">
            <img
              src={slide.imageUrl || ""}
              alt={slide.title || ""}
              className="max-w-[95vw] max-h-[90vh] object-contain animate-fadeIn"
            />
          </div>
        );
      case "content":
        return (
          <div className="flex flex-col items-center justify-center h-full p-8 animate-slideIn text-white">
            {slide.title && (
              <h2 className="text-4xl font-bold mb-8 text-center">
                {slide.title}
              </h2>
            )}
            <div className="prose prose-xl max-w-4xl text-center">
              {slide.content}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const nextSlide = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setCurrentSlide((prev) => Math.min(slides.length - 1, prev + 1));
    setTimeout(() => setIsAnimating(false), 500);
  };

  const previousSlide = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setCurrentSlide((prev) => Math.max(0, prev - 1));
    setTimeout(() => setIsAnimating(false), 500);
  };

  return (
    <div className="fixed inset-0 bg-black z-50 text-white">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full transition-colors"
      >
        <X className="w-6 h-6" />
      </button>

      <div className="h-full flex items-center justify-center">
        {renderSlideContent(slides[currentSlide])}
      </div>

      <div className="absolute bottom-4 left-4">
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="p-2 hover:bg-white/10 rounded-full transition-colors"
        >
          {isPlaying ? (
            <Pause className="w-6 h-6" />
          ) : (
            <Play className="w-6 h-6" />
          )}
        </button>
      </div>

      <div className="absolute bottom-4 right-4 flex items-center gap-4">
        <button
          onClick={previousSlide}
          disabled={currentSlide === 0}
          className="p-2 hover:bg-white/10 rounded-full transition-colors disabled:opacity-50"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <span className="text-sm">
          {currentSlide + 1} / {slides.length}
        </span>
        <button
          onClick={nextSlide}
          disabled={currentSlide === slides.length - 1}
          className="p-2 hover:bg-white/10 rounded-full transition-colors disabled:opacity-50"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};

export default PresentationMode;
