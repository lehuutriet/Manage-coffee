import { X } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-white">
        <button
          onClick={onClose}
          className="absolute right-6 top-6 p-2 hover:bg-gray-100 rounded-full z-10"
        >
          <X className="w-8 h-8" />
        </button>
        <div className="h-full overflow-y-auto py-8">{children}</div>
      </div>
    </div>
  );
};

export default Modal;
