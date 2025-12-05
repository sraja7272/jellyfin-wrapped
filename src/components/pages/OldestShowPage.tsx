import { Container, Grid } from "@radix-ui/themes";
import { motion } from "framer-motion";
import { useData } from "@/contexts/DataContext";
import { LoadingSpinner } from "../LoadingSpinner";
import { MovieCard } from "./MoviesReviewPage/MovieCard";
import { Subtitle, Title } from "../ui/styled";
import { itemVariants } from "@/lib/styled-variants";
import { SimpleItemDto } from "@/lib/queries";
import PageContainer from "../PageContainer";

export default function OldestShowPage() {
  const { shows, isLoading } = useData();
  const { data: showsData } = shows;

  if (isLoading) {
    return <LoadingSpinner />;
  }

  const sortedShows = [...(showsData ?? [])]
    .filter((s: { item: SimpleItemDto }) => s.item.productionYear != null)
    .sort(
      (a: { item: SimpleItemDto }, b: { item: SimpleItemDto }) => {
        return (a.item.productionYear ?? 9999) - (b.item.productionYear ?? 9999);
      }
    );

  const show = sortedShows[0];

  if (!show) {
    return <LoadingSpinner />;
  }

  return (
    <PageContainer>
      <Container size="4" p="4">
        <Grid gap="3">
          <div style={{ textAlign: "center" }}>
            <Title as={motion.h1} variants={itemVariants}>
              Oldest Show You Watched
            </Title>
            <p style={{ fontSize: "1.125rem", color: "var(--gray-11)", marginTop: "0.5rem" }}>
              The most classic series you enjoyed
            </p>
            <Subtitle as={motion.p} variants={itemVariants}>
              Released in {show.item.productionYear}
            </Subtitle>
          </div>

          <div style={{ display: "flex", justifyContent: "center" }}>
            <div style={{ maxWidth: "200px", width: "100%" }}>
              <MovieCard
                item={show.item}
                episodeCount={show.episodeCount}
                playbackTime={show.playbackTime}
              />
            </div>
          </div>
        </Grid>
      </Container>
    </PageContainer>
  );
}
