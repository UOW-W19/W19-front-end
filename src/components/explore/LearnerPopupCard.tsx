import { X, User, MessageCircle, MapPin, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import UserAvatar from '@/components/common/UserAvatar';
import type { NearbyLearner } from '@/types/meetup';
import { getVenueForLearner, type MockVenue } from '@/data/mockVenues';

interface LearnerPopupCardProps {
  learner: NearbyLearner;
  onClose: () => void;
  onViewProfile: () => void;
  onMessage: () => void;
  onSuggestVenue: (venue: MockVenue) => void;
}

export default function LearnerPopupCard({ learner, onClose, onViewProfile, onMessage, onSuggestVenue }: LearnerPopupCardProps) {
  const learningLanguages = learner.languages.filter((l) => l.isLearning);
  const suggestedVenue = getVenueForLearner(learner.id);

  return (
    <div className="animate-slide-up bg-card border border-border rounded-2xl shadow-lg p-4 max-h-[50vh] overflow-y-auto">
      <div className="flex items-start gap-3">
        <UserAvatar
          name={learner.displayName}
          avatarUrl={learner.avatarUrl}
          className="h-14 w-14 shrink-0"
          fallbackClassName="text-xl font-semibold"
        />
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate text-foreground">{learner.displayName}</p>
          {learner.distanceKm !== undefined && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
              <MapPin className="w-3 h-3" />
              <span>{learner.distanceKm < 1 ? `${Math.round(learner.distanceKm * 1000)}m away` : `${learner.distanceKm.toFixed(1)}km away`}</span>
            </div>
          )}
          {learningLanguages.length > 0 && (
            <div className="flex gap-1.5 mt-1.5 flex-wrap">
              {learningLanguages.map((language) => (
                <span
                  key={language.code}
                  className="inline-flex items-center gap-1 text-xs bg-muted rounded-full px-2 py-0.5"
                >
                  <span>{language.flagEmoji}</span>
                  <span className="text-muted-foreground">{language.name}</span>
                </span>
              ))}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 p-1.5 rounded-full hover:bg-muted text-muted-foreground transition-colors"
          aria-label="Close learner details"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex gap-2 mt-4">
        <Button className="flex-1 gap-2" onClick={onViewProfile}>
          <User className="w-4 h-4" />
          View Profile
        </Button>
        <Button variant="outline" className="flex-1 gap-2" onClick={onMessage}>
          <MessageCircle className="w-4 h-4" />
          Message
        </Button>
      </div>

      {/* Suggested venue */}
      <div className="mt-3 pt-3 border-t border-border">
        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-2">
          Suggested Meet
        </p>
        <button
          onClick={() => onSuggestVenue(suggestedVenue)}
          className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-muted hover:bg-muted/70 active:scale-[0.98] transition-all text-left"
        >
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <Plus className="w-4 h-4" />
          </div>
          <div className="w-12 h-12 rounded-lg bg-muted-foreground/10 flex items-center justify-center text-2xl shrink-0">
            {suggestedVenue.emoji}
          </div>
          <div className="min-w-0">
            <p className="font-medium text-foreground text-sm truncate">{suggestedVenue.name}</p>
            <p className="text-xs text-muted-foreground">{suggestedVenue.category}</p>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
              <MapPin className="w-3 h-3 shrink-0" />
              <span className="truncate">{suggestedVenue.address}</span>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}
