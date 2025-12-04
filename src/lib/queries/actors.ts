import {
  fetchActors,
} from "../backend-api";
import { SimpleItemDto, PersonDto } from "./types";

export const listFavoriteActors = async (): Promise<
  {
    name: string;
    count: number;
    details: PersonDto;
    seenInMovies: SimpleItemDto[];
    seenInShows: SimpleItemDto[];
  }[]
> => {
  const actors = await fetchActors();
  return actors as unknown as {
    name: string;
    count: number;
    details: PersonDto;
    seenInMovies: SimpleItemDto[];
    seenInShows: SimpleItemDto[];
  }[];
};
