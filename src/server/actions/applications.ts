'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth/config';
import { db } from '@/lib/db/client';
import {
  CreateApplicationSchema,
  UpdateApplicationStatusSchema,
  UpdateExcitementSchema,
  UpdateTrackingSchema,
  NoteSchema,
  ContactPersonSchema,
} from '@/lib/validations/applications';
import type { CreateApplicationInput, ContactPersonInput } from '@/lib/validations/applications';
import { assertApplicationOwned, assertApplicationNoteOwned } from './_ownership';

async function requireAuth(): Promise<string> {
  const session = await auth();
  if (!session && process.env.AUTH_MODE === 'email_otp') redirect('/login');
  return session?.user?.id ?? 'local-user';
}

export async function createApplication(data: CreateApplicationInput): Promise<string> {
  const userId = await requireAuth();
  const validated = CreateApplicationSchema.parse(data);

  const resume = await db.masterResume.findFirst({
    where: { id: validated.masterResumeId, userId },
  });
  if (!resume) throw new Error('Invalid master resume.');

  try {
    const applicationId = await db.$transaction(async (tx) => {
      const vacancy = await tx.vacancy.create({
        data: {
          userId,
          companyName: validated.companyName,
          jobTitle: validated.jobTitle,
          location: validated.location || null,
          locationType: validated.locationType || null,
          salaryMin: validated.salaryMin ? parseInt(validated.salaryMin, 10) || null : null,
          salaryMax: validated.salaryMax ? parseInt(validated.salaryMax, 10) || null : null,
          currency: validated.currency || 'USD',
          sourceUrl: validated.sourceUrl || null,
          rawText: validated.rawText || null,
        },
      });
      const last = await tx.application.aggregate({
        _max: { serialNumber: true },
        where: { userId },
      });
      const application = await tx.application.create({
        data: {
          vacancyId: vacancy.id,
          userId,
          masterResumeId: validated.masterResumeId,
          serialNumber: (last._max.serialNumber ?? 0) + 1,
        },
      });

      if (validated.contact && validated.contact.name.trim()) {
        const c = validated.contact;
        await tx.applicationContact.create({
          data: {
            applicationId: application.id,
            name: c.name,
            role: c.role || null,
            email: c.email || null,
            phone: c.phone || null,
            linkedinUrl: c.linkedinUrl || null,
          },
        });
      }

      return application.id;
    });
    return applicationId;
  } catch {
    throw new Error('Failed to create application.');
  } finally {
    revalidatePath('/applications');
  }
}

export async function updateApplicationStatus(id: string, data: { status: string }): Promise<void> {
  const userId = await requireAuth();
  await assertApplicationOwned(userId, id);
  const validated = UpdateApplicationStatusSchema.parse(data);
  try {
    await db.application.update({ where: { id }, data: { status: validated.status } });
  } catch {
    throw new Error('Failed to update application status.');
  }
  revalidatePath('/applications');
  revalidatePath('/tracker');
}

export async function updateExcitement(id: string, data: { excitement: number }): Promise<void> {
  const userId = await requireAuth();
  await assertApplicationOwned(userId, id);
  const validated = UpdateExcitementSchema.parse(data);
  try {
    await db.application.update({ where: { id }, data: { excitement: validated.excitement } });
  } catch {
    throw new Error('Failed to update excitement.');
  }
  revalidatePath('/applications');
  revalidatePath('/tracker');
}

export async function updateApplicationTracking(
  id: string,
  data: Record<string, unknown>
): Promise<void> {
  const userId = await requireAuth();
  await assertApplicationOwned(userId, id);
  const validated = UpdateTrackingSchema.parse(data);
  try {
    const updateData: Record<string, unknown> = {};
    if (validated.dateApplied !== undefined)
      updateData.dateApplied = validated.dateApplied ? new Date(validated.dateApplied) : null;
    if (validated.interviewDate !== undefined)
      updateData.interviewDate = validated.interviewDate ? new Date(validated.interviewDate) : null;
    if (validated.offerDate !== undefined)
      updateData.offerDate = validated.offerDate ? new Date(validated.offerDate) : null;
    if (validated.rejectedDate !== undefined)
      updateData.rejectedDate = validated.rejectedDate ? new Date(validated.rejectedDate) : null;
    if (validated.salaryMin !== undefined) updateData.salaryMin = validated.salaryMin;
    if (validated.salaryMax !== undefined) updateData.salaryMax = validated.salaryMax;
    if (validated.proposedSalary !== undefined)
      updateData.proposedSalary = validated.proposedSalary;
    if (validated.excitement !== undefined) updateData.excitement = validated.excitement;

    await db.application.update({ where: { id }, data: updateData });
  } catch {
    throw new Error('Failed to update tracking fields.');
  }
  revalidatePath('/applications');
  revalidatePath(`/applications/${id}`);
}

export async function deleteApplication(id: string): Promise<void> {
  const userId = await requireAuth();
  await assertApplicationOwned(userId, id);
  try {
    const application = await db.application.findUnique({
      where: { id },
      select: { vacancyId: true },
    });
    if (application) {
      await db.application.delete({ where: { id } });
      await db.vacancy.delete({ where: { id: application.vacancyId } });
    }
  } catch {
    throw new Error('Failed to delete application.');
  }
  revalidatePath('/applications');
  revalidatePath('/tracker');
  redirect('/applications');
}

export async function createApplicationNote(
  applicationId: string,
  content: string
): Promise<string> {
  const userId = await requireAuth();
  await assertApplicationOwned(userId, applicationId);
  if (!content.trim()) throw new Error('Note content cannot be empty.');
  try {
    const note = await db.applicationNote.create({
      data: { applicationId, content: content.trim() },
      select: { id: true },
    });
    revalidatePath('/tracker');
    revalidatePath(`/applications/${applicationId}`);
    return note.id;
  } catch {
    throw new Error('Failed to create note.');
  }
}

export async function updateApplicationNote(id: string, content: string): Promise<void> {
  const userId = await requireAuth();
  const note = await assertApplicationNoteOwned(userId, id);
  const validated = NoteSchema.parse({ content });
  try {
    await db.applicationNote.update({
      where: { id },
      data: { content: validated.content },
    });
  } catch {
    throw new Error('Failed to update note.');
  }
  revalidatePath('/tracker');
  revalidatePath(`/applications/${note.applicationId}`);
}

export async function deleteApplicationNote(id: string): Promise<void> {
  const userId = await requireAuth();
  const note = await assertApplicationNoteOwned(userId, id);
  try {
    await db.applicationNote.delete({ where: { id } });
  } catch {
    throw new Error('Failed to delete note.');
  }
  revalidatePath('/tracker');
  revalidatePath(`/applications/${note.applicationId}`);
}

export async function upsertApplicationContact(
  applicationId: string,
  data: ContactPersonInput
): Promise<void> {
  const userId = await requireAuth();
  await assertApplicationOwned(userId, applicationId);
  const validated = ContactPersonSchema.parse(data);
  try {
    await db.applicationContact.upsert({
      where: { applicationId },
      create: {
        applicationId,
        name: validated.name,
        role: validated.role || null,
        email: validated.email || null,
        phone: validated.phone || null,
        linkedinUrl: validated.linkedinUrl || null,
      },
      update: {
        name: validated.name,
        role: validated.role || null,
        email: validated.email || null,
        phone: validated.phone || null,
        linkedinUrl: validated.linkedinUrl || null,
      },
    });
  } catch {
    throw new Error('Failed to save contact.');
  }
  revalidatePath(`/applications/${applicationId}`);
  revalidatePath('/tracker');
}

export async function deleteApplicationContact(applicationId: string): Promise<void> {
  const userId = await requireAuth();
  await assertApplicationOwned(userId, applicationId);
  try {
    await db.applicationContact.deleteMany({ where: { applicationId } });
  } catch {
    throw new Error('Failed to delete contact.');
  }
  revalidatePath(`/applications/${applicationId}`);
  revalidatePath('/tracker');
}

export async function updateApplicationResume(
  applicationId: string,
  masterResumeId: string
): Promise<void> {
  const userId = await requireAuth();

  const [application, resume] = await Promise.all([
    db.application.findFirst({ where: { id: applicationId, vacancy: { userId } } }),
    db.masterResume.findFirst({ where: { id: masterResumeId, userId } }),
  ]);
  if (!application) throw new Error('Application not found.');
  if (!resume) throw new Error('Invalid master resume.');

  try {
    await db.application.update({
      where: { id: applicationId },
      data: { masterResumeId },
    });
  } catch {
    throw new Error('Failed to update source resume.');
  }
  revalidatePath(`/applications/${applicationId}`);
}
