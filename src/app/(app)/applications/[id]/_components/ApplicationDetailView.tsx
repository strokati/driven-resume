'use client';

import { useTransition, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  ExternalLink,
  MapPin,
  Globe,
  Calendar,
  Banknote,
  FileText,
  Mail,
  Trash2,
  ShieldCheck,
  BookOpen,
  Pencil,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { StatusStepper } from '@/components/shared/StatusStepper';
import { ExcitementRating } from '@/components/shared/ExcitementRating';
import { VacancyAnalysisPanel } from '@/components/resume-editor/VacancyAnalysisPanel';
import { NotesCard } from '@/components/applications/NotesCard';
import { ContactCard } from '@/components/applications/ContactCard';
import {
  updateApplicationStatus,
  updateApplicationTracking,
  deleteApplication,
} from '@/server/actions/applications';
import { ChangeResumeDialog } from '@/components/applications/ChangeResumeDialog';
import type { ApplicationDetail } from '@/types/applications';
import type { ApplicationStatus } from '@/lib/validations/applications';
import { formatSalary } from '@/lib/utils/currency';
import type { MasterResumeSummary } from '@/types/master-resume';

type AiConfig = { providerId: string; model: string; isDefault: boolean; apiKey: string };

function formatDateForInput(date: Date | string | null): string {
  if (!date) return '';
  return new Date(date).toISOString().split('T')[0];
}

function TrackingField({
  label,
  icon: Icon,
  type = 'text',
  value,
  placeholder,
  onSave,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  type?: string;
  value: string;
  placeholder?: string;
  onSave: (value: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [local, setLocal] = useState(value);

  function handleBlur() {
    setEditing(false);
    if (local !== value) onSave(local);
  }

  return (
    <div className="flex items-center gap-3 py-1.5">
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
      <span className="text-sm text-muted-foreground w-24 shrink-0">{label}</span>
      {editing ? (
        <Input
          type={type}
          value={local}
          onChange={(e) => setLocal(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleBlur();
          }}
          autoFocus
          className="h-8 text-sm"
        />
      ) : (
        <button
          type="button"
          onClick={() => {
            setEditing(true);
            setLocal(value);
          }}
          className="text-sm hover:underline underline-offset-2"
        >
          {value || <span className="text-muted-foreground">{placeholder ?? '—'}</span>}
        </button>
      )}
    </div>
  );
}

export function ApplicationDetailView({
  application,
  aiConfigs,
  resumes,
}: {
  application: ApplicationDetail;
  aiConfigs: AiConfig[];
  resumes: MasterResumeSummary[];
}) {
  const [isPending, startTransition] = useTransition();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showChangeResumeDialog, setShowChangeResumeDialog] = useState(false);
  const { vacancy } = application;

  const activeResume =
    application.resumeDrafts.find((d) => d.isActive) ?? application.resumeDrafts[0];
  const activeCoverLetter =
    application.coverLetterDrafts.find((d) => d.isActive) ?? application.coverLetterDrafts[0];

  function handleStatusChange(status: ApplicationStatus) {
    startTransition(async () => {
      try {
        await updateApplicationStatus(application.id, { status });
      } catch {
        toast.error('Failed to update status');
      }
    });
  }

  function handleExcitementChange(excitement: number) {
    startTransition(async () => {
      try {
        await updateApplicationTracking(application.id, { excitement });
      } catch {
        toast.error('Failed to update excitement');
      }
    });
  }

  function handleTrackingSave(field: string, value: string) {
    const numFields = ['salaryMin', 'salaryMax', 'proposedSalary'];
    const data: Record<string, unknown> = {
      [field]: numFields.includes(field) ? (value ? parseInt(value, 10) || null : null) : value,
    };
    startTransition(async () => {
      try {
        await updateApplicationTracking(application.id, data);
      } catch {
        toast.error('Failed to update tracking');
      }
    });
  }

  function handleDelete() {
    startTransition(async () => {
      try {
        await deleteApplication(application.id);
      } catch {
        toast.error('Failed to delete application');
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between pb-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{vacancy.jobTitle}</h1>
          <p className="text-sm text-muted-foreground mt-1">{vacancy.companyName}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        {/* Left column — Vacancy */}
        <div className="space-y-4">
          <Card>
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                {vacancy.location && (
                  <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" />
                    {vacancy.location}
                  </span>
                )}
                {vacancy.locationType && (
                  <Badge variant="outline" className="text-xs">
                    {vacancy.locationType}
                  </Badge>
                )}
                {(vacancy.salaryMin || vacancy.salaryMax) && (
                  <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Banknote className="h-3.5 w-3.5" />
                    {vacancy.salaryMin != null && formatSalary(vacancy.salaryMin, vacancy.currency)}
                    {vacancy.salaryMin != null && vacancy.salaryMax != null && ' – '}
                    {vacancy.salaryMax != null && formatSalary(vacancy.salaryMax, vacancy.currency)}
                  </span>
                )}
              </div>

              {vacancy.sourceUrl && (
                <a
                  href={vacancy.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                >
                  <Globe className="h-3.5 w-3.5" />
                  Source link
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}

              {vacancy.rawText && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                    Job Posting
                  </h3>
                  <pre className="max-h-80 overflow-auto rounded-xl bg-muted/50 p-4 text-xs leading-relaxed whitespace-pre-wrap font-mono">
                    {vacancy.rawText}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>

          {/* AI Analysis */}
          <VacancyAnalysisPanel
            applicationId={application.id}
            configs={aiConfigs}
            existingAnalysis={vacancy.aiAnalysis}
          />
        </div>

        {/* Right column — Tracking & Documents */}
        <div className="space-y-4">
          {/* Status */}
          <Card>
            <CardContent className="p-5 space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Status
              </h3>
              <StatusStepper
                currentStatus={application.status as ApplicationStatus}
                onChange={handleStatusChange}
              />
            </CardContent>
          </Card>

          {/* Excitement */}
          <Card>
            <CardContent className="p-5 space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Excitement
              </h3>
              <ExcitementRating value={application.excitement} onChange={handleExcitementChange} />
            </CardContent>
          </Card>

          {/* Tracking fields */}
          <Card>
            <CardContent className="p-5 space-y-1">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Tracking
              </h3>
              <TrackingField
                label="Date Applied"
                icon={Calendar}
                type="date"
                value={formatDateForInput(application.dateApplied)}
                placeholder="Not set"
                onSave={(v) => handleTrackingSave('dateApplied', v)}
              />
              <TrackingField
                label="Interview Date"
                icon={Calendar}
                type="date"
                value={formatDateForInput(application.interviewDate)}
                placeholder="Not set"
                onSave={(v) => handleTrackingSave('interviewDate', v)}
              />
              <TrackingField
                label="Offer Date"
                icon={Calendar}
                type="date"
                value={formatDateForInput(application.offerDate)}
                placeholder="Not set"
                onSave={(v) => handleTrackingSave('offerDate', v)}
              />
              <TrackingField
                label="Rejected Date"
                icon={Calendar}
                type="date"
                value={formatDateForInput(application.rejectedDate)}
                placeholder="Not set"
                onSave={(v) => handleTrackingSave('rejectedDate', v)}
              />
              <TrackingField
                label="Salary Min"
                icon={Banknote}
                type="number"
                value={application.salaryMin?.toString() ?? ''}
                placeholder="—"
                onSave={(v) => handleTrackingSave('salaryMin', v)}
              />
              <TrackingField
                label="Salary Max"
                icon={Banknote}
                type="number"
                value={application.salaryMax?.toString() ?? ''}
                placeholder="—"
                onSave={(v) => handleTrackingSave('salaryMax', v)}
              />
              <TrackingField
                label="Proposed Salary"
                icon={Banknote}
                type="number"
                value={application.proposedSalary?.toString() ?? ''}
                placeholder="—"
                onSave={(v) => handleTrackingSave('proposedSalary', v)}
              />
            </CardContent>
          </Card>

          {/* Contact Person */}
          <ContactCard applicationId={application.id} contact={application.contact} />

          {/* Notes */}
          <NotesCard applicationId={application.id} notes={application.notes} />

          {/* Source Resume */}
          <Card>
            <CardContent className="p-5 space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Source Resume
              </h3>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <BookOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {application.masterResume
                        ? `${application.masterResume.name} (${application.masterResume.language.toUpperCase()})`
                        : 'Default resume'}
                    </p>
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={() => setShowChangeResumeDialog(true)}>
                  <Pencil className="h-3.5 w-3.5 mr-1" />
                  Change
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Documents */}
          <Card>
            <CardContent className="p-5 space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Documents
              </h3>

              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {activeResume ? activeResume.name : 'No resume'}
                    </p>
                    {activeResume && (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Badge
                          variant="outline"
                          className={`text-[0.6rem] ${
                            activeResume.status === 'ready'
                              ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800'
                              : ''
                          }`}
                        >
                          {activeResume.status === 'ready' ? '✓ Ready' : activeResume.status}
                        </Badge>
                        {activeResume.atsScore && (
                          <span className="flex items-center gap-0.5 text-[0.6rem] text-muted-foreground">
                            <ShieldCheck className="h-3 w-3" />
                            {(activeResume.atsScore as { overallScore?: number }).overallScore ??
                              ''}
                            /100
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <Link href={`/applications/${application.id}/resume`}>
                  <Button size="sm">{activeResume ? 'Open Editor' : 'Create Resume'}</Button>
                </Link>
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {activeCoverLetter ? activeCoverLetter.name : 'No cover letter'}
                    </p>
                    {activeCoverLetter && (
                      <Badge variant="outline" className="text-[0.6rem] mt-0.5">
                        {activeCoverLetter.status}
                      </Badge>
                    )}
                  </div>
                </div>
                <Link href={`/applications/${application.id}/cover-letter`}>
                  <Button size="sm">{activeCoverLetter ? 'Open Editor' : 'Create Letter'}</Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Danger zone */}
          <Card>
            <CardContent className="p-5">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowDeleteDialog(true)}
                className="w-full"
              >
                <Trash2 className="h-4 w-4 mr-1.5" />
                Delete Application
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Application</DialogTitle>
            <DialogDescription>
              This will permanently delete this application, its vacancy, and all associated resume
              and cover letter drafts. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
              {isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Change source resume dialog */}
      <ChangeResumeDialog
        applicationId={application.id}
        resumes={resumes}
        currentResumeId={application.masterResumeId}
        hasDrafts={application.resumeDrafts.length > 0}
        open={showChangeResumeDialog}
        onOpenChange={setShowChangeResumeDialog}
      />
    </div>
  );
}
