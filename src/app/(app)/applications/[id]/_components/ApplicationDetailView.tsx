'use client';

import { useTransition, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  ExternalLink,
  MapPin,
  Globe,
  Banknote,
  Trash2,
  ShieldCheck,
  BookOpen,
  Pencil,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { StatusStepper } from '@/components/shared/StatusStepper';
import { ExcitementRating } from '@/components/shared/ExcitementRating';
import { VacancyAnalysisPanel } from '@/components/resume-editor/VacancyAnalysisPanel';
import { NotesCard } from '@/components/applications/NotesCard';
import { ContactCard } from '@/components/applications/ContactCard';
import {
  PropertyGroup,
  PropertyRow,
  PropertyRowClickable,
} from '@/components/shared/properties-panel';
import {
  updateApplicationStatus,
  updateApplicationTracking,
  deleteApplication,
} from '@/server/actions/applications';
import { ChangeResumeDialog } from '@/components/applications/ChangeResumeDialog';
import type { ApplicationDetail } from '@/types/applications';
import type { ApplicationStatus } from '@/lib/validations/applications';
import { formatSalary } from '@/lib/utils/currency';
import { statusDotColors, statusLabels } from '@/lib/utils/status';
import type { MasterResumeSummary } from '@/types/master-resume';

type AiConfig = { providerId: string; model: string; isDefault: boolean; apiKey: string };

function formatDateForInput(date: Date | string | null): string {
  if (!date) return '';
  return new Date(date).toISOString().split('T')[0];
}

function formatShortDate(date: Date | string | null): string {
  if (!date) return '';
  return new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function nextStepHint(
  status: string,
  interviewDate: Date | null,
  offerDate: Date | null
): string | null {
  const now = Date.now();
  if (interviewDate && new Date(interviewDate).getTime() > now) {
    return `Interview ${formatShortDate(interviewDate)}`;
  }
  if (offerDate && new Date(offerDate).getTime() > now) {
    return `Offer ${formatShortDate(offerDate)}`;
  }
  if (status === 'applied' || status === 'screening') return 'Awaiting response';
  return null;
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
  const [salaryExpanded, setSalaryExpanded] = useState(false);
  const [statusPopoverOpen, setStatusPopoverOpen] = useState(false);
  const { vacancy } = application;

  const activeResume =
    application.resumeDrafts.find((d) => d.isActive) ?? application.resumeDrafts[0];
  const activeCoverLetter =
    application.coverLetterDrafts.find((d) => d.isActive) ?? application.coverLetterDrafts[0];

  const status = application.status as ApplicationStatus;
  const hint = nextStepHint(status, application.interviewDate, application.offerDate);

  const salarySummary =
    application.salaryMin != null || application.salaryMax != null
      ? `${application.salaryMin != null ? formatSalary(application.salaryMin, vacancy.currency) : ''}${
          application.salaryMin != null && application.salaryMax != null ? ' – ' : ''
        }${application.salaryMax != null ? formatSalary(application.salaryMax, vacancy.currency) : ''}`
      : null;

  function handleStatusChange(nextStatus: ApplicationStatus) {
    startTransition(async () => {
      try {
        await updateApplicationStatus(application.id, { status: nextStatus });
        setStatusPopoverOpen(false);
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
        {/* Left column — Vacancy, AI Analysis, Notes */}
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

          {/* Notes — narrative content lives with the vacancy */}
          <NotesCard applicationId={application.id} notes={application.notes} />
        </div>

        {/* Right column — single properties panel */}
        <div>
          <Card>
            <CardContent className="p-4">
              {/* Status header */}
              <Popover open={statusPopoverOpen} onOpenChange={setStatusPopoverOpen}>
                <PopoverTrigger
                  render={
                    <button
                      type="button"
                      className="flex items-center gap-2 w-full text-left group -mx-1 px-1 py-2 rounded-md hover:bg-muted/50 transition-colors"
                    />
                  }
                >
                  <span
                    className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                      statusDotColors[status] ?? 'bg-slate-400'
                    }`}
                  />
                  <span className="text-sm font-medium">{statusLabels[status] ?? status}</span>
                  {hint && (
                    <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                      <ChevronRight className="h-3 w-3" />
                      {hint}
                    </span>
                  )}
                  <Pencil className="h-3 w-3 ml-auto text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </PopoverTrigger>
                <PopoverContent align="start" className="w-72 p-3">
                  <StatusStepper currentStatus={status} onChange={handleStatusChange} />
                </PopoverContent>
              </Popover>

              {/* Tracking */}
              <PropertyGroup label="Tracking">
                <PropertyRowClickable
                  label="Applied date"
                  type="date"
                  value={formatDateForInput(application.dateApplied)}
                  placeholder="Not set"
                  onSave={(v) => handleTrackingSave('dateApplied', v)}
                />
                <PropertyRowClickable
                  label="Interview"
                  type="date"
                  value={formatDateForInput(application.interviewDate)}
                  placeholder="Not set"
                  onSave={(v) => handleTrackingSave('interviewDate', v)}
                />
                <PropertyRowClickable
                  label="Offer"
                  type="date"
                  value={formatDateForInput(application.offerDate)}
                  placeholder="Not set"
                  onSave={(v) => handleTrackingSave('offerDate', v)}
                />
                <PropertyRowClickable
                  label="Rejected"
                  type="date"
                  value={formatDateForInput(application.rejectedDate)}
                  placeholder="Not set"
                  onSave={(v) => handleTrackingSave('rejectedDate', v)}
                />
                {salaryExpanded ? (
                  <div className="space-y-1 pt-1">
                    <PropertyRowClickable
                      label="Salary min"
                      type="number"
                      value={application.salaryMin?.toString() ?? ''}
                      onSave={(v) => handleTrackingSave('salaryMin', v)}
                    />
                    <PropertyRowClickable
                      label="Salary max"
                      type="number"
                      value={application.salaryMax?.toString() ?? ''}
                      onSave={(v) => handleTrackingSave('salaryMax', v)}
                    />
                    <PropertyRowClickable
                      label="Proposed"
                      type="number"
                      value={application.proposedSalary?.toString() ?? ''}
                      onSave={(v) => handleTrackingSave('proposedSalary', v)}
                    />
                  </div>
                ) : (
                  <PropertyRow
                    label="Salary"
                    value={
                      <button
                        type="button"
                        onClick={() => setSalaryExpanded(true)}
                        className="hover:underline underline-offset-2 text-left flex items-center gap-1"
                      >
                        {salarySummary ?? <span className="text-muted-foreground">—</span>}
                        <ChevronDown className="h-3 w-3 text-muted-foreground" />
                      </button>
                    }
                  />
                )}
                <PropertyRow
                  label="Excitement"
                  value={
                    <ExcitementRating
                      value={application.excitement}
                      onChange={handleExcitementChange}
                    />
                  }
                />
              </PropertyGroup>

              {/* Contact */}
              <PropertyGroup label="Contact">
                <ContactCard
                  applicationId={application.id}
                  contact={application.contact}
                  variant="inline"
                />
              </PropertyGroup>

              {/* Documents */}
              <PropertyGroup label="Documents">
                <PropertyRow
                  label="Resume"
                  value={
                    <span className="flex items-center gap-1.5 min-w-0">
                      <span className="truncate">{activeResume ? activeResume.name : 'None'}</span>
                      {activeResume?.status === 'ready' && (
                        <Badge
                          variant="outline"
                          className="text-[0.6rem] shrink-0 bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800"
                        >
                          ✓ ready
                        </Badge>
                      )}
                      {activeResume?.atsScore && (
                        <span className="flex items-center gap-0.5 text-[0.6rem] text-muted-foreground shrink-0">
                          <ShieldCheck className="h-3 w-3" />
                          {(activeResume.atsScore as { score?: number }).score ?? ''}/100
                        </span>
                      )}
                    </span>
                  }
                  action={
                    <Link href={`/applications/${application.id}/resume`}>
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs">
                        Open
                      </Button>
                    </Link>
                  }
                />
                <PropertyRow
                  label="Cover letter"
                  value={
                    <span className="flex items-center gap-1.5 min-w-0">
                      <span className="truncate">
                        {activeCoverLetter ? activeCoverLetter.name : 'None'}
                      </span>
                      {activeCoverLetter && (
                        <Badge variant="outline" className="text-[0.6rem] shrink-0">
                          {activeCoverLetter.status}
                        </Badge>
                      )}
                    </span>
                  }
                  action={
                    <Link href={`/applications/${application.id}/cover-letter`}>
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs">
                        Open
                      </Button>
                    </Link>
                  }
                />
              </PropertyGroup>

              {/* Source resume */}
              <PropertyGroup label="Source Resume">
                <PropertyRow
                  label="Master"
                  value={
                    <span className="flex items-center gap-1.5 min-w-0">
                      <BookOpen className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="truncate">
                        {application.masterResume
                          ? `${application.masterResume.name} (${application.masterResume.language.toUpperCase()})`
                          : 'Default resume'}
                      </span>
                    </span>
                  }
                  action={
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs"
                      onClick={() => setShowChangeResumeDialog(true)}
                    >
                      Change
                    </Button>
                  }
                />
              </PropertyGroup>

              {/* Quiet destructive action */}
              <div className="pt-3 text-center">
                <button
                  type="button"
                  onClick={() => setShowDeleteDialog(true)}
                  disabled={isPending}
                  className="text-xs text-destructive/70 hover:text-destructive underline-offset-2 hover:underline transition-colors inline-flex items-center gap-1"
                >
                  <Trash2 className="h-3 w-3" />
                  Delete application…
                </button>
              </div>
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
