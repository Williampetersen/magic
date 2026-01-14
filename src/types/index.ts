export * from "./config.types";
export * from "./content.types";
export type Page = {
  path: string;
  label: string;
  title: string;
  description: string;
  image?: string;
};
