import { useData } from "@/contexts/DataContext";
import { useComparisons } from "@/hooks/queries/useComparisons";
import { useTopTen } from "@/hooks/queries/useTopTen";
import { LoadingSpinner } from "../LoadingSpinner";
import PageContainer from "../PageContainer";
import { Container } from "@radix-ui/themes";
import { motion, PanInfo } from "framer-motion";
import { styled } from "@stitches/react";
import { Sparkles, Clock, Film, Tv, ChevronLeft, ChevronRight, TrendingUp } from "lucide-react";
import { ShareCard } from "../ShareCard";
import { formatWatchTime } from "@/lib/time-helpers";
import { useMemo, useState, useRef, useEffect } from "react";

export default function SharePage() {
  const { movies, shows, isLoading } = useData();
  const { data: comparisons, isLoading: comparisonsLoading } = useComparisons();
  const { data: topTen, isLoading: topTenLoading } = useTopTen();
  const [currentIndex, setCurrentIndex] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [centerOffset, setCenterOffset] = useState(0);

  const totalWatchTime = useMemo(() => {
    if (isLoading || !movies.data || !shows.data) return 0;
    const movieTime = (movies.data as Array<{ totalWatchTimeSeconds?: number }>)
      .reduce((sum, movie) => sum + (movie.totalWatchTimeSeconds || 0), 0);
    const showTime = (shows.data as Array<{ playbackTime?: number }>)
      .reduce((sum, show) => sum + (show.playbackTime || 0), 0);
    return (movieTime + showTime) / 60;
  }, [movies.data, shows.data, isLoading]);

  const movieCount = useMemo(() => movies.data?.length || 0, [movies.data]);
  const showCount = useMemo(() => shows.data?.length || 0, [shows.data]);
  const totalEpisodes = useMemo(() => {
    if (!shows.data) return 0;
    return shows.data.reduce((sum, show) => sum + (show.episodeCount || 0), 0);
  }, [shows.data]);

  // Calculate derived values before early return
  const year = new Date().getFullYear();
  const topMovie = topTen?.movies?.[0];
  const topShow = topTen?.shows?.[0];
  const top3Movies = topTen?.movies?.slice(0, 3) || [];
  const top3Shows = topTen?.shows?.slice(0, 3) || [];

  // Build array of cards to display (before early return)
  const cards = useMemo(() => {
    const cardArray = [];
    if (totalWatchTime > 0) {
      cardArray.push({ type: "totalTime", key: "total-time" });
    }
    if (topMovie) {
      cardArray.push({ type: "topMovie", key: "top-movie" });
    }
    if (topShow) {
      cardArray.push({ type: "topShow", key: "top-show" });
    }
    if (top3Movies.length > 0) {
      cardArray.push({ type: "top3Movies", key: "top-3-movies" });
    }
    if (top3Shows.length > 0) {
      cardArray.push({ type: "top3Shows", key: "top-3-shows" });
    }
    if (movieCount > 0 || showCount > 0) {
      cardArray.push({ type: "stats", key: "stats" });
    }
    return cardArray;
  }, [totalWatchTime, topMovie, topShow, top3Movies.length, top3Shows.length, movieCount, showCount]);

  // Calculate center offset after cards is defined
  useEffect(() => {
    const calculateOffset = () => {
      if (wrapperRef.current && cards.length > 0) {
        const wrapperWidth = wrapperRef.current.offsetWidth;
        const cardWidth = 400;
        const gap = 32; // 2rem gap between cards
        
        // Center the first card - this ensures it's fully visible at index 0
        const firstCardOffset = (wrapperWidth - cardWidth) / 2;
        
        // Verify the last card will be fully visible
        // Position of last card: firstCardOffset - (cards.length - 1) * (cardWidth + gap)
        const lastCardX = firstCardOffset - (cards.length - 1) * (cardWidth + gap);
        const lastCardRightEdge = lastCardX + cardWidth;
        
        // If last card would extend beyond the wrapper, adjust the offset
        // We want the last card's right edge to be at most at wrapperWidth
        if (lastCardRightEdge > wrapperWidth) {
          // Adjust so last card is fully visible
          const adjustment = lastCardRightEdge - wrapperWidth;
          setCenterOffset(firstCardOffset - adjustment);
        } else {
          setCenterOffset(firstCardOffset);
        }
      }
    };

    // Use requestAnimationFrame to ensure DOM is fully rendered
    const rafId = requestAnimationFrame(() => {
      calculateOffset();
    });
    window.addEventListener("resize", calculateOffset);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", calculateOffset);
    };
  }, [cards.length]); // Recalculate when number of cards changes

  if (isLoading || comparisonsLoading || topTenLoading) {
    return <LoadingSpinner />;
  }

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = 50;
    if (info.offset.x > threshold && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    } else if (info.offset.x < -threshold && currentIndex < cards.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const goToNext = () => {
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

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
            <span>Share Your Wrapped</span>
          </Badge>
          <Title>Shareable Cards</Title>
          <Subtitle>Download and share your Jellyfin Wrapped highlights</Subtitle>
        </HeaderSection>

        <CarouselSection>
          <CarouselContainer>
            <CarouselWrapper ref={wrapperRef}>
              <CarouselTrack
                as={motion.div}
                drag="x"
                dragConstraints={centerOffset > 0 ? { 
                  left: centerOffset - (cards.length - 1) * 432, // 400px card + 32px gap
                  right: centerOffset 
                } : undefined}
                dragElastic={0.1}
                onDragEnd={handleDragEnd}
                animate={{ 
                  x: cards.length > 0 && centerOffset > 0 ? centerOffset - currentIndex * 432 : 0 
                }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                initial={false}
                style={{ willChange: "transform" }}
              >
                {/* Total Time Card */}
                {totalWatchTime > 0 && (
                  <CardSlide>
                    <ShareCard title="Total Watch Time" filename={`jellyfin-wrapped-${year}-total-time.png`}>
                      <TotalTimeCardContent>
                        <CardTitle>My Jellyfin Wrapped {year}</CardTitle>
                        <TimeDisplay>
                          <TimeValue>{formatWatchTime(totalWatchTime)}</TimeValue>
                          <TimeLabel>Total Watch Time</TimeLabel>
                        </TimeDisplay>
                        {comparisons && comparisons.comparisons.length > 0 && (
                          <ComparisonText>
                            {comparisons.comparisons[0].label} {comparisons.comparisons[0].value} {comparisons.comparisons[0].unit}
                          </ComparisonText>
                        )}
                      </TotalTimeCardContent>
                    </ShareCard>
                  </CardSlide>
                )}

                {/* Top Movie Card */}
                {topMovie && (
                  <CardSlide>
                    <ShareCard title="Top Movie" filename={`jellyfin-wrapped-${year}-top-movie.png`}>
                      <TopItemCardContent>
                        <CardTitle>My Jellyfin Wrapped {year}</CardTitle>
                        <ItemLabel>#1 Movie</ItemLabel>
                        <ItemImage>
                          {topMovie.imageUrl ? (
                            <img src={topMovie.imageUrl} alt={topMovie.name || ""} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          ) : (
                            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, rgba(0, 240, 255, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%)", color: "#00f0ff", fontSize: "4rem", fontWeight: 700 }}>
                              {topMovie.name?.[0] || "?"}
                            </div>
                          )}
                        </ItemImage>
                        <ItemName>{topMovie.name}</ItemName>
                        {topMovie.completedWatches && (
                          <ItemMeta>Watched {topMovie.completedWatches}x</ItemMeta>
                        )}
                      </TopItemCardContent>
                    </ShareCard>
                  </CardSlide>
                )}

                {/* Top Show Card */}
                {topShow && (
                  <CardSlide>
                    <ShareCard title="Top Show" filename={`jellyfin-wrapped-${year}-top-show.png`}>
                      <TopItemCardContent>
                        <CardTitle>My Jellyfin Wrapped {year}</CardTitle>
                        <ItemLabel>#1 Show</ItemLabel>
                        <ItemImage>
                          {topShow.item.imageUrl ? (
                            <img src={topShow.item.imageUrl} alt={topShow.item.name || ""} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          ) : (
                            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, rgba(0, 240, 255, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%)", color: "#00f0ff", fontSize: "4rem", fontWeight: 700 }}>
                              {topShow.item.name?.[0] || "?"}
                            </div>
                          )}
                        </ItemImage>
                        <ItemName>{topShow.item.name}</ItemName>
                        <ItemMeta>{topShow.episodeCount} episodes watched</ItemMeta>
                      </TopItemCardContent>
                    </ShareCard>
                  </CardSlide>
                )}

                {/* Top 3 Movies Card */}
                {top3Movies.length > 0 && (
                  <CardSlide>
                    <ShareCard title="Top 3 Movies" filename={`jellyfin-wrapped-${year}-top-3-movies.png`}>
                      <Top3CardContent>
                        <CardTitle>My Jellyfin Wrapped {year}</CardTitle>
                        <ItemLabel>Top 3 Movies</ItemLabel>
                        <Top3Grid>
                          {top3Movies.map((movie, index) => (
                            <Top3Item key={movie.id}>
                              <Top3Rank>#{index + 1}</Top3Rank>
                              <Top3Image>
                                {movie.imageUrl ? (
                                  <img src={movie.imageUrl} alt={movie.name || ""} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                ) : (
                                  <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, rgba(0, 240, 255, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%)", color: "#00f0ff", fontSize: "2rem", fontWeight: 700 }}>
                                    {movie.name?.[0] || "?"}
                                  </div>
                                )}
                              </Top3Image>
                              <Top3Name>{movie.name}</Top3Name>
                              {movie.completedWatches && (
                                <Top3Meta>{movie.completedWatches}x</Top3Meta>
                              )}
                            </Top3Item>
                          ))}
                        </Top3Grid>
                      </Top3CardContent>
                    </ShareCard>
                  </CardSlide>
                )}

                {/* Top 3 Shows Card */}
                {top3Shows.length > 0 && (
                  <CardSlide>
                    <ShareCard title="Top 3 Shows" filename={`jellyfin-wrapped-${year}-top-3-shows.png`}>
                      <Top3CardContent>
                        <CardTitle>My Jellyfin Wrapped {year}</CardTitle>
                        <ItemLabel>Top 3 Shows</ItemLabel>
                        <Top3Grid>
                          {top3Shows.map((show, index) => (
                            <Top3Item key={show.item.id}>
                              <Top3Rank>#{index + 1}</Top3Rank>
                              <Top3Image>
                                {show.item.imageUrl ? (
                                  <img src={show.item.imageUrl} alt={show.item.name || ""} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                ) : (
                                  <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, rgba(0, 240, 255, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%)", color: "#00f0ff", fontSize: "2rem", fontWeight: 700 }}>
                                    {show.item.name?.[0] || "?"}
                                  </div>
                                )}
                              </Top3Image>
                              <Top3Name>{show.item.name}</Top3Name>
                              <Top3Meta>{show.episodeCount} episodes</Top3Meta>
                            </Top3Item>
                          ))}
                        </Top3Grid>
                      </Top3CardContent>
                    </ShareCard>
                  </CardSlide>
                )}

                {/* Stats Card */}
                {(movieCount > 0 || showCount > 0) && (
                  <CardSlide>
                    <ShareCard title="Your Stats" filename={`jellyfin-wrapped-${year}-stats.png`}>
                      <StatsCardContent>
                        <CardTitle>My Jellyfin Wrapped {year}</CardTitle>
                        <ItemLabel>Your Viewing Stats</ItemLabel>
                        <StatsGrid>
                          <StatItem>
                            <StatIcon>
                              <Film size={32} />
                            </StatIcon>
                            <StatValue>{movieCount}</StatValue>
                            <StatLabel>Movies Watched</StatLabel>
                          </StatItem>
                          <StatItem>
                            <StatIcon>
                              <Tv size={32} />
                            </StatIcon>
                            <StatValue>{showCount}</StatValue>
                            <StatLabel>Shows Watched</StatLabel>
                          </StatItem>
                          <StatItem>
                            <StatIcon>
                              <TrendingUp size={32} />
                            </StatIcon>
                            <StatValue>{totalEpisodes}</StatValue>
                            <StatLabel>Episodes Watched</StatLabel>
                          </StatItem>
                          <StatItem>
                            <StatIcon>
                              <Clock size={32} />
                            </StatIcon>
                            <StatValueSmall>{formatWatchTime(totalWatchTime)}</StatValueSmall>
                            <StatLabel>Total Watch Time</StatLabel>
                          </StatItem>
                        </StatsGrid>
                      </StatsCardContent>
                    </ShareCard>
                  </CardSlide>
                )}
              </CarouselTrack>
            </CarouselWrapper>

            {/* Dots Indicator */}
            {cards.length > 1 && (
              <DotsContainer>
                {cards.map((_, index) => (
                  <Dot
                    key={index}
                    active={index === currentIndex}
                    onClick={() => setCurrentIndex(index)}
                  />
                ))}
              </DotsContainer>
            )}
          </CarouselContainer>

          {/* Navigation Buttons - Outside Container */}
          {cards.length > 1 && (
            <>
              <NavButton
                onClick={goToPrevious}
                disabled={currentIndex === 0}
                style={{ left: "0" }}
              >
                <ChevronLeft size={24} />
              </NavButton>
              <NavButton
                onClick={goToNext}
                disabled={currentIndex === cards.length - 1}
                style={{ right: "0" }}
              >
                <ChevronRight size={24} />
              </NavButton>
            </>
          )}
        </CarouselSection>
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

const TotalTimeCardContent = styled("div", {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center",
  width: "100%",
  height: "100%",
  gap: "2rem",
  padding: "2rem 0",
});

const CardTitle = styled("h2", {
  fontSize: "1.1rem",
  fontWeight: 600,
  color: "#94a3b8",
  textTransform: "uppercase",
  letterSpacing: "0.15em",
  marginBottom: "0.5rem",
});

const TimeDisplay = styled("div", {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "1rem",
  background: "transparent", // Ensure no background on container
  backgroundColor: "transparent",
});

const TimeValue = styled("div", {
  fontSize: "2.5rem",
  fontWeight: 900,
  fontFamily: "'Inter', -apple-system, sans-serif",
  background: "linear-gradient(135deg, #00f0ff 0%, #a855f7 50%, #f59e0b 100%)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  backgroundClip: "text",
  lineHeight: 1.2,
  letterSpacing: "-0.02em",
});

const TimeLabel = styled("div", {
  fontSize: "1.75rem",
  fontWeight: 700,
  color: "#f8fafc",
  letterSpacing: "-0.01em",
});

const ComparisonText = styled("div", {
  fontSize: "1.1rem",
  color: "#94a3b8",
  fontStyle: "italic",
  fontWeight: 500,
});

const TopItemCardContent = styled("div", {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center",
  width: "100%",
  height: "100%",
  gap: "1.75rem",
  padding: "2rem 0",
});

const ItemLabel = styled("div", {
  fontSize: "0.9rem",
  fontWeight: 600,
  color: "#94a3b8",
  textTransform: "uppercase",
  letterSpacing: "0.2em",
});

const ItemImage = styled("div", {
  width: "220px",
  height: "330px",
  borderRadius: "20px",
  overflow: "hidden",
  border: "3px solid rgba(0, 240, 255, 0.3)",
  boxShadow: "0 20px 60px rgba(0, 240, 255, 0.2)",
});

const ItemName = styled("div", {
  fontSize: "2rem",
  fontWeight: 800,
  color: "#f8fafc",
  lineHeight: 1.2,
  letterSpacing: "-0.02em",
  maxWidth: "90%",
});

const ItemMeta = styled("div", {
  fontSize: "1rem",
  color: "#94a3b8",
  fontWeight: 600,
  fontFamily: "'Inter', sans-serif",
});

const Top3CardContent = styled("div", {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center",
  width: "100%",
  height: "100%",
  gap: "1.75rem",
  padding: "2rem 0",
});

const Top3Grid = styled("div", {
  display: "flex",
  flexDirection: "column",
  gap: "1.25rem",
  width: "100%",
});

const Top3Item = styled("div", {
  display: "flex",
  alignItems: "center",
  gap: "1rem",
  width: "100%",
  padding: "0.75rem",
  background: "rgba(255, 255, 255, 0.05)",
  borderRadius: "16px",
  border: "1px solid rgba(255, 255, 255, 0.1)",
});

const Top3Rank = styled("div", {
  fontSize: "1.25rem",
  fontWeight: 900,
  color: "#00f0ff",
  fontFamily: "'Inter', sans-serif",
  minWidth: "35px",
  textAlign: "center",
});

const Top3Image = styled("div", {
  width: "70px",
  height: "105px",
  borderRadius: "12px",
  overflow: "hidden",
  border: "2px solid rgba(0, 240, 255, 0.3)",
  flexShrink: 0,
  boxShadow: "0 4px 12px rgba(0, 240, 255, 0.2)",
});

const Top3Name = styled("div", {
  fontSize: "1.1rem",
  fontWeight: 700,
  color: "#f8fafc",
  flex: 1,
  textAlign: "left",
  lineHeight: 1.3,
  letterSpacing: "-0.01em",
});

const Top3Meta = styled("div", {
  fontSize: "0.9rem",
  color: "#94a3b8",
  fontFamily: "'Inter', sans-serif",
  fontWeight: 600,
});

const StatsCardContent = styled("div", {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center",
  width: "100%",
  height: "100%",
  gap: "2rem",
  padding: "2rem 0",
});

const StatsGrid = styled("div", {
  display: "grid",
  gridTemplateColumns: "repeat(2, 1fr)",
  gap: "1.5rem",
  width: "100%",
});

const StatItem = styled("div", {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  padding: "1.25rem",
  background: "rgba(255, 255, 255, 0.05)",
  borderRadius: "16px",
  border: "1px solid rgba(255, 255, 255, 0.1)",
  minHeight: "180px", // Ensure consistent height for alignment
  justifyContent: "space-between", // Distribute space evenly
});

const StatIcon = styled("div", {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "56px",
  height: "56px",
  borderRadius: "14px",
  background: "linear-gradient(135deg, #00f0ff 0%, #a855f7 100%)",
  color: "#030304",
  boxShadow: "0 4px 16px rgba(0, 240, 255, 0.3)",
  flexShrink: 0, // Prevent icon from shrinking
  marginBottom: "0.75rem", // Space after icon
});

const StatValue = styled("div", {
  fontSize: "1.75rem",
  fontWeight: 900,
  color: "#f8fafc",
  fontFamily: "'Inter', sans-serif",
  lineHeight: 1.2,
  letterSpacing: "-0.02em",
  minHeight: "3.5rem", // Fixed height to accommodate multi-line values
  maxHeight: "3.5rem", // Fixed height to accommodate multi-line values
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center",
  marginBottom: "0.75rem", // Space before label
  flex: 1, // Take available space
});

const StatValueSmall = styled("div", {
  fontSize: "1rem", // Smaller font size for total watch time
  fontWeight: 900,
  color: "#f8fafc",
  fontFamily: "'Inter', sans-serif",
  lineHeight: 1.3,
  letterSpacing: "-0.02em",
  minHeight: "3.5rem", // Match StatValue height for alignment
  maxHeight: "3.5rem", // Match StatValue height for alignment
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center",
  marginBottom: "0.75rem", // Space before label
  flex: 1, // Take available space
});

const StatLabel = styled("div", {
  fontSize: "0.8rem",
  color: "#94a3b8",
  textTransform: "uppercase",
  letterSpacing: "0.1em",
  textAlign: "center",
  fontWeight: 600,
  height: "1.2rem", // Fixed height for consistent alignment
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0, // Prevent label from shrinking
});

const CarouselSection = styled("div", {
  position: "relative",
  width: "100%",
  marginBottom: "3rem",
  paddingLeft: "80px", // Space for left button (48px + 32px margin)
  paddingRight: "80px", // Space for right button (48px + 32px margin)
});

const CarouselContainer = styled("div", {
  width: "100%",
  overflow: "hidden",
  position: "relative",
  paddingLeft: "0",
  paddingRight: "0",
});

const CarouselWrapper = styled("div", {
  width: "100%",
  overflow: "hidden",
  position: "relative",
  display: "flex",
});

const CarouselTrack = styled("div", {
  display: "flex",
  gap: "2rem",
  cursor: "grab",
  userSelect: "none",
  
  "&:active": {
    cursor: "grabbing",
  },
});

const CardSlide = styled("div", {
  flexShrink: 0,
  width: "400px",
  display: "flex",
  justifyContent: "center",
});

const NavButton = styled("button", {
  position: "absolute",
  top: "calc(350px + 1rem)", // Center on card (700px / 2) + some spacing
  transform: "translateY(-50%)",
  width: "48px",
  height: "48px",
  borderRadius: "50%",
  background: "rgba(0, 240, 255, 0.1)",
  border: "1px solid rgba(0, 240, 255, 0.2)",
  color: "#00f0ff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  transition: "all 0.3s ease",
  zIndex: 10,
  
  "&:hover:not(:disabled)": {
    background: "rgba(0, 240, 255, 0.2)",
    transform: "translateY(-50%) scale(1.1)",
  },
  
  "&:disabled": {
    opacity: 0.3,
    cursor: "not-allowed",
  },
});

const DotsContainer = styled("div", {
  display: "flex",
  gap: "0.75rem",
  justifyContent: "center",
  marginTop: "2rem",
});

const Dot = styled("button", {
  width: "12px",
  height: "12px",
  borderRadius: "50%",
  border: "none",
  background: "rgba(255, 255, 255, 0.2)",
  cursor: "pointer",
  transition: "all 0.3s ease",
  
  variants: {
    active: {
      true: {
        background: "#00f0ff",
        width: "32px",
        borderRadius: "6px",
      },
    },
  },
});

