import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
  name: string;
  avatarUrl?: string;
  className?: string;
  fallbackClassName?: string;
}

const initialsFor = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "U";

export function UserAvatar({
  name,
  avatarUrl,
  className,
  fallbackClassName,
}: UserAvatarProps) {
  return (
    <Avatar className={className}>
      {avatarUrl && (
        <AvatarImage
          src={avatarUrl}
          alt={name}
          className="object-cover"
        />
      )}
      <AvatarFallback
        className={cn(
          "bg-gradient-to-br from-coral to-coral/70 text-white",
          fallbackClassName
        )}
      >
        {initialsFor(name)}
      </AvatarFallback>
    </Avatar>
  );
}

export default UserAvatar;
