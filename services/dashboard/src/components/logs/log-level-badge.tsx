import { Badge } from "@/components/ui/badge";
import { levelColor } from "@/lib/utils";

export function LogLevelBadge({ level }: { level: string }) {
  return <Badge className={levelColor(level)}>{level}</Badge>;
}
