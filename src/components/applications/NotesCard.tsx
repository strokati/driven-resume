'use client';

import { useState, useTransition } from 'react';
import { Plus, Pencil, Trash2, X, Check, StickyNote } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  createApplicationNote,
  updateApplicationNote,
  deleteApplicationNote,
} from '@/server/actions/applications';
import { NOTE_MAX_LENGTH } from '@/lib/validations/applications';
import type { ApplicationDetail } from '@/types/applications';

type Note = ApplicationDetail['notes'][number];

function formatRelative(d: Date | string): string {
  return new Date(d).toLocaleString();
}

function isEdited(note: Note): boolean {
  return new Date(note.updatedAt).getTime() > new Date(note.createdAt).getTime() + 1000;
}

export function NotesCard({ applicationId, notes }: { applicationId: string; notes: Note[] }) {
  const [isPending, startTransition] = useTransition();
  const [draft, setDraft] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');

  const draftRemaining = NOTE_MAX_LENGTH - draft.length;
  const draftInvalid = draft.trim().length === 0 || draft.length > NOTE_MAX_LENGTH;

  function handleAdd() {
    if (draftInvalid) return;
    const content = draft.trim();
    startTransition(async () => {
      try {
        await createApplicationNote(applicationId, content);
        setDraft('');
        toast.success('Note added');
      } catch {
        toast.error('Failed to add note');
      }
    });
  }

  function startEdit(note: Note) {
    setEditingId(note.id);
    setEditingContent(note.content);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingContent('');
  }

  function saveEdit(id: string) {
    const trimmed = editingContent.trim();
    if (!trimmed || trimmed.length > NOTE_MAX_LENGTH) return;
    startTransition(async () => {
      try {
        await updateApplicationNote(id, trimmed);
        setEditingId(null);
        setEditingContent('');
        toast.success('Note updated');
      } catch {
        toast.error('Failed to update note');
      }
    });
  }

  function handleDelete(id: string) {
    if (!window.confirm('Delete this note?')) return;
    startTransition(async () => {
      try {
        await deleteApplicationNote(id);
        toast.success('Note deleted');
      } catch {
        toast.error('Failed to delete note');
      }
    });
  }

  return (
    <Card>
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Notes
          </h3>
          <span className="text-xs text-muted-foreground">{notes.length}</span>
        </div>

        {notes.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No notes yet. Add the first one below.
          </p>
        ) : (
          <ul className="space-y-2">
            {notes.map((note) => (
              <li
                key={note.id}
                className="group rounded-md border p-3 hover:bg-muted/30 transition-colors"
              >
                {editingId === note.id ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editingContent}
                      onChange={(e) => setEditingContent(e.target.value)}
                      rows={3}
                      autoFocus
                      maxLength={NOTE_MAX_LENGTH}
                      className="text-sm"
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {NOTE_MAX_LENGTH - editingContent.length} remaining
                      </span>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={cancelEdit} disabled={isPending}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => saveEdit(note.id)}
                          disabled={
                            isPending ||
                            editingContent.trim().length === 0 ||
                            editingContent.length > NOTE_MAX_LENGTH
                          }
                        >
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2">
                    <StickyNote className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm whitespace-pre-wrap break-words">{note.content}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatRelative(note.createdAt)}
                        {isEdited(note) && <span className="ml-1 italic">(edited)</span>}
                      </p>
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5 shrink-0">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={() => startEdit(note)}
                        disabled={isPending}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={() => handleDelete(note.id)}
                        disabled={isPending}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        <div className="space-y-2">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Add a note…"
            rows={2}
            maxLength={NOTE_MAX_LENGTH}
            className="text-sm"
          />
          <div className="flex items-center justify-between">
            <span
              className={`text-xs ${draftRemaining < 0 ? 'text-destructive' : 'text-muted-foreground'}`}
            >
              {draftRemaining} remaining
            </span>
            <Button size="sm" onClick={handleAdd} disabled={isPending || draftInvalid}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add note
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
