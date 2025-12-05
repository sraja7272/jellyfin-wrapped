import { useQuery } from "@tanstack/react-query";
import { fetchStreaks } from "@/lib/backend-api";

export function useStreaks() {
  return useQuery({
    queryKey: ["streaks"],
    queryFn: fetchStreaks,
  });
}

