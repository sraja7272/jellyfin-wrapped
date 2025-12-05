import { useDecades } from "@/hooks/queries/useDecades";
import { LoadingSpinner } from "../LoadingSpinner";
import PageContainer from "../PageContainer";
import { Container } from "@radix-ui/themes";
import { motion } from "framer-motion";
import { styled } from "@stitches/react";
import { Sparkles, Calendar } from "lucide-react";
import { PieChart } from "../charts/PieChart";

export default function DecadeBreakdownPage() {
  const { data, isLoading } = useDecades();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!data) {
    return <LoadingSpinner />;
  }

  // Filter out periods with no data
  const periodsWithData = data.periodBreakdown.filter((period) => period.count > 0);

  const chartData = periodsWithData.map((period) => ({
    name: period.period,
    minutes: period.count * 60, // Convert to minutes for chart compatibility
  }));

  const colors = ["#00f0ff", "#a855f7", "#f59e0b", "#f43f5e"] as const;

  return (
    <PageContainer>
      <Container size="4" p="4">
        <HeaderSection
          as={motion.div}
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          <Badge>
            <BadgeIcon>
              <Sparkles size={14} />
            </BadgeIcon>
            <span>Your Time Period</span>
          </Badge>
          <Title>Decade Breakdown</Title>
          <Subtitle>When your content was made</Subtitle>
        </HeaderSection>

        <ContentGrid>
          <ChartCard
            as={motion.div}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            <ChartTitle>Distribution by Period</ChartTitle>
            <ChartContainer>
              <PieChart
                data={chartData}
                colors={colors}
                title=""
                containerWidth={400}
              />
            </ChartContainer>
            <Legend>
              {periodsWithData.map((period, index) => (
                <LegendItem key={period.period}>
                  <LegendColor
                    style={{
                      backgroundColor: colors[index],
                    }}
                  />
                  <LegendLabel>{period.period}</LegendLabel>
                  <LegendValue>{period.percentage}%</LegendValue>
                </LegendItem>
              ))}
            </Legend>
          </ChartCard>

          <StatsCard
            as={motion.div}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            <StatIcon>
              <Calendar size={24} />
            </StatIcon>
            <StatTitle>Average Year</StatTitle>
            <StatValue>{data.averageYear}</StatValue>
            <StatSubtext>Your content's average production year</StatSubtext>

            <Divider />

            <PersonalitySection>
              <PersonalityBadge>{data.personality}</PersonalityBadge>
              <PersonalityMessage>{data.message}</PersonalityMessage>
            </PersonalitySection>
          </StatsCard>
        </ContentGrid>
      </Container>
    </PageContainer>
  );
}

const HeaderSection = styled("div", {
  textAlign: "center",
  marginBottom: "3rem",
  paddingTop: "2rem",
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
  marginBottom: "1.5rem",
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

const Title = styled("h1", {
  fontSize: "clamp(2.25rem, 6vw, 4rem)",
  fontWeight: 800,
  marginBottom: "0.5rem",
  letterSpacing: "-0.04em",
  background: "linear-gradient(135deg, #f8fafc 0%, #00f0ff 50%, #a855f7 100%)",
  backgroundSize: "200% 200%",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  backgroundClip: "text",
  animation: "gradient-flow 8s ease infinite",
});

const Subtitle = styled("p", {
  fontSize: "1.15rem",
  color: "#94a3b8",
  fontWeight: 400,
});

const ContentGrid = styled("div", {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))",
  gap: "2rem",
  marginBottom: "3rem",
});

const ChartCard = styled("div", {
  background: "rgba(18, 21, 28, 0.65)",
  backdropFilter: "blur(24px) saturate(180%)",
  border: "1px solid rgba(255, 255, 255, 0.05)",
  borderRadius: "24px",
  padding: "2rem",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
});

const ChartTitle = styled("h2", {
  fontSize: "1.5rem",
  fontWeight: 700,
  color: "#f8fafc",
  marginBottom: "2rem",
  textAlign: "center",
});

const ChartContainer = styled("div", {
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  marginBottom: "2rem",
});

const Legend = styled("div", {
  display: "flex",
  flexDirection: "column",
  gap: "1rem",
  marginTop: "2rem",
  width: "100%",
});

const LegendItem = styled("div", {
  display: "flex",
  alignItems: "center",
  gap: "1rem",
  padding: "0.75rem",
  background: "rgba(255, 255, 255, 0.02)",
  borderRadius: "12px",
});

const LegendColor = styled("div", {
  width: "20px",
  height: "20px",
  borderRadius: "4px",
});

const LegendLabel = styled("span", {
  flex: 1,
  fontSize: "1rem",
  color: "#f8fafc",
  fontWeight: 500,
});

const LegendValue = styled("span", {
  fontSize: "1rem",
  color: "#00f0ff",
  fontWeight: 700,
  fontFamily: "'JetBrains Mono', monospace",
});

const StatsCard = styled("div", {
  background: "rgba(18, 21, 28, 0.65)",
  backdropFilter: "blur(24px) saturate(180%)",
  border: "1px solid rgba(255, 255, 255, 0.05)",
  borderRadius: "24px",
  padding: "2rem",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  textAlign: "center",
});

const StatIcon = styled("div", {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "64px",
  height: "64px",
  borderRadius: "16px",
  background: "linear-gradient(135deg, rgba(0, 240, 255, 0.15) 0%, rgba(168, 85, 247, 0.15) 100%)",
  border: "1px solid rgba(0, 240, 255, 0.2)",
  color: "#00f0ff",
  marginBottom: "1.5rem",
});

const StatTitle = styled("h3", {
  fontSize: "1.1rem",
  fontWeight: 600,
  color: "#94a3b8",
  marginBottom: "0.5rem",
  textTransform: "uppercase",
  letterSpacing: "0.1em",
});

const StatValue = styled("div", {
  fontSize: "3.5rem",
  fontWeight: 800,
  fontFamily: "'JetBrains Mono', monospace",
  color: "#00f0ff",
  textShadow: "0 0 40px rgba(0, 240, 255, 0.5)",
  marginBottom: "0.5rem",
});

const StatSubtext = styled("p", {
  fontSize: "0.9rem",
  color: "#64748b",
  marginBottom: "2rem",
});

const Divider = styled("div", {
  width: "100%",
  height: "1px",
  background: "rgba(255, 255, 255, 0.1)",
  margin: "2rem 0",
});

const PersonalitySection = styled("div", {
  width: "100%",
  display: "flex",
  flexDirection: "column",
  gap: "1rem",
});

const PersonalityBadge = styled("div", {
  display: "inline-block",
  padding: "0.5rem 1rem",
  background: "rgba(168, 85, 247, 0.1)",
  border: "1px solid rgba(168, 85, 247, 0.2)",
  borderRadius: "8px",
  fontSize: "0.9rem",
  fontWeight: 600,
  color: "#c084fc",
  alignSelf: "center",
});

const PersonalityMessage = styled("p", {
  fontSize: "1.1rem",
  color: "#f8fafc",
  lineHeight: 1.6,
  fontStyle: "italic",
  textAlign: "center",
});

