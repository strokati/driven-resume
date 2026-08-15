'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileText,
  Mail,
  MapPin,
  Globe,
  Banknote,
  Trash2,
  Send,
  User,
  Phone,
  Link2,
  Pencil,
  X,
  Check,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { formatSalary } from '@/lib/utils/currency';
import {
  createApplicationNote,
  updateApplicationNote,
  deleteApplicationNote,
} from '@/server/actions/applications';
import { NOTE_MAX_LENGTH } from '@/lib/validations/applications';
import type { TrackerRow } from '@/server/queries/tracker';

const statusColors: Record<string, string> = {
  saved: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  planned: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  applied: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  screening: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  interview: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  offer: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  on_hold: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
};

const statusLabels: Record<string, string> = {
  saved: 'Saved',
  planned: 'Planned',
  applied: 'Applied',
  screening: 'Screening',
  interview: 'Interview',
  offer: 'Offer',
  rejected: 'Rejected',
  on_hold: 'On Hold',
};

const docStatusStyles: Record<string, string> = {
  ready: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  draft: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  none: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
};

const toneLabels: Record<string, string> = {
  professional: 'Professional',
  confident: 'Confident & Direct',
  warm: 'Warm & Narrative',
};

export function TrackerRowDetailPanel({
  row,
  onClose,
}: {
  row: TrackerRow | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [tab, setTab] = useState('documents');
  const [noteText, setNoteText] = useState('');
  const [isPending, startTransition] = useTransition();
  const [localNotes, setLocalNotes] = useState(row?.notes ?? []);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');

  // Sync local notes when row changes
  if (row && localNotes !== row.notes) {
    setLocalNotes(row.notes);
  }

  const open = row !== null;
  const noteRemaining = NOTE_MAX_LENGTH - noteText.length;
  const noteInvalid = noteText.trim().length === 0 || noteText.length > NOTE_MAX_LENGTH;

  function handleAddNote() {
    if (!row || noteInvalid) return;
    const content = noteText.trim();
    startTransition(async () => {
      try {
        const id = await createApplicationNote(row.id, content);
        const newNote = {
          id,
          content,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        setLocalNotes((prev) => [newNote, ...prev]);
        setNoteText('');
      } catch {
        // toast handled globally if at all
      }
    });
  }

  function startEditNote(id: string, content: string) {
    setEditingNoteId(id);
    setEditingContent(content);
  }

  function cancelEditNote() {
    setEditingNoteId(null);
    setEditingContent('');
  }

  function saveEditNote(id: string) {
    const trimmed = editingContent.trim();
    if (!trimmed || trimmed.length > NOTE_MAX_LENGTH) return;
    startTransition(async () => {
      try {
        await updateApplicationNote(id, trimmed);
        setLocalNotes((prev) =>
          prev.map((n) => (n.id === id ? { ...n, content: trimmed, updatedAt: new Date() } : n))
        );
        setEditingNoteId(null);
        setEditingContent('');
      } catch {
        /* noop */
      }
    });
  }

  function handleDeleteNote(id: string) {
    if (!window.confirm('Delete this note?')) return;
    startTransition(async () => {
      try {
        await deleteApplicationNote(id);
        setLocalNotes((prev) => prev.filter((n) => n.id !== id));
      } catch {
        /* noop */
      }
    });
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        {row && (
          <>
            <SheetHeader>
              <SheetTitle>
                <span className="text-muted-foreground font-normal mr-1.5">
                  #{row.serialNumber}
                </span>
                {row.jobTitle}
              </SheetTitle>
              <SheetDescription>{row.companyName}</SheetDescription>
              <div className="flex items-center gap-2 mt-1">
                <Badge
                  className={cn(
                    'text-[0.65rem] border-0',
                    statusColors[row.status] ?? statusColors.saved
                  )}
                >
                  {statusLabels[row.status] ?? row.status}
                </Badge>
              </div>
            </SheetHeader>

            <Tabs value={tab} onValueChange={setTab} className="flex-1 px-4">
              <TabsList className="w-full">
                <TabsTrigger value="documents" className="flex-1">
                  Documents
                </TabsTrigger>
                <TabsTrigger value="vacancy" className="flex-1">
                  Vacancy
                </TabsTrigger>
                <TabsTrigger value="notes" className="flex-1">
                  Notes
                </TabsTrigger>
              </TabsList>

              <TabsContent value="documents" className="space-y-3 mt-4">
                <Card>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-sm">Resume</span>
                      </div>
                      <Badge
                        className={cn('text-[0.6rem] border-0', docStatusStyles[row.resumeStatus])}
                      >
                        {row.resumeStatus === 'ready'
                          ? 'Ready'
                          : row.resumeStatus === 'draft'
                            ? 'Draft'
                            : 'None'}
                      </Badge>
                    </div>
                    {row.resumeAtsScore != null && (
                      <div className="text-sm text-muted-foreground">
                        ATS Score: <span className="font-medium">{row.resumeAtsScore}/100</span>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => router.push(`/applications/${row.id}/resume`)}
                      >
                        Open Editor
                      </Button>
                      {row.resumeStatus !== 'none' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => router.push(`/api/export?draftId=${row.id}&format=pdf`)}
                        >
                          Export
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-sm">Cover Letter</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {row.coverLetterTone && (
                          <Badge variant="outline" className="text-[0.6rem]">
                            {toneLabels[row.coverLetterTone] ?? row.coverLetterTone}
                          </Badge>
                        )}
                        <Badge
                          className={cn(
                            'text-[0.6rem] border-0',
                            docStatusStyles[row.coverLetterStatus]
                          )}
                        >
                          {row.coverLetterStatus === 'ready'
                            ? 'Ready'
                            : row.coverLetterStatus === 'draft'
                              ? 'Draft'
                              : 'None'}
                        </Badge>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => router.push(`/applications/${row.id}/cover-letter`)}
                    >
                      Open Editor
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="vacancy" className="space-y-3 mt-4">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{row.location || 'No location specified'}</span>
                  </div>
                  {row.locationType && (
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <span>{row.locationType}</span>
                    </div>
                  )}
                  {(row.salaryMin != null ||
                    row.salaryMax != null ||
                    row.proposedSalary != null) && (
                    <div className="flex items-center gap-2">
                      <Banknote className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {row.salaryMin != null && formatSalary(row.salaryMin, row.currency)}
                        {row.salaryMin != null && row.salaryMax != null && ' – '}
                        {row.salaryMax != null && formatSalary(row.salaryMax, row.currency)}
                        {row.proposedSalary != null && (
                          <span className="text-muted-foreground ml-2">
                            (asked: {formatSalary(row.proposedSalary, row.currency)})
                          </span>
                        )}
                      </span>
                    </div>
                  )}
                  {row.sourceUrl && (
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <a
                        href={row.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline"
                      >
                        Source URL
                      </a>
                    </div>
                  )}
                </div>

                <Card>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-sm">Contact Person</span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs"
                        onClick={() => router.push(`/applications/${row.id}`)}
                      >
                        {row.contact ? 'Edit' : 'Add'}
                      </Button>
                    </div>

                    {row.contact ? (
                      <div className="space-y-1 text-sm">
                        <p className="font-medium">{row.contact.name}</p>
                        {row.contact.role && (
                          <p className="text-muted-foreground text-xs">{row.contact.role}</p>
                        )}
                        {row.contact.email && (
                          <a
                            href={`mailto:${row.contact.email}`}
                            className="flex items-center gap-2 hover:underline"
                          >
                            <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="truncate">{row.contact.email}</span>
                          </a>
                        )}
                        {row.contact.phone && (
                          <a
                            href={`tel:${row.contact.phone}`}
                            className="flex items-center gap-2 hover:underline"
                          >
                            <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>{row.contact.phone}</span>
                          </a>
                        )}
                        {row.contact.linkedinUrl && (
                          <a
                            href={row.contact.linkedinUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 hover:underline"
                          >
                            <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="truncate">LinkedIn profile</span>
                          </a>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No contact added yet. Click <span className="font-medium">Add</span> to
                        attach one.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="notes" className="space-y-3 mt-4">
                {localNotes.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    No notes yet. Add the first one below.
                  </p>
                ) : (
                  localNotes.map((note) => (
                    <div key={note.id} className="group p-3 rounded-md border">
                      {editingNoteId === note.id ? (
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
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={cancelEditNote}
                                disabled={isPending}
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => saveEditNote(note.id)}
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
                          <div className="flex-1 min-w-0">
                            <p className="text-sm whitespace-pre-wrap break-words">
                              {note.content}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(note.createdAt).toLocaleString()}
                              {new Date(note.updatedAt).getTime() >
                                new Date(note.createdAt).getTime() + 1000 && (
                                <span className="ml-1 italic">(edited)</span>
                              )}
                            </p>
                          </div>
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5 shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              disabled={isPending}
                              onClick={() => startEditNote(note.id, note.content)}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              disabled={isPending}
                              onClick={() => handleDeleteNote(note.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}

                <div className="space-y-2 pt-2">
                  <Textarea
                    placeholder="Add a note…"
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    onKeyDown={(e) => {
                      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && !noteInvalid) {
                        e.preventDefault();
                        handleAddNote();
                      }
                    }}
                    rows={2}
                    maxLength={NOTE_MAX_LENGTH}
                    disabled={isPending}
                    className="text-sm"
                  />
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        'text-xs',
                        noteRemaining < 0 ? 'text-destructive' : 'text-muted-foreground'
                      )}
                    >
                      {noteRemaining} remaining · ⌘+Enter to send
                    </span>
                    <Button size="sm" disabled={isPending || noteInvalid} onClick={handleAddNote}>
                      <Send className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
