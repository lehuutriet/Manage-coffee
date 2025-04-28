import React, { useEffect, useState } from "react";

interface CountdownProps {
  duration: number;
  hasStarted: boolean;
}

export const Countdown: React.FC<CountdownProps> = ({
  duration,
  hasStarted,
}) => {
  const [timeLeft, setTimeLeft] = useState(duration * 60);

  useEffect(() => {
    if (!hasStarted) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [hasStarted]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div
      className={`
      px-3 py-2 rounded-lg text-sm font-medium
      ${
        hasStarted
          ? "bg-green-100 text-green-800"
          : timeLeft === 0
          ? "bg-red-100 text-red-800"
          : "bg-yellow-100 text-yellow-800"
      }
    `}
    >
      {timeLeft > 0
        ? `Còn lại: ${String(minutes).padStart(2, "0")}:${String(
            seconds
          ).padStart(2, "0")}`
        : "Đã kết thúc"}
    </div>
  );
};
