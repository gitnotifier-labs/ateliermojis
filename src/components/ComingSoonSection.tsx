import { Badge } from "@/components/ui/badge";
import { Sparkles, Zap, RotateCw, Move } from "lucide-react";

const animations = [
  { icon: Zap, label: "Bounce", color: "text-slack-cyan" },
  { icon: RotateCw, label: "Spin", color: "text-slack-green" },
  { icon: Move, label: "Shake", color: "text-slack-yellow" },
  { icon: Sparkles, label: "Pulse", color: "text-slack-pink" },
];

export function ComingSoonSection() {
  return (
    <div className="mt-12 text-center">
      <div className="inline-flex items-center gap-2 mb-4">
        <h2 className="text-xl font-bold text-foreground">Animate your emoji</h2>
        <Badge className="bg-accent text-accent-foreground">Coming Soon</Badge>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        GIF support & animation styles are on the way ✨
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        {animations.map(({ icon: Icon, label, color }) => (
          <div
            key={label}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border bg-card/50 opacity-50 cursor-not-allowed"
          >
            <Icon className={`h-4 w-4 ${color}`} />
            <span className="text-sm font-semibold text-foreground">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
