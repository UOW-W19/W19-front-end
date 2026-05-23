import { MessageCircle, MapPin, User, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import UserAvatar from '@/components/common/UserAvatar';
import type { NearbyLearner } from '@/types/meetup';

interface LearnerPopupCardProps {
  learner: NearbyLearner;
  onClose: () => void;
  onViewProfile: () => void;
  onMessage: () => void;
}

export default function LearnerPopupCard({ learner, onClose, onViewProfile, onMessage }: LearnerPopupCardProps) {
  const learningLanguages = learner.languages.filter((language) => language.isLearning);

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
          <p className="font-semibold text-foreground truncate">{learner.displayName}</p>
          {learner.distanceKm !== undefined && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
              <MapPin className="h-3 w-3" />
              <span>
                {learner.distanceKm < 1
                  ? `${Math.round(learner.distanceKm * 1000)}m away`
                  : `${learner.distanceKm.toFixed(1)}km away`}
              </span>
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
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex gap-2 mt-4">
        <Button className="flex-1 gap-2" onClick={onViewProfile}>
          <User className="h-4 w-4" />
          View Profile
        </Button>
        <Button variant="outline" className="flex-1 gap-2" onClick={onMessage}>
          <MessageCircle className="h-4 w-4" />
          Message
        </Button>
      </div>
    </div>
  );
}
