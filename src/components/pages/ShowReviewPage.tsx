import { Container } from "@radix-ui/themes";
import { motion } from "framer-motion";
import { useData } from "@/contexts/DataContext";
import { MovieCard } from "./MoviesReviewPage/MovieCard";
import { LoadingSpinner } from "../LoadingSpinner";
import { Title, CenteredGrid } from "../ui/styled";
import { itemVariants } from "@/lib/styled-variants";
import PageContainer from "../PageContainer";

export default function ShowReviewPage() {
  const { shows, isLoading } = useData();
  const { data: showsData } = shows;

  if (isLoading) {
    return <LoadingSpinner />;
  }

  const visibleShows = showsData ?? [];

  if (!visibleShows.length) {
    return <LoadingSpinner />;
  }

  // Calculate total episodes watched
  const totalEpisodes = visibleShows.reduce(
    (sum: number, show: { episodeCount?: number }) => sum + (show.episodeCount || 0),
    0
  );

  // Fun messages based on show count and episodes
  const getShowMessage = (showCount: number, episodes: number): string => {
    if (episodes >= 500) return `Over ${episodes} episodes across ${showCount} shows. That's some serious binge-watching! 📺`;
    if (episodes >= 200) return `${episodes} episodes? You've basically watched a whole network!`;
    if (showCount >= 20) return `${showCount} shows and ${episodes} episodes. You're a serial binge-watcher!`;
    if (showCount >= 10) return "Double-digit shows! Your watchlist is impressive.";
    return "Every show tells a story. Here's yours!";
  };

  return (
    <PageContainer>
      <Container size="4" p="4">
        <div style={{ display: "flex", flexDirection: "column", gap: "clamp(1.5rem, 3vw, 2rem)" }}>
          <div style={{ textAlign: "center" }}>
            <Title as={motion.h1} variants={itemVariants}>
              You Watched {visibleShows.length} Shows
            </Title>
            <p style={{ fontSize: "clamp(1rem, 2vw, 1.125rem)", color: "#94a3b8", marginTop: "0.5rem" }}>
              {getShowMessage(visibleShows.length, totalEpisodes)}
            </p>
          </div>

          <CenteredGrid>
            {visibleShows
              .slice(0, 20)
              .map(
                (show: {
                  item: { id?: string };
                  episodeCount: number;
                  playbackTime: number;
                }) => (
                  <MovieCard
                    key={show.item.id}
                    item={show.item}
                    episodeCount={show.episodeCount}
                    playbackTime={show.playbackTime}
                  />
                )
              )}
          </CenteredGrid>
        </div>
      </Container>
    </PageContainer>
  );
}
