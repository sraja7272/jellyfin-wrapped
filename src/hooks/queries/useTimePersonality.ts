import { useQuery } from "@tanstack/react-query";
import { fetchTimePersonality } from "@/lib/backend-api";

export function useTimePersonality() {
  return useQuery({
    queryKey: ["timePersonality"],
    queryFn: fetchTimePersonality,
  });
}

