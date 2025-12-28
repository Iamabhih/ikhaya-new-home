import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Keyboard } from "lucide-react";

interface KeyboardShortcutsHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

const shortcuts = [
  { category: 'Navigation', items: [
    { keys: ['↑', '↓'], description: 'Navigate between orders' },
    { keys: ['J', 'K'], description: 'Navigate (Vim style)' },
    { keys: ['Home'], description: 'Jump to first order' },
    { keys: ['End'], description: 'Jump to last order' },
    { keys: ['Enter'], description: 'View order details' },
    { keys: ['Esc'], description: 'Close modal / Clear selection' },
  ]},
  { category: 'Selection', items: [
    { keys: ['Space'], description: 'Toggle order selection' },
  ]},
  { category: 'Quick Status Updates', items: [
    { keys: ['P'], description: 'Mark as Processing' },
    { keys: ['S'], description: 'Mark as Shipped' },
    { keys: ['D'], description: 'Mark as Delivered' },
    { keys: ['C'], description: 'Mark as Completed' },
  ]},
  { category: 'Other', items: [
    { keys: ['?'], description: 'Show this help dialog' },
  ]},
];

export const KeyboardShortcutsHelp = ({ isOpen, onClose }: KeyboardShortcutsHelpProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          {shortcuts.map((section) => (
            <div key={section.category}>
              <h4 className="text-sm font-semibold text-muted-foreground mb-2">
                {section.category}
              </h4>
              <div className="space-y-2">
                {section.items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <span className="text-sm">{item.description}</span>
                    <div className="flex gap-1">
                      {item.keys.map((key, keyIdx) => (
                        <kbd 
                          key={keyIdx}
                          className="px-2 py-1 bg-muted rounded text-xs font-mono min-w-[24px] text-center"
                        >
                          {key}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};
