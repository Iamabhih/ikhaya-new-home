import { MessageCircle } from "lucide-react";
import { useState, useEffect } from "react";

const WHATSAPP_NUMBER = "27726633544";
const DEFAULT_MESSAGE = "Hi! I'm interested in learning more about your products.";

interface WhatsAppChatWidgetProps {
  message?: string;
}

export const WhatsAppChatWidget = ({ message = DEFAULT_MESSAGE }: WhatsAppChatWidgetProps) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [pulseActive, setPulseActive] = useState(true);

  // Show tooltip periodically to draw attention
  useEffect(() => {
    const showInterval = setInterval(() => {
      setShowTooltip(true);
      setTimeout(() => setShowTooltip(false), 4000);
    }, 15000);

    // Show tooltip initially after 3 seconds
    const initialTimeout = setTimeout(() => {
      setShowTooltip(true);
      setTimeout(() => setShowTooltip(false), 4000);
    }, 3000);

    return () => {
      clearInterval(showInterval);
      clearTimeout(initialTimeout);
    };
  }, []);

  const handleClick = () => {
    setPulseActive(false);
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodedMessage}`;
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="fixed bottom-4 right-3 xs:bottom-5 xs:right-4 sm:bottom-6 sm:right-6 z-50 flex items-center gap-2 xs:gap-3" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      {/* Chat tooltip - hidden on very small screens to avoid overflow */}
      <div
        className={`hidden xs:flex bg-white rounded-full shadow-lg px-3 py-1.5 xs:px-4 xs:py-2 items-center gap-2 transition-all duration-300 ${
          showTooltip ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4 pointer-events-none"
        }`}
      >
        {/* Live indicator dot */}
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
        </span>
        <span className="text-sm font-medium text-gray-700 whitespace-nowrap">Chat to us</span>
      </div>

      {/* WhatsApp button */}
      <button
        onClick={handleClick}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className="relative h-12 w-12 xs:h-14 xs:w-14 rounded-full bg-[#25D366] hover:bg-[#128C7E] shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 flex items-center justify-center"
        aria-label="Chat on WhatsApp"
      >
        {/* Pulse ring animation */}
        {pulseActive && (
          <>
            <span className="absolute inline-flex h-full w-full rounded-full bg-[#25D366] opacity-75 animate-ping"></span>
            <span className="absolute inline-flex h-14 w-14 xs:h-16 xs:w-16 rounded-full bg-[#25D366]/30 animate-pulse"></span>
          </>
        )}

        {/* Icon */}
        <MessageCircle className="h-6 w-6 xs:h-7 xs:w-7 text-white relative z-10" fill="white" />

        {/* Online indicator badge */}
        <span className="absolute -top-1 -right-1 flex h-4 w-4 z-20">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-4 w-4 bg-green-500 border-2 border-white"></span>
        </span>
      </button>
    </div>
  );
};
