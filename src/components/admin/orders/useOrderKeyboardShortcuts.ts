import { useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

interface Order {
  id: string;
  order_number: string;
  status: string;
}

interface UseOrderKeyboardShortcutsOptions {
  orders: Order[];
  selectedOrderIndex: number;
  setSelectedOrderIndex: (index: number) => void;
  onViewOrder: (order: Order) => void;
  onQuickStatusUpdate: (orderId: string, status: string) => void;
  onToggleSelect: (orderId: string) => void;
  isModalOpen: boolean;
  onShowHelp: () => void;
}

const STATUS_SHORTCUTS: Record<string, string> = {
  'p': 'processing',
  's': 'shipped',
  'd': 'delivered',
  'c': 'completed',
};

export const useOrderKeyboardShortcuts = ({
  orders,
  selectedOrderIndex,
  setSelectedOrderIndex,
  onViewOrder,
  onQuickStatusUpdate,
  onToggleSelect,
  isModalOpen,
  onShowHelp,
}: UseOrderKeyboardShortcutsOptions) => {
  const { toast } = useToast();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle shortcuts when typing in inputs
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      // Don't handle most shortcuts when modal is open
      if (isModalOpen && e.key !== 'Escape') {
        return;
      }

      const key = e.key.toLowerCase();

      // Show help
      if (key === '?' || (e.shiftKey && key === '/')) {
        e.preventDefault();
        onShowHelp();
        return;
      }

      // Navigation
      if (key === 'arrowdown' || key === 'j') {
        e.preventDefault();
        if (selectedOrderIndex < orders.length - 1) {
          setSelectedOrderIndex(selectedOrderIndex + 1);
        }
        return;
      }

      if (key === 'arrowup' || key === 'k') {
        e.preventDefault();
        if (selectedOrderIndex > 0) {
          setSelectedOrderIndex(selectedOrderIndex - 1);
        }
        return;
      }

      // View order details
      if (key === 'enter' && selectedOrderIndex >= 0 && orders[selectedOrderIndex]) {
        e.preventDefault();
        onViewOrder(orders[selectedOrderIndex]);
        return;
      }

      // Toggle selection
      if (key === ' ' && selectedOrderIndex >= 0 && orders[selectedOrderIndex]) {
        e.preventDefault();
        onToggleSelect(orders[selectedOrderIndex].id);
        return;
      }

      // Quick status updates
      if (STATUS_SHORTCUTS[key] && selectedOrderIndex >= 0 && orders[selectedOrderIndex]) {
        e.preventDefault();
        onQuickStatusUpdate(orders[selectedOrderIndex].id, STATUS_SHORTCUTS[key]);
        return;
      }

      // Escape to clear selection
      if (key === 'escape') {
        e.preventDefault();
        setSelectedOrderIndex(-1);
        return;
      }

      // Jump to first/last
      if (key === 'home' || (e.metaKey && key === 'arrowup')) {
        e.preventDefault();
        setSelectedOrderIndex(0);
        return;
      }

      if (key === 'end' || (e.metaKey && key === 'arrowdown')) {
        e.preventDefault();
        setSelectedOrderIndex(orders.length - 1);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    orders,
    selectedOrderIndex,
    setSelectedOrderIndex,
    onViewOrder,
    onQuickStatusUpdate,
    onToggleSelect,
    isModalOpen,
    onShowHelp,
    toast,
  ]);
};
