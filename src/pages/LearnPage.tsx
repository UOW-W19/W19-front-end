import { Flame, BookOpen, Trophy, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SavedWord } from "@/types";

const savedWords: SavedWord[] = [
  { word: "さくら", translation: "cherry blossom", language: "🇯🇵", mastery: 80 },
  { word: "mariposa", translation: "butterfly", language: "🇪🇸", mastery: 60 },
  { word: "bibliothèque", translation: "library", language: "🇫🇷", mastery: 40 },
  { word: "Schmetterling", translation: "butterfly", language: "🇩🇪", mastery: 20 },
];

const dailyGoals = [
  { label: "Words reviewed", current: 12, target: 20 },
  { label: "Posts read", current: 5, target: 10 },
  { label: "Practice time", current: 15, target: 30, unit: "min" },
];

export default function LearnPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      {/* Streak banner */}
      <div className="mb-6 rounded-2xl bg-gradient-to-r from-orange-500 to-red-500 p-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20">
              <Flame className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-bold">5 Day Streak!</p>
              <p className="text-sm opacity-90">You're on fire! Keep it up.</p>
            </div>
          </div>
          <Trophy className="h-8 w-8 opacity-80" />
        </div>
      </div>

      {/* Daily goals */}
      <section className="mb-8">
        <h2 className="mb-4 text-lg font-semibold text-foreground">Daily Goals</h2>
        <div className="space-y-3">
          {dailyGoals.map((goal) => (
            <div key={goal.label} className="rounded-xl border border-border bg-card p-4">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{goal.label}</span>
                <span className="font-medium text-foreground">
                  {goal.current}/{goal.target} {goal.unit || ""}
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-coral-light transition-all duration-500"
                  style={{ width: `${Math.min((goal.current / goal.target) * 100, 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Practice button */}
      <Button className="w-full mb-8 h-14 text-base gap-2 rounded-2xl shadow-glow">
        <Sparkles className="h-5 w-5" />
        Start Practice Session
        <ArrowRight className="h-5 w-5" />
      </Button>

      {/* Saved words */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Saved Words</h2>
          <button className="text-sm font-medium text-primary hover:underline">View all</button>
        </div>
        <div className="space-y-2">
          {savedWords.map((word, index) => (
            <div
              key={index}
              className="flex items-center justify-between rounded-xl border border-border bg-card p-4 transition-all hover:shadow-soft"
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">{word.language}</span>
                <div>
                  <p className="font-medium text-foreground">{word.word}</p>
                  <p className="text-sm text-muted-foreground">{word.translation}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-16 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-sage transition-all"
                    style={{ width: `${word.mastery}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground w-8">{word.mastery}%</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
