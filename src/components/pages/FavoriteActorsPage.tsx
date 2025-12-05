import { Container } from "@radix-ui/themes";
import { motion } from "framer-motion";
import { useData } from "@/contexts/DataContext";
import { LoadingSpinner } from "../LoadingSpinner";
import { ActorCard } from "./MoviesReviewPage/ActorCard";
import { Title, CenteredGrid } from "../ui/styled";
import { itemVariants } from "@/lib/styled-variants";
import PageContainer from "../PageContainer";
import { generateGuid } from "@/lib/utils";
import { SimpleItemDto, PersonDto } from "@/lib/queries";

export default function FavoriteActorsPage() {
  const { actors, isLoading } = useData();
  const { data: favoriteActors } = actors;

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!favoriteActors?.length) {
    return <LoadingSpinner />;
  }

  const topActor = favoriteActors[0];
  const topActorCount = topActor?.count || 0;

  // Fun messages based on actor appearances
  const getActorMessage = (count: number): string => {
    if (count >= 10) return `Your top actor appeared in ${count} titles! That's some serious star power ⭐`;
    if (count >= 5) return `Your favorite performer showed up ${count} times. They must be good!`;
    return "The faces that kept appearing in your watchlist 🎭";
  };

  return (
    <PageContainer>
      <Container size="4" p="4">
        <div style={{ display: "flex", flexDirection: "column", gap: "clamp(1.5rem, 3vw, 2rem)" }}>
          <div style={{ textAlign: "center" }}>
            <Title as={motion.h1} variants={itemVariants}>
              Your Favorite Actors
            </Title>
            <p style={{ fontSize: "clamp(1rem, 2vw, 1.125rem)", color: "#94a3b8", marginTop: "0.5rem" }}>
              {getActorMessage(topActorCount)}
            </p>
          </div>

          <CenteredGrid>
            {favoriteActors
              .slice(0, 20)
              .map(
                (actor: {
                  name: string;
                  count: number;
                  details: PersonDto;
                  seenInMovies: SimpleItemDto[];
                  seenInShows: SimpleItemDto[];
                }) => (
                  <ActorCard
                    key={generateGuid()}
                    name={actor.name}
                    count={actor.count}
                    details={actor.details}
                    seenInMovies={actor.seenInMovies}
                    seenInShows={actor.seenInShows}
                  />
                )
              )}
          </CenteredGrid>
        </div>
      </Container>
    </PageContainer>
  );
}
