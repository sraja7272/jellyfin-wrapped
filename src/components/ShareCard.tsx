import { ReactNode, useRef, useState, useEffect } from "react";
import { styled } from "@stitches/react";
import { Download, Copy, Share2 } from "lucide-react";
import { downloadImage, copyImageToClipboard, shareImage } from "@/lib/share-helpers";

interface ShareCardProps {
  title: string;
  children: ReactNode;
  filename: string;
}

export function ShareCard({ title, children, filename }: ShareCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [generatingButton, setGeneratingButton] = useState<"download" | "copy" | "share" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setGeneratingButton("download");
    setError(null);
    try {
      await downloadImage(cardRef.current, filename);
    } catch (error) {
      console.error("Failed to download image:", error);
      setError("Failed to download image. Please try again.");
      setTimeout(() => setError(null), 3000);
    } finally {
      setGeneratingButton(null);
    }
  };

  const handleCopy = async () => {
    if (!cardRef.current) return;
    setGeneratingButton("copy");
    setError(null);
    try {
      await copyImageToClipboard(cardRef.current);
    } catch (error) {
      console.error("Failed to copy image:", error);
      setError("Failed to copy image. Please try again.");
      setTimeout(() => setError(null), 3000);
    } finally {
      setGeneratingButton(null);
    }
  };

  const handleShare = async () => {
    if (!cardRef.current) return;
    setGeneratingButton("share");
    setError(null);
    try {
      await shareImage(cardRef.current, title);
    } catch (error) {
      console.error("Failed to share image:", error);
      setError("Failed to share image. Please try again.");
      setTimeout(() => setError(null), 3000);
    } finally {
      setGeneratingButton(null);
    }
  };

  return (
    <CardContainer>
      <CardContent ref={cardRef}>
        {children}
      </CardContent>
      <Actions>
        {!isMobile && (
          <>
            <ActionButton onClick={() => { handleDownload().catch(() => {}); }} disabled={generatingButton !== null}>
              {generatingButton === "download" ? (
                <Spinner />
              ) : (
                <Download size={18} />
              )}
            </ActionButton>
            <ActionButton onClick={() => { handleCopy().catch(() => {}); }} disabled={generatingButton !== null}>
              {generatingButton === "copy" ? (
                <Spinner />
              ) : (
                <Copy size={18} />
              )}
            </ActionButton>
          </>
        )}
        <ActionButton onClick={() => { handleShare().catch(() => {}); }} disabled={generatingButton !== null}>
          {generatingButton === "share" ? (
            <Spinner />
          ) : (
            <Share2 size={18} />
          )}
        </ActionButton>
      </Actions>
      {error && (
        <ErrorMessage>{error}</ErrorMessage>
      )}
    </CardContainer>
  );
}

const CardContainer = styled("div", {
  display: "flex",
  flexDirection: "column",
  gap: "1.5rem",
  width: "100%",
  alignItems: "center",
  
  "@media (max-width: 768px)": {
    width: "90vw", // Match the card slide width
    alignItems: "center",
  },
});

const CardContent = styled("div", {
  background: "linear-gradient(135deg, #0a0a0f 0%, #1a1a24 50%, #0a0a0f 100%)",
  borderRadius: "24px",
  padding: "2.5rem",
  width: "400px",
  height: "700px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  position: "relative",
  overflow: "hidden",
  border: "2px solid rgba(255, 255, 255, 0.1)",
  boxSizing: "border-box",
  boxShadow: "0 20px 60px rgba(0, 0, 0, 0.5)",
  // Ensure fonts are loaded
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  
  "@media (max-width: 768px)": {
    width: "calc(95vw - 2rem)", // 95% of viewport width minus padding (5% smaller)
    maxWidth: "calc(95vw - 2rem)",
    height: "auto",
    minHeight: "600px",
    padding: "2rem",
  },
});

const Actions = styled("div", {
  display: "flex",
  gap: "1rem",
  justifyContent: "center",
  width: "400px",
  maxWidth: "400px",
  boxSizing: "border-box",
  
  "@media (max-width: 768px)": {
    width: "calc(90vw - 2rem)", // Match card width exactly (90vw - padding from card)
    maxWidth: "calc(90vw - 2rem)",
    gap: "0.5rem",
    boxSizing: "border-box",
  },
});

const ActionButton = styled("button", {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "0.5rem",
  padding: "0.75rem 1.5rem",
  background: "rgba(0, 240, 255, 0.1)",
  border: "1px solid rgba(0, 240, 255, 0.2)",
  borderRadius: "12px",
  color: "#00f0ff",
  fontSize: "0.9rem",
  fontWeight: 600,
  cursor: "pointer",
  userSelect: "none",
  WebkitTapHighlightColor: "transparent",
  width: "120px", // Fixed width to prevent size changes
  height: "42px", // Fixed height to prevent size changes
  boxSizing: "border-box", // Include padding in width calculation
  
  "&:hover:not(:disabled)": {
    background: "rgba(0, 240, 255, 0.2)",
  },
  
  "&:disabled": {
    opacity: 0.5,
    cursor: "not-allowed",
  },
  
  "@media (max-width: 768px)": {
    width: "100%", // Full width on mobile when it's the only button
    padding: "0.75rem",
    gap: "0",
  },
});

const Spinner = styled("div", {
  width: "18px",
  height: "18px",
  border: "2px solid rgba(0, 240, 255, 0.3)",
  borderTop: "2px solid #00f0ff",
  borderRadius: "50%",
  animation: "spin 0.8s linear infinite",
  
  "@keyframes spin": {
    "0%": {
      transform: "rotate(0deg)",
    },
    "100%": {
      transform: "rotate(360deg)",
    },
  },
});

const ErrorMessage = styled("div", {
  color: "#ef4444",
  fontSize: "0.85rem",
  textAlign: "center",
  marginTop: "0.5rem",
  padding: "0.5rem",
  background: "rgba(239, 68, 68, 0.1)",
  borderRadius: "8px",
  border: "1px solid rgba(239, 68, 68, 0.2)",
});

