import { useState } from "react";
import { X, Users, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { UserProfile } from "@/types/api";

interface CreateGroupModalProps {
    candidates: UserProfile[];
    onClose: () => void;
    onCreated: (groupName: string, participantIds: string[]) => void;
    isLoading?: boolean;
}

export function CreateGroupModal({ candidates, onClose, onCreated, isLoading }: CreateGroupModalProps) {
    const [groupName, setGroupName] = useState("");
    const [selected, setSelected] = useState<Set<string>>(new Set());

    const toggle = (id: string) =>
        setSelected(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });

    const canSubmit = groupName.trim().length > 0 && selected.size >= 2;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!canSubmit) return;
        onCreated(groupName.trim(), Array.from(selected));
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
            onClick={onClose}
        >
            <div
                className="relative w-full max-w-md mx-4 bg-card rounded-2xl shadow-2xl"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                    <div className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-primary" />
                        <h3 className="font-semibold text-foreground">New Group</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-full text-muted-foreground hover:bg-muted transition-colors"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-5">
                    {/* Group name */}
                    <div>
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block">
                            Group Name
                        </label>
                        <input
                            type="text"
                            value={groupName}
                            onChange={e => setGroupName(e.target.value)}
                            placeholder="Enter group name..."
                            maxLength={60}
                            className="w-full rounded-xl border border-input bg-muted px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                    </div>

                    {/* Participant selection */}
                    <div>
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block">
                            Add Participants <span className="normal-case font-normal">(select at least 2)</span>
                        </label>
                        {candidates.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">
                                Start some conversations first to add participants.
                            </p>
                        ) : (
                            <div className="max-h-52 overflow-y-auto space-y-1 rounded-xl border border-border p-1">
                                {candidates.map(p => {
                                    const isSelected = selected.has(p.id);
                                    return (
                                        <button
                                            key={p.id}
                                            type="button"
                                            onClick={() => toggle(p.id)}
                                            className={`flex w-full items-center gap-3 px-3 py-2 rounded-lg transition-colors ${isSelected ? "bg-primary/10" : "hover:bg-muted"}`}
                                        >
                                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/60 text-xs font-semibold text-primary-foreground">
                                                {p.avatarUrl ? (
                                                    <img src={p.avatarUrl} alt={p.displayName} className="h-8 w-8 rounded-full object-cover" />
                                                ) : (
                                                    p.displayName?.[0] || '?'
                                                )}
                                            </div>
                                            <span className="flex-1 text-sm text-left text-foreground">{p.displayName}</span>
                                            {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                        {selected.size > 0 && (
                            <p className="text-xs text-muted-foreground mt-1.5">
                                {selected.size} participant{selected.size !== 1 ? 's' : ''} selected
                            </p>
                        )}
                    </div>

                    <Button type="submit" disabled={!canSubmit || isLoading} className="w-full rounded-xl">
                        {isLoading ? "Creating..." : "Create Group"}
                    </Button>
                </form>
            </div>
        </div>
    );
}
