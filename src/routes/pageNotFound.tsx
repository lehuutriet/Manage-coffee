import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

export default function SpaceNotFound() {
  const navigate = useNavigate();
  const [blackHoleActive, setBlackHoleActive] = useState(false);

  const handleGoHome = () => {
    setBlackHoleActive(true);
    setTimeout(() => {
      navigate("/homepage");
    }, 2000);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-black via-purple-950 to-indigo-950 flex items-center justify-center">
      {/* Các ngôi sao */}
      <div className="stars absolute inset-0">
        {[...Array(100)].map((_, i) => (
          <div
            key={i}
            className="star absolute rounded-full bg-white"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              width: `${Math.random() * 3}px`,
              height: `${Math.random() * 3}px`,
              animation: `twinkle ${Math.random() * 5 + 3}s infinite`,
            }}
          />
        ))}
      </div>

      {/* Hành tinh */}
      <motion.div
        className="absolute w-20 h-20 rounded-full bg-gradient-to-br from-blue-400 to-blue-700"
        style={{
          top: "15%",
          right: "20%",
          boxShadow: "0 0 20px rgba(59, 130, 246, 0.5)",
        }}
        animate={{
          rotate: 360,
        }}
        transition={{
          duration: 50,
          repeat: Infinity,
          ease: "linear",
        }}
      >
        {/* Vệ tinh */}
        <motion.div
          className="absolute w-5 h-5 rounded-full bg-gray-300"
          style={{
            top: "-10%",
            left: "50%",
            marginLeft: "-2.5px",
          }}
          animate={{
            rotate: 360,
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      </motion.div>

      {/* UFO */}
      <motion.div
        className="absolute w-16 h-6 bg-gradient-to-r from-gray-300 to-gray-500 rounded-full"
        style={{
          top: "30%",
          left: "20%",
        }}
        animate={{
          y: [0, -10, 0],
          rotate: [0, 5, -5, 0],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        <div
          className="absolute w-8 h-3 bg-cyan-400 rounded-full top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
          style={{ animation: "glow 2s infinite" }}
        />
      </motion.div>

      {/* Sao băng */}
      <motion.div
        className="absolute h-0.5 bg-white"
        style={{
          width: "100px",
          top: "15%",
          left: "0%",
        }}
        animate={{
          x: ["0vw", "100vw"],
          opacity: [0, 1, 0],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          repeatDelay: 7,
          ease: "easeOut",
        }}
      />

      {/* Hiệu ứng lỗ đen */}
      {blackHoleActive && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div
            className="w-0 h-0 rounded-full bg-black"
            animate={{
              width: window.innerWidth * 3,
              height: window.innerWidth * 3,
            }}
            transition={{ duration: 2 }}
          />
          <div className="absolute text-white text-xl">
            Đang dịch chuyển về trang chủ...
          </div>
        </motion.div>
      )}

      {/* Nội dung chính */}
      <div className="relative z-10 max-w-lg mx-auto text-center px-4">
        <motion.div
          className="text-9xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400"
          style={{ textShadow: "0 0 20px rgba(168, 85, 247, 0.6)" }}
          animate={{
            textShadow: [
              "0 0 20px rgba(168, 85, 247, 0.3)",
              "0 0 30px rgba(168, 85, 247, 0.8)",
              "0 0 20px rgba(168, 85, 247, 0.3)",
            ],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          404
        </motion.div>

        <motion.h1
          className="text-4xl font-bold text-white mb-6"
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 5, repeat: Infinity }}
        >
          Không tìm thấy hành tinh
        </motion.h1>

        <p className="text-lg text-indigo-200 mb-10">
          Có vẻ như bạn đã rơi vào vùng không gian trống rỗng. Hãy để chúng tôi
          đưa bạn trở về căn cứ.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <motion.button
            onClick={handleGoHome}
            className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full font-medium text-lg shadow-lg shadow-indigo-500/30"
            whileHover={{
              scale: 1.05,
              boxShadow: "0 0 20px rgba(99, 102, 241, 0.6)",
            }}
            whileTap={{ scale: 0.98 }}
          >
            Dịch chuyển về trang chủ
          </motion.button>

          <motion.a
            href="#"
            className="px-6 py-3 border border-indigo-400 text-indigo-200 rounded-full font-medium"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
          >
            Gửi tín hiệu cầu cứu
          </motion.a>
        </div>
      </div>

      {/* Style cho các animation */}
      <style>{`
        @keyframes twinkle {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.3;
          }
        }

        @keyframes glow {
          0%,
          100% {
            opacity: 0.7;
            box-shadow: 0 0 5px rgba(34, 211, 238, 0.5);
          }
          50% {
            opacity: 1;
            box-shadow: 0 0 15px rgba(34, 211, 238, 0.8);
          }
        }
      `}</style>
    </div>
  );
}
