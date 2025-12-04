import {
  NameGuidPair,
} from "@jellyfin/sdk/lib/generated-client";

export interface PersonDto {
  Name?: string;
  Id?: string;
  Role?: string;
  Type?: string;
  PrimaryImageTag?: string;
  imageUrl?: string | null;
}

export type SimpleItemDto = {
  id?: string;
  parentId?: string | null;
  name?: string | null;
  date?: string | null;
  communityRating?: number | null;
  productionYear?: number | null;
  people?: PersonDto[] | null;
  genres?: string[] | null;
  genreItems?: NameGuidPair[] | null;
  durationSeconds?: number;
  imageUrl?: string | null;
};

export interface PunchCardData {
  dayOfWeek: number;
  hour: number;
  count: number;
}

export interface CalendarData {
  value: number;
  day: string;
}

export type UnfinishedShowDto = {
  item: SimpleItemDto;
  watchedEpisodes: number;
  totalEpisodes: number;
  lastWatchedDate: Date;
};
