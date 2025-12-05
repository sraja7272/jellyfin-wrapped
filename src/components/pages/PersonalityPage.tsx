import { usePersonality } from "@/hooks/queries/usePersonality";
import { LoadingSpinner } from "../LoadingSpinner";
import PageContainer from "../PageContainer";
import { Container } from "@radix-ui/themes";
import { motion } from "framer-motion";
import { styled } from "@stitches/react";
import { Sparkles, Star } from "lucide-react";

export default function PersonalityPage() {
  const { data, isLoading } = usePersonality();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!data) {
    return <LoadingSpinner />;
  }

  return (
    <PageContainer>
      <ContentWrapper
        as={motion.div}
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      >
        <Badge
          as={motion.div}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          <BadgeIcon>
            <Sparkles size={14} />
          </BadgeIcon>
          <span>Your Viewing Personality</span>
        </Badge>

        <PersonalityBadge
          as={motion.div}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, duration: 0.6, type: "spring", bounce: 0.4 }}
        >
          {data.personality}
        </PersonalityBadge>

        <Description
          as={motion.p}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.6 }}
        >
          {data.description}
        </Description>

        <TraitsContainer
          as={motion.div}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.6 }}
        >
          <TraitsTitle>Your Traits</TraitsTitle>
          <TraitsGrid>
            {data.traits.map((trait, index) => (
              <TraitBadge
                key={trait}
                as={motion.div}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.9 + index * 0.1, duration: 0.4 }}
              >
                <Star size={16} />
                <span>{trait}</span>
              </TraitBadge>
            ))}
          </TraitsGrid>
        </TraitsContainer>
      </ContentWrapper>
    </PageContainer>
  );
}

const ContentWrapper = styled("div", {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "calc(100vh - 8rem)",
  textAlign: "center",
  padding: "3rem 1rem 2rem",
  width: "100%",
  maxWidth: "100%",
  margin: "0 auto",
  boxSizing: "border-box",
});

const Badge = styled("div", {
  display: "inline-flex",
  alignItems: "center",
  gap: "10px",
  padding: "10px 20px",
  background: "rgba(0, 240, 255, 0.06)",
  border: "1px solid rgba(0, 240, 255, 0.12)",
  borderRadius: "999px",
  fontSize: "0.85rem",
  fontWeight: 600,
  color: "#00f0ff",
  marginBottom: "2rem",
  backdropFilter: "blur(12px)",
});

const BadgeIcon = styled("span", {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "24px",
  height: "24px",
  borderRadius: "7px",
  background: "rgba(0, 240, 255, 0.15)",
});

const PersonalityBadge = styled("div", {
  fontSize: "clamp(2.5rem, 8vw, 5rem)",
  fontWeight: 800,
  marginBottom: "2rem",
  letterSpacing: "-0.04em",
  background: "linear-gradient(135deg, #f8fafc 0%, #00f0ff 50%, #a855f7 100%)",
  backgroundSize: "200% 200%",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  backgroundClip: "text",
  animation: "gradient-flow 8s ease infinite",
  textAlign: "center",
  width: "100%",
});

const Description = styled("p", {
  fontSize: "clamp(1.25rem, 3vw, 1.75rem)",
  fontWeight: 500,
  color: "#f8fafc",
  maxWidth: "700px",
  lineHeight: 1.6,
  marginBottom: "3rem",
  marginLeft: "auto",
  marginRight: "auto",
  textAlign: "center",
});

const TraitsContainer = styled("div", {
  width: "100%",
  maxWidth: "800px",
});

const TraitsTitle = styled("h2", {
  fontSize: "1.5rem",
  fontWeight: 700,
  color: "#f8fafc",
  marginBottom: "1.5rem",
  textAlign: "center",
});

const TraitsGrid = styled("div", {
  display: "flex",
  flexWrap: "wrap",
  gap: "1rem",
  justifyContent: "center",
});

const TraitBadge = styled("div", {
  display: "flex",
  alignItems: "center",
  gap: "0.5rem",
  padding: "0.75rem 1.5rem",
  background: "rgba(18, 21, 28, 0.65)",
  border: "1px solid rgba(0, 240, 255, 0.2)",
  borderRadius: "12px",
  fontSize: "1rem",
  fontWeight: 600,
  color: "#00f0ff",
  backdropFilter: "blur(12px)",
  transition: "all 0.3s ease",
  
  "&:hover": {
    transform: "translateY(-4px)",
    boxShadow: "0 8px 24px rgba(0, 240, 255, 0.2)",
  },
});

