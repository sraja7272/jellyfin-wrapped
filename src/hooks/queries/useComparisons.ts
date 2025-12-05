import { useQuery } from "@tanstack/react-query";
import { fetchComparisons } from "@/lib/backend-api";

export function useComparisons() {
  return useQuery({
    queryKey: ["comparisons"],
    queryFn: fetchComparisons,
  });
}

