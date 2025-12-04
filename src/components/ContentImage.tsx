import { useState } from "react";
import { SimpleItemDto } from "@/lib/queries";
import { styled } from "@stitches/react";

export function ContentImage({ item }: { item: SimpleItemDto }) {
  const [hasError, setHasError] = useState(false);

  if (hasError || !item.imageUrl) {
    return (
      <FallbackContainer>
        <FallbackText>{item.name?.[0] || "?"}</FallbackText>
      </FallbackContainer>
    );
  }

  return (
    <ImageWrapper>
      <StyledImage 
        src={item.imageUrl} 
        alt={item.name || "Content"} 
        onError={() => setHasError(true)}
      />
    </ImageWrapper>
  );
}

const ImageWrapper = styled("div", {
  width: "100%",
  height: "100%",
  position: "relative",
  overflow: "hidden",
  borderRadius: "inherit",
});

const StyledImage = styled("img", {
  width: "100%",
  height: "100%",
  objectFit: "cover",
  display: "block",
});

const FallbackContainer = styled("div", {
  width: "100%",
  height: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "linear-gradient(135deg, rgba(0, 240, 255, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%)",
  borderRadius: "inherit",
});

const FallbackText = styled("span", {
  fontSize: "2rem",
  fontWeight: 700,
  color: "#00f0ff",
  textTransform: "uppercase",
});
