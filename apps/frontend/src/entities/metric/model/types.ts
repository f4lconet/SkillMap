export interface Metric {
  id: string;
  title: string;
  value: string;
  hint: string;
  tone?: "default" | "positive";
  /** Маршрут, на который ведёт карточка */
  href?: string;
}
