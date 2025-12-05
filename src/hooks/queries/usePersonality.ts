import { useQuery } from "@tanstack/react-query";
import { fetchPersonality } from "@/lib/backend-api";

export function usePersonality() {
  return useQuery({
    queryKey: ["personality"],
    queryFn: fetchPersonality,
  });
}

