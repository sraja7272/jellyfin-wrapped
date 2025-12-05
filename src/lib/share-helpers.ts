import { toPng, toBlob } from "html-to-image";

// Wait for fonts to load
async function waitForFonts(): Promise<void> {
  if (document.fonts && document.fonts.ready) {
    try {
      await document.fonts.ready;
    } catch (e) {
      console.warn("Font loading issue:", e);
    }
  }
}

// Get options for html-to-image
// html-to-image handles modern CSS, gradients, SVG, and background-clip: text much better
function getImageOptions() {
  return {
    quality: 1.0,
    pixelRatio: 2,
    backgroundColor: undefined, // Transparent background to preserve rounded corners
    cacheBust: true,
    useCORS: true,
    allowTaint: false,
    filter: (node: Node) => {
      // Don't capture elements that are outside the card (like navigation buttons)
      const element = node as HTMLElement;
      if (element.classList && element.classList.contains('navigation-button')) {
        return false;
      }
      return true;
    },
  };
}

export async function downloadImage(element: HTMLElement, filename: string): Promise<void> {
  // Create a temporary transparent container to isolate the element
  const tempContainer = document.createElement('div');
  tempContainer.style.position = 'fixed';
  tempContainer.style.top = '-9999px'; // Position off-screen
  tempContainer.style.left = '-9999px';
  tempContainer.style.width = '100%';
  tempContainer.style.height = '100%';
  tempContainer.style.backgroundColor = 'transparent';
  tempContainer.style.zIndex = '-1'; // Behind everything
  tempContainer.style.pointerEvents = 'none';
  tempContainer.style.display = 'flex';
  tempContainer.style.alignItems = 'center';
  tempContainer.style.justifyContent = 'center';
  tempContainer.style.visibility = 'hidden'; // Hidden from view
  tempContainer.style.opacity = '0'; // Fully transparent
  
  // Clone the element to avoid disrupting the original
  const clonedElement = element.cloneNode(true) as HTMLElement;
  clonedElement.style.position = 'relative';
  clonedElement.style.margin = '0';
  
  tempContainer.appendChild(clonedElement);
  document.body.appendChild(tempContainer);
  
  try {
    // Wait for fonts to load
    await waitForFonts();
    
    // Small delay to ensure everything is rendered
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Use html-to-image which handles modern CSS much better
    // It supports gradients, SVG, background-clip: text, and more
    const dataUrl = await toPng(clonedElement, getImageOptions());
    
    // Create download link
    const link = document.createElement("a");
    link.download = filename;
    link.href = dataUrl;
    link.style.display = "none";
    
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    setTimeout(() => {
      document.body.removeChild(link);
      document.body.removeChild(tempContainer);
    }, 100);
  } catch (error) {
    console.error("Error generating image:", error);
    document.body.removeChild(tempContainer);
    throw error;
  }
}

export async function copyImageToClipboard(element: HTMLElement): Promise<void> {
  // Create a temporary transparent container to isolate the element
  const tempContainer = document.createElement('div');
  tempContainer.style.position = 'fixed';
  tempContainer.style.top = '-9999px'; // Position off-screen
  tempContainer.style.left = '-9999px';
  tempContainer.style.width = '100%';
  tempContainer.style.height = '100%';
  tempContainer.style.backgroundColor = 'transparent';
  tempContainer.style.zIndex = '-1'; // Behind everything
  tempContainer.style.pointerEvents = 'none';
  tempContainer.style.display = 'flex';
  tempContainer.style.alignItems = 'center';
  tempContainer.style.justifyContent = 'center';
  tempContainer.style.visibility = 'hidden'; // Hidden from view
  tempContainer.style.opacity = '0'; // Fully transparent
  
  // Clone the element to avoid disrupting the original
  const clonedElement = element.cloneNode(true) as HTMLElement;
  clonedElement.style.position = 'relative';
  clonedElement.style.margin = '0';
  
  tempContainer.appendChild(clonedElement);
  document.body.appendChild(tempContainer);
  
  try {
    // Wait for fonts to load
    await waitForFonts();
    
    // Small delay to ensure everything is rendered
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Use html-to-image to get blob
    const blob = await toBlob(clonedElement, {
      ...getImageOptions(),
      type: 'image/png',
    });
  
    if (!blob) {
      throw new Error("Failed to create blob");
    }

    try {
      // Check if Clipboard API is available
      if (!navigator.clipboard || !window.ClipboardItem) {
        // Fallback for browsers without Clipboard API - use execCommand as last resort
        const dataUrl = await toPng(clonedElement, getImageOptions());
        // Create a temporary textarea to use execCommand
        const textarea = document.createElement('textarea');
        textarea.value = dataUrl;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        try {
          document.execCommand('copy');
          console.warn("Clipboard API not available, used execCommand fallback");
        } catch (err) {
          console.error("Failed to copy to clipboard:", err);
          throw new Error("Clipboard API not supported and execCommand failed");
        } finally {
          document.body.removeChild(textarea);
        }
        return;
      }

      // Use Clipboard API for image
      const clipboardItem = new ClipboardItem({
        "image/png": blob,
      });
      
      await navigator.clipboard.write([clipboardItem]);
    } catch (error) {
      console.error("Error copying to clipboard:", error);
      
      // Fallback: try to copy as data URL
      try {
        const dataUrl = await toPng(clonedElement, getImageOptions());
        await navigator.clipboard.writeText(dataUrl);
      } catch (fallbackError) {
        throw error;
      }
    }
  } catch (error) {
    console.error("Error generating image:", error);
    throw error;
  } finally {
    // Cleanup
    document.body.removeChild(tempContainer);
  }
}

export async function shareImage(element: HTMLElement, title: string): Promise<void> {
  // Create a temporary transparent container to isolate the element
  const tempContainer = document.createElement('div');
  tempContainer.style.position = 'fixed';
  tempContainer.style.top = '-9999px'; // Position off-screen
  tempContainer.style.left = '-9999px';
  tempContainer.style.width = '100%';
  tempContainer.style.height = '100%';
  tempContainer.style.backgroundColor = 'transparent';
  tempContainer.style.zIndex = '-1'; // Behind everything
  tempContainer.style.pointerEvents = 'none';
  tempContainer.style.display = 'flex';
  tempContainer.style.alignItems = 'center';
  tempContainer.style.justifyContent = 'center';
  tempContainer.style.visibility = 'hidden'; // Hidden from view
  tempContainer.style.opacity = '0'; // Fully transparent
  
  // Clone the element to avoid disrupting the original
  const clonedElement = element.cloneNode(true) as HTMLElement;
  clonedElement.style.position = 'relative';
  clonedElement.style.margin = '0';
  
  tempContainer.appendChild(clonedElement);
  document.body.appendChild(tempContainer);
  
  try {
    // Wait for fonts to load
    await waitForFonts();
    
    // Small delay to ensure everything is rendered
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Use html-to-image to get blob
    const blob = await toBlob(clonedElement, {
      ...getImageOptions(),
      type: 'image/png',
    });
  
    if (!blob) {
      // Fallback to download if blob creation fails
      // Use the original element for download to avoid double cloning
      document.body.removeChild(tempContainer);
      await downloadImage(element, `${title}.png`);
      return;
    }

    // Check if Web Share API is available and supports files
    if (navigator.share && navigator.canShare) {
      try {
        const file = new File([blob], `${title}.png`, { type: "image/png" });
        
        // Check if files can be shared
        const shareData: ShareData = {
          title,
          files: [file],
        };

        if (navigator.canShare(shareData)) {
          await navigator.share(shareData);
          return;
        }
      } catch (error) {
        // If user cancels, resolve silently
        if ((error as Error).name === "AbortError") {
          return;
        }
        
        // If sharing fails (e.g., files not supported), fall through to fallback
        console.warn("Share API failed, falling back to download:", error);
      }
    }

    // Fallback to download if share API not available or failed
    // Use the original element for download to avoid double cloning
    document.body.removeChild(tempContainer);
    await downloadImage(element, `${title}.png`);
  } catch (error) {
    console.error("Error generating image:", error);
    throw error;
  } finally {
    // Cleanup - only if container still exists
    if (tempContainer.parentElement) {
      document.body.removeChild(tempContainer);
    }
  }
}
