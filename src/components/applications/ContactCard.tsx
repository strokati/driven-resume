'use client';

import { useState, useTransition } from 'react';
import { User, Mail, Phone, Link2, Pencil, Trash2, UserPlus, X, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { upsertApplicationContact, deleteApplicationContact } from '@/server/actions/applications';
import {
  CONTACT_NAME_MAX,
  CONTACT_ROLE_MAX,
  CONTACT_PHONE_MAX,
} from '@/lib/validations/applications';
import type { ApplicationDetail } from '@/types/applications';

type Contact = ApplicationDetail['contact'];

type FormState = {
  name: string;
  role: string;
  email: string;
  phone: string;
  linkedinUrl: string;
};

function toFormState(contact: Contact): FormState {
  if (!contact) {
    return { name: '', role: '', email: '', phone: '', linkedinUrl: '' };
  }
  return {
    name: contact.name,
    role: contact.role ?? '',
    email: contact.email ?? '',
    phone: contact.phone ?? '',
    linkedinUrl: contact.linkedinUrl ?? '',
  };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ContactCard({
  applicationId,
  contact,
}: {
  applicationId: string;
  contact: Contact;
}) {
  const [isPending, startTransition] = useTransition();
  const [mode, setMode] = useState<'view' | 'edit'>(contact ? 'view' : 'view');
  const [form, setForm] = useState<FormState>(() => toFormState(contact));

  function startEdit() {
    setForm(toFormState(contact));
    setMode('edit');
  }

  function cancelEdit() {
    setForm(toFormState(contact));
    setMode('view');
  }

  function handleField<K extends keyof FormState>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const trimmedName = form.name.trim();
  const emailValid = !form.email || EMAIL_RE.test(form.email);
  const linkedinValid = !form.linkedinUrl || /^https?:\/\/\S+$/i.test(form.linkedinUrl);
  const canSave =
    trimmedName.length > 0 &&
    trimmedName.length <= CONTACT_NAME_MAX &&
    form.role.length <= CONTACT_ROLE_MAX &&
    form.phone.length <= CONTACT_PHONE_MAX &&
    emailValid &&
    linkedinValid;

  function handleSave() {
    if (!canSave) return;
    startTransition(async () => {
      try {
        await upsertApplicationContact(applicationId, {
          name: trimmedName,
          role: form.role.trim() || undefined,
          email: form.email.trim() || undefined,
          phone: form.phone.trim() || undefined,
          linkedinUrl: form.linkedinUrl.trim() || undefined,
        });
        setMode('view');
        toast.success('Contact saved');
      } catch {
        toast.error('Failed to save contact');
      }
    });
  }

  function handleDelete() {
    if (!window.confirm('Delete this contact?')) return;
    startTransition(async () => {
      try {
        await deleteApplicationContact(applicationId);
        setForm(toFormState(null));
        toast.success('Contact deleted');
      } catch {
        toast.error('Failed to delete contact');
      }
    });
  }

  return (
    <Card>
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Contact Person
          </h3>
          {mode === 'view' && contact && (
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={startEdit}
                disabled={isPending}
                className="h-7 px-2"
              >
                <Pencil className="h-3 w-3 mr-1" />
                Edit
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDelete}
                disabled={isPending}
                className="h-7 px-2 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>

        {mode === 'view' && !contact && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">No contact added yet.</p>
            <Button size="sm" variant="outline" onClick={startEdit} disabled={isPending}>
              <UserPlus className="h-3.5 w-3.5 mr-1.5" />
              Add contact
            </Button>
          </div>
        )}

        {mode === 'view' && contact && (
          <div className="space-y-1.5 text-sm">
            <div className="flex items-center gap-2">
              <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="font-medium">{contact.name}</span>
            </div>
            {contact.role && <p className="text-xs text-muted-foreground pl-5.5">{contact.role}</p>}
            {contact.email && (
              <a
                href={`mailto:${contact.email}`}
                className="flex items-center gap-2 hover:underline"
              >
                <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="truncate">{contact.email}</span>
              </a>
            )}
            {contact.phone && (
              <a href={`tel:${contact.phone}`} className="flex items-center gap-2 hover:underline">
                <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span>{contact.phone}</span>
              </a>
            )}
            {contact.linkedinUrl && (
              <a
                href={contact.linkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 hover:underline"
              >
                <Link2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="truncate">LinkedIn profile</span>
              </a>
            )}
          </div>
        )}

        {mode === 'edit' && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="contact-name">Name *</Label>
              <Input
                id="contact-name"
                value={form.name}
                onChange={(e) => handleField('name', e.target.value)}
                maxLength={CONTACT_NAME_MAX}
                placeholder="e.g. Jane Doe"
                autoFocus
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="contact-role">Role</Label>
                <Input
                  id="contact-role"
                  value={form.role}
                  onChange={(e) => handleField('role', e.target.value)}
                  maxLength={CONTACT_ROLE_MAX}
                  placeholder="Recruiter, Hiring Manager, …"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="contact-phone">Phone</Label>
                <Input
                  id="contact-phone"
                  value={form.phone}
                  onChange={(e) => handleField('phone', e.target.value)}
                  maxLength={CONTACT_PHONE_MAX}
                  placeholder="+1-555-0100"
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="contact-email">Email</Label>
                <Input
                  id="contact-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => handleField('email', e.target.value)}
                  placeholder="jane@acme.com"
                />
                {!emailValid && <p className="text-xs text-destructive">Invalid email</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="contact-linkedin">LinkedIn URL</Label>
                <Input
                  id="contact-linkedin"
                  type="url"
                  value={form.linkedinUrl}
                  onChange={(e) => handleField('linkedinUrl', e.target.value)}
                  placeholder="https://linkedin.com/in/janedoe"
                />
                {!linkedinValid && <p className="text-xs text-destructive">Invalid URL</p>}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button size="sm" variant="ghost" onClick={cancelEdit} disabled={isPending}>
                <X className="h-3.5 w-3.5 mr-1" />
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={isPending || !canSave}>
                <Check className="h-3.5 w-3.5 mr-1" />
                Save
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
