import { useState, useMemo } from "react";
import { useData } from "@/contexts/DataContext";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { ContentImage } from "@/components/ContentImage";
import { RankBadge } from "@/components/RankBadge";
import { formatWatchTime } from "@/lib/time-helpers";
import { SimpleItemDto } from "@/lib/queries";
import PageContainer from "@/components/PageContainer";
import { Container, Grid } from "@radix-ui/themes";
import { motion, AnimatePresence } from "framer-motion";
import { styled } from "@stitches/react";
import { Film, Tv, Sparkles } from "lucide-react";

type QuizState = "movie" | "show" | "complete";

export const TopTen = () => {
  const year = new Date().getFullYear();
  const { topTen, isLoading } = useData();
  const { data, error } = topTen;
  const [quizState, setQuizState] = useState<QuizState>("movie");
  const [selectedMovie, setSelectedMovie] = useState<string | null>(null);
  const [selectedShow, setSelectedShow] = useState<string | null>(null);

  // Get top movie and show (before early returns)
  const topMovie = data?.movies?.[0];
  const topShow = data?.shows?.[0];

  // Generate quiz options (before early returns)
  const movieOptions = useMemo(() => {
    if (!topMovie || !data?.movies || data.movies.length < 3) return [];
    const options = [topMovie, ...data.movies.slice(1, 3)];
    return options.sort(() => Math.random() - 0.5);
  }, [data?.movies, topMovie]);

  const showOptions = useMemo(() => {
    if (!topShow || !data?.shows || data.shows.length < 3) return [];
    const options = [topShow.item, ...data.shows.slice(1, 3).map((s) => s.item)];
    return options.sort(() => Math.random() - 0.5);
  }, [data?.shows, topShow]);

  if (isLoading) return <LoadingSpinner />;
  if (error) return <div>Error loading top ten</div>;
  if (!data) return null;

  const handleMovieSelect = (movieId: string) => {
    setSelectedMovie(movieId);
    setTimeout(() => {
      setQuizState("show");
    }, 500);
  };

  const handleShowSelect = (showId: string) => {
    setSelectedShow(showId);
    setTimeout(() => {
      setQuizState("complete");
    }, 500);
  };

  const skipQuiz = () => {
    setQuizState("complete");
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.06,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 24, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.6,
        ease: [0.16, 1, 0.3, 1],
      },
    },
  };

  return (
    <PageContainer>
      <Container size="4" p="4">
        <Grid gap="6">
          <AnimatePresence mode="wait">
            {quizState === "movie" && topMovie && movieOptions.length > 0 && (
              <QuizCard
                key="movie-quiz"
                data-quiz-card="true"
                as={motion.div}
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -40 }}
                transition={{ duration: 0.5 }}
              >
                <QuizTitle>Guess your #1 movie</QuizTitle>
                <QuizOptions>
                  {movieOptions.map((movie) => (
                    <QuizOption
                      key={movie.id}
                      onClick={() => movie.id && handleMovieSelect(movie.id)}
                      as={motion.button}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <ContentImage item={movie} />
                      <QuizOptionName>{movie.name}</QuizOptionName>
                    </QuizOption>
                  ))}
                </QuizOptions>
                <SkipButton onClick={skipQuiz}>Skip Quiz</SkipButton>
              </QuizCard>
            )}

            {quizState === "show" && topShow && showOptions.length > 0 && (
              <QuizCard
                key="show-quiz"
                data-quiz-card="true"
                as={motion.div}
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -40 }}
                transition={{ duration: 0.5 }}
              >
                <QuizTitle>Guess your #1 show</QuizTitle>
                <QuizOptions>
                  {showOptions.map((show) => (
                    <QuizOption
                      key={show.id}
                      onClick={() => show.id && handleShowSelect(show.id)}
                      as={motion.button}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <ContentImage item={show} />
                      <QuizOptionName>{show.name}</QuizOptionName>
                    </QuizOption>
                  ))}
                </QuizOptions>
                <SkipButton onClick={skipQuiz}>Skip Quiz</SkipButton>
              </QuizCard>
            )}

            {quizState === "complete" && (
              <motion.div
                key="top-ten"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                <HeaderSection
                  as={motion.div}
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                >
                  <HeaderBadge>
                    <BadgeIcon>
                      <Sparkles size={14} />
                    </BadgeIcon>
                    <span>Your Top Picks</span>
                  </HeaderBadge>
                  <PageTitle>Your Top 10 of {year}</PageTitle>
                  <PageSubtitle>
                    {data.movies.length > 0 && data.shows.length > 0
                      ? "The movies and shows that stole your heart this year ❤️"
                      : data.movies.length > 0
                      ? "The films that defined your cinematic year 🎬"
                      : "The shows that kept you coming back for more 📺"}
                  </PageSubtitle>
                </HeaderSection>

                {/* Quiz Results Message */}
                {(selectedMovie !== null || selectedShow !== null) && (
                  <QuizResultsMessage
                    as={motion.div}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.6 }}
                  >
                    {(() => {
                      const movieCorrect = topMovie && selectedMovie === topMovie.id;
                      const showCorrect = topShow && selectedShow === topShow.item.id;
                      const bothCorrect = movieCorrect && showCorrect;
                      const oneCorrect = movieCorrect || showCorrect;
                      const bothAnswered = selectedMovie !== null && selectedShow !== null;

                      if (bothCorrect && bothAnswered) {
                        return "🎉 Perfect! You guessed both correctly!";
                      } else if (oneCorrect && bothAnswered) {
                        return movieCorrect
                          ? "Nice! You got your #1 movie right! 🎬"
                          : "Nice! You got your #1 show right! 📺";
                      } else if (bothAnswered) {
                        return "Not quite, but here are your actual top watches!";
                      } else if (selectedMovie !== null) {
                        return movieCorrect
                          ? "🎉 Correct! That's your #1 movie!"
                          : "Not quite, but here's your actual #1 movie!";
                      } else if (selectedShow !== null) {
                        return showCorrect
                          ? "🎉 Correct! That's your #1 show!"
                          : "Not quite, but here's your actual #1 show!";
                      }
                      return null;
                    })()}
                  </QuizResultsMessage>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {quizState === "complete" && (
            <Grid columns={{ initial: "1", md: "2" }} gap="6">
            <SectionCard
              as={motion.div}
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              <CardAccent variant="movies" />
              <SectionHeader>
                <SectionIcon movie>
                  <Film size={20} />
                </SectionIcon>
                <SectionTitleWrapper>
                  <SectionTitle>Top Movies</SectionTitle>
                  <SectionSubtitle>Most watched films</SectionSubtitle>
                </SectionTitleWrapper>
              </SectionHeader>
              <ItemList>
                {data.movies.map((movie: SimpleItemDto & { completedWatches?: number }, index: number) => {
                  const isTopMovie = index === 0 && topMovie && movie.id === topMovie.id;
                  const wasGuessed = selectedMovie === movie.id;
                  const wasWrongGuess = wasGuessed && !isTopMovie;
                  return (
                    <RankItem
                      key={movie.id}
                      as={motion.div}
                      variants={itemVariants}
                      highlighted={isTopMovie && (selectedMovie !== null || selectedShow !== null)}
                      wasGuessed={wasWrongGuess}
                    >
                      <RankBadge rank={index + 1} />
                      <ItemPoster>
                        <ContentImage item={movie} />
                      </ItemPoster>
                      <ItemInfo>
                        <ItemTitle>
                          {movie.name}
                          {isTopMovie && (selectedMovie !== null || selectedShow !== null) && (
                            <TopBadge>Your #1</TopBadge>
                          )}
                          {wasWrongGuess && (
                            <GuessBadge>Your Guess</GuessBadge>
                          )}
                        </ItemTitle>
                        <ItemMeta>
                          <MetaHighlight>{movie.completedWatches ?? 1}x</MetaHighlight> watched • {formatWatchTime((movie.durationSeconds ?? 0) / 60)}
                        </ItemMeta>
                      </ItemInfo>
                    </RankItem>
                  );
                })}
              </ItemList>
            </SectionCard>

            <SectionCard
              as={motion.div}
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              <CardAccent variant="shows" />
              <SectionHeader>
                <SectionIcon>
                  <Tv size={20} />
                </SectionIcon>
                <SectionTitleWrapper>
                  <SectionTitle>Top Shows</SectionTitle>
                  <SectionSubtitle>Binge-worthy series</SectionSubtitle>
                </SectionTitleWrapper>
              </SectionHeader>
              <ItemList>
                {data.shows.map(
                  (
                    show: {
                      item: SimpleItemDto;
                      episodeCount: number;
                      playbackTime: number;
                    },
                    index: number
                  ) => {
                    const isTopShow = index === 0 && topShow && show.item.id === topShow.item.id;
                    const wasGuessed = selectedShow === show.item.id;
                    const wasWrongGuess = wasGuessed && !isTopShow;
                    return (
                      <RankItem
                        key={show.item.id}
                        as={motion.div}
                        variants={itemVariants}
                        highlighted={isTopShow && (selectedMovie !== null || selectedShow !== null)}
                        wasGuessed={wasWrongGuess}
                      >
                        <RankBadge rank={index + 1} />
                        <ItemPoster>
                          <ContentImage item={show.item} />
                        </ItemPoster>
                        <ItemInfo>
                          <ItemTitle>
                            {show.item.name}
                            {isTopShow && (selectedMovie !== null || selectedShow !== null) && (
                              <TopBadge>Your #1</TopBadge>
                            )}
                            {wasWrongGuess && (
                              <GuessBadge>Your Guess</GuessBadge>
                            )}
                          </ItemTitle>
                          <ItemMeta>
                            <MetaHighlight>{show.episodeCount}</MetaHighlight> episodes • {formatWatchTime(show.playbackTime / 60)}
                          </ItemMeta>
                        </ItemInfo>
                      </RankItem>
                    );
                  }
                )}
              </ItemList>
            </SectionCard>
          </Grid>
          )}
        </Grid>
      </Container>
    </PageContainer>
  );
};

const HeaderSection = styled("div", {
  textAlign: "center",
  marginBottom: "1.5rem",
  paddingTop: "3rem",
});

const HeaderBadge = styled("div", {
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
  marginBottom: "1.75rem",
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

const PageTitle = styled("h1", {
  fontSize: "clamp(2.25rem, 6vw, 4rem)",
  fontWeight: 800,
  marginBottom: "0.85rem",
  letterSpacing: "-0.04em",
  background: "linear-gradient(135deg, #f8fafc 0%, #00f0ff 50%, #a855f7 100%)",
  backgroundSize: "200% 200%",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  backgroundClip: "text",
  animation: "gradient-flow 8s ease infinite",
});

const PageSubtitle = styled("p", {
  fontSize: "1.15rem",
  color: "#94a3b8",
  fontWeight: 400,
});

const SectionCard = styled("div", {
  background: "rgba(18, 21, 28, 0.65)",
  backdropFilter: "blur(24px) saturate(180%)",
  border: "1px solid rgba(255, 255, 255, 0.03)",
  borderRadius: "28px",
  padding: "32px",
  position: "relative",
  overflow: "hidden",
});

const CardAccent = styled("div", {
  position: "absolute",
  top: 0,
  left: "50%",
  transform: "translateX(-50%)",
  width: "35%",
  height: "2px",
  background: "linear-gradient(90deg, transparent, #a855f7, transparent)",
  
  variants: {
    variant: {
      movies: {
        background: "linear-gradient(90deg, transparent, #00f0ff, transparent)",
      },
      shows: {
        background: "linear-gradient(90deg, transparent, #a855f7, transparent)",
      },
    },
  },
});

const SectionHeader = styled("div", {
  display: "flex",
  alignItems: "center",
  gap: "16px",
  marginBottom: "1.75rem",
});

const SectionIcon = styled("div", {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "52px",
  height: "52px",
  borderRadius: "16px",
  color: "#030304",
  
  background: "linear-gradient(135deg, #a855f7 0%, #c084fc 100%)",
  boxShadow: "0 6px 24px rgba(168, 85, 247, 0.35)",
  
  variants: {
    movie: {
      true: {
        background: "linear-gradient(135deg, #00f0ff 0%, #22d3ee 100%)",
        boxShadow: "0 6px 24px rgba(0, 240, 255, 0.35)",
      },
    },
  },
});

const SectionTitleWrapper = styled("div", {
  display: "flex",
  flexDirection: "column",
});

const SectionTitle = styled("h2", {
  fontSize: "1.6rem",
  fontWeight: 700,
  color: "#f8fafc",
  letterSpacing: "-0.02em",
  marginBottom: "2px",
});

const SectionSubtitle = styled("span", {
  fontSize: "0.85rem",
  color: "#475569",
  fontWeight: 500,
});

const ItemList = styled("div", {
  display: "flex",
  flexDirection: "column",
  gap: "10px",
});

const RankItem = styled("div", {
  display: "flex",
  alignItems: "center",
  gap: "16px",
  padding: "14px 18px",
  background: "rgba(255, 255, 255, 0.015)",
  border: "1px solid rgba(255, 255, 255, 0.02)",
  borderRadius: "16px",
  transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
  
  "&:hover": {
    background: "rgba(0, 240, 255, 0.04)",
    borderColor: "rgba(0, 240, 255, 0.12)",
    transform: "translateX(8px)",
    boxShadow: "-8px 0 32px rgba(0, 240, 255, 0.08)",
  },
  
  variants: {
    highlighted: {
      true: {
        background: "rgba(34, 197, 94, 0.1)",
        borderColor: "rgba(34, 197, 94, 0.3)",
        boxShadow: "0 0 20px rgba(34, 197, 94, 0.2)",
      },
    },
    wasGuessed: {
      true: {
        background: "rgba(239, 68, 68, 0.08)",
        borderColor: "rgba(239, 68, 68, 0.2)",
      },
    },
  },
});

const ItemPoster = styled("div", {
  width: "52px",
  height: "78px",
  borderRadius: "10px",
  overflow: "hidden",
  flexShrink: 0,
  border: "1px solid rgba(255, 255, 255, 0.05)",
  
  "& img": {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
});

const ItemInfo = styled("div", {
  flex: 1,
  minWidth: 0,
});

const ItemTitle = styled("h3", {
  fontSize: "1.05rem",
  fontWeight: 600,
  color: "#f8fafc",
  marginBottom: "5px",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  letterSpacing: "-0.01em",
  display: "flex",
  alignItems: "center",
  gap: "0.5rem",
});

const ItemMeta = styled("p", {
  fontSize: "0.85rem",
  color: "#64748b",
  fontFamily: "'JetBrains Mono', monospace",
});

const MetaHighlight = styled("span", {
  color: "#00f0ff",
  fontWeight: 600,
});

const QuizCard = styled("div", {
  background: "rgba(18, 21, 28, 0.65)",
  backdropFilter: "blur(24px) saturate(180%)",
  border: "1px solid rgba(255, 255, 255, 0.05)",
  borderRadius: "24px",
  padding: "3rem",
  textAlign: "center",
  marginTop: "2rem",
});

const QuizTitle = styled("h2", {
  fontSize: "2rem",
  fontWeight: 700,
  color: "#f8fafc",
  marginBottom: "2rem",
});

const QuizOptions = styled("div", {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
  gap: "1.5rem",
  marginBottom: "2rem",
});

const QuizOption = styled("button", {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "1rem",
  padding: "1.5rem",
  background: "rgba(255, 255, 255, 0.02)",
  border: "2px solid rgba(255, 255, 255, 0.05)",
  borderRadius: "16px",
  cursor: "pointer",
  transition: "all 0.3s ease",
  
  "&:hover": {
    background: "rgba(0, 240, 255, 0.1)",
    borderColor: "rgba(0, 240, 255, 0.3)",
    transform: "translateY(-4px)",
  },
  
  "& img": {
    width: "120px",
    height: "180px",
    objectFit: "cover",
    borderRadius: "8px",
  },
});

const QuizOptionName = styled("span", {
  fontSize: "1rem",
  fontWeight: 600,
  color: "#f8fafc",
});

const SkipButton = styled("button", {
  padding: "0.75rem 1.5rem",
  background: "transparent",
  border: "1px solid rgba(255, 255, 255, 0.1)",
  borderRadius: "8px",
  color: "#94a3b8",
  fontSize: "0.9rem",
  cursor: "pointer",
  transition: "all 0.3s ease",
  
  "&:hover": {
    borderColor: "rgba(255, 255, 255, 0.2)",
    color: "#f8fafc",
  },
});

const QuizResultsMessage = styled("div", {
  background: "rgba(0, 240, 255, 0.1)",
  border: "1px solid rgba(0, 240, 255, 0.2)",
  borderRadius: "16px",
  padding: "1.5rem 2rem",
  marginTop: "1.5rem",
  marginBottom: "1.5rem",
  textAlign: "center",
  fontSize: "1.25rem",
  fontWeight: 600,
  color: "#00f0ff",
});

const TopBadge = styled("span", {
  display: "inline-flex",
  alignItems: "center",
  padding: "0.25rem 0.75rem",
  background: "rgba(34, 197, 94, 0.2)",
  border: "1px solid rgba(34, 197, 94, 0.4)",
  borderRadius: "8px",
  fontSize: "0.75rem",
  fontWeight: 700,
  color: "#22c55e",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  marginLeft: "0.5rem",
});

const GuessBadge = styled("span", {
  display: "inline-flex",
  alignItems: "center",
  padding: "0.25rem 0.75rem",
  background: "rgba(239, 68, 68, 0.15)",
  border: "1px solid rgba(239, 68, 68, 0.3)",
  borderRadius: "8px",
  fontSize: "0.75rem",
  fontWeight: 700,
  color: "#ef4444",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  marginLeft: "0.5rem",
});
