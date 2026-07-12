export type NavigationSection = "books" | "chapters";

export type NavigationSectionRequest = Readonly<{
  section: NavigationSection;
  id: number;
}>;
