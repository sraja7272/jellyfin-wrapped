import { useQuery } from "@tanstack/react-query";
import { fetchDecades } from "@/lib/backend-api";

export function useDecades() {
  return useQuery({
    queryKey: ["decades"],
    queryFn: fetchDecades,
  });
}

