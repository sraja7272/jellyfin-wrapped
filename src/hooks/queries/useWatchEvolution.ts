import { useQuery } from "@tanstack/react-query";
import { fetchWatchEvolution } from "@/lib/backend-api";

export function useWatchEvolution() {
  return useQuery({
    queryKey: ["watchEvolution"],
    queryFn: fetchWatchEvolution,
  });
}

