import { MapPin, Calendar, Users } from 'lucide-react';
import type { Meetup } from '@/types/meetup';
import { format, parseISO } from 'date-fns';

interface MeetupCardProps {
  meetup: Meetup;
  onClick: () => void;
}

export default function MeetupCard({ meetup, onClick }: MeetupCardProps) {
  const spotsLeft = meetup.maxParticipants - meetup.participants.length;
  const isFull = spotsLeft === 0;

  const formattedDate = format(parseISO(meetup.date), 'EEE, MMM d');
  const formattedTime = meetup.time;

  return (
    <button
      onClick={onClick}
      className="w-full rounded-2xl border border-border bg-card p-4 text-left transition-all hover:shadow-soft active:scale-[0.98]"
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-foreground truncate">{meetup.title}</h3>
          <span className="text-sm">
            {meetup.languageFlag} {meetup.language}
          </span>
        </div>
        <span
          className={`ml-2 shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
            isFull
              ? 'bg-muted text-muted-foreground'
              : 'bg-primary/10 text-primary'
          }`}
        >
          {isFull ? 'Full' : `${spotsLeft} spots left`}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
        <span className="flex items-center gap-1">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{meetup.location}</span>
        </span>
        <span className="flex items-center gap-1">
          <Calendar className="h-3.5 w-3.5 shrink-0" />
          {formattedDate}, {formattedTime}
        </span>
        <span className="flex items-center gap-1">
          <Users className="h-3.5 w-3.5 shrink-0" />
          {meetup.participants.length}/{meetup.maxParticipants}
        </span>
      </div>
    </button>
  );
}
