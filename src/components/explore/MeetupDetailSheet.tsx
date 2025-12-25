import { useState } from 'react';
import { MapPin, Calendar, Clock, Users, User, LogOut, UserPlus } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import type { Meetup } from '@/types/meetup';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';

interface MeetupDetailSheetProps {
  meetup: Meetup | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onJoin: (id: string) => Promise<void>;
  onLeave: (id: string) => Promise<void>;
}

export default function MeetupDetailSheet({
  meetup,
  open,
  onOpenChange,
  onJoin,
  onLeave,
}: MeetupDetailSheetProps) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  if (!meetup) return null;

  const isHost = user?.id === meetup.hostId;
  const isParticipant = meetup.participants.some((p) => p.id === user?.id);
  const isFull = meetup.participants.length >= meetup.maxParticipants;
  const spotsLeft = meetup.maxParticipants - meetup.participants.length;

  const formattedDate = format(parseISO(meetup.date), 'EEEE, MMMM d, yyyy');

  const handleJoin = async () => {
    if (!user) {
      toast.error('Please log in to join meetups');
      return;
    }

    setIsLoading(true);
    try {
      await onJoin(meetup.id);
      toast.success('You joined the meetup!');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to join');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLeave = async () => {
    setIsLoading(true);
    try {
      await onLeave(meetup.id);
      toast.success('You left the meetup');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to leave');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl px-4 pb-8">
        <SheetHeader className="pb-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <span>{meetup.languageFlag}</span>
            <span>{meetup.language}</span>
          </div>
          <SheetTitle className="text-xl text-left">{meetup.title}</SheetTitle>
        </SheetHeader>

        <div className="overflow-y-auto h-[calc(100%-180px)] space-y-6">
          {/* Details */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                <Calendar className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">{formattedDate}</p>
                <p className="text-muted-foreground">Date</p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-sm">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                <Clock className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">{meetup.time}</p>
                <p className="text-muted-foreground">Time</p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-sm">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                <MapPin className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">{meetup.location}</p>
                <p className="text-muted-foreground">Location</p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-sm">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                <Users className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">
                  {meetup.participants.length} / {meetup.maxParticipants} participants
                </p>
                <p className="text-muted-foreground">
                  {isFull ? 'Meetup is full' : `${spotsLeft} spots available`}
                </p>
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <h3 className="font-semibold text-foreground mb-2">About</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {meetup.description}
            </p>
          </div>

          {/* Host */}
          <div>
            <h3 className="font-semibold text-foreground mb-3">Host</h3>
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={meetup.host.avatarUrl} />
                <AvatarFallback className="bg-gradient-to-br from-lavender to-accent text-accent-foreground">
                  {meetup.host.displayName[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-foreground">{meetup.host.displayName}</p>
                <p className="text-xs text-muted-foreground">Organizer</p>
              </div>
            </div>
          </div>

          {/* Participants */}
          {meetup.participants.length > 0 && (
            <div>
              <h3 className="font-semibold text-foreground mb-3">
                Participants ({meetup.participants.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {meetup.participants.map((participant) => (
                  <div
                    key={participant.id}
                    className="flex items-center gap-2 rounded-full bg-muted px-3 py-1.5"
                  >
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={participant.avatarUrl} />
                      <AvatarFallback className="text-xs bg-primary/20 text-primary">
                        {participant.displayName[0]}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-foreground">
                      {participant.displayName}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action Button */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-background border-t border-border">
          {isHost ? (
            <Button variant="secondary" className="w-full" disabled>
              <User className="h-4 w-4 mr-2" />
              You're hosting this meetup
            </Button>
          ) : isParticipant ? (
            <Button
              variant="outline"
              className="w-full"
              onClick={handleLeave}
              disabled={isLoading}
            >
              <LogOut className="h-4 w-4 mr-2" />
              {isLoading ? 'Leaving...' : 'Leave Meetup'}
            </Button>
          ) : (
            <Button
              className="w-full"
              onClick={handleJoin}
              disabled={isLoading || isFull}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              {isLoading ? 'Joining...' : isFull ? 'Meetup is Full' : 'Join Meetup'}
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
