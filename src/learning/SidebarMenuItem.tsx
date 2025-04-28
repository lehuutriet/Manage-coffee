import { ReactNode } from "react";

interface SidebarMenuItemProps {
  icon: ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}

const SidebarMenuItem: React.FC<SidebarMenuItemProps> = ({
  icon,
  label,
  active = false,
  onClick,
}) => (
  <div
    onClick={onClick}
    className={`flex items-center gap-4 px-4 py-3 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors ${
      active ? "bg-blue-50" : ""
    }`}
  >
    <div
      className={`w-8 h-8 flex items-center justify-center ${
        active ? "bg-[#1CB0F6] rounded-lg" : ""
      }`}
    >
      {icon}
    </div>
    <span
      className={`text-sm font-medium ${
        active ? "text-blue-600" : "text-gray-700"
      }`}
    >
      {label}
    </span>
  </div>
);

export default SidebarMenuItem;
