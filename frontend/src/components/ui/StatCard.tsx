import StatsCard from "@/components/molecules/StatsCard";

interface StatCardProps {
  label: string;
  value: string | number;
  hint?: string;
}

export default function StatCard({ label, value, hint }: StatCardProps) {
  return <StatsCard title={label} value={value} description={hint} tint="mist" />;
}
