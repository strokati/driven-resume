import { db } from '@/lib/db/client';

/**
 * Ownership guards for server-action mutations.
 *
 * Every mutation that takes a record `id` MUST call one of these helpers
 * before writing. They walk the ownership chain up to User and throw
 * `Error('Not found.')` when the calling user does not own the row.
 *
 * Throwing the same error for "doesn't exist" and "exists but not yours"
 * prevents enumeration of other users' IDs.
 */

const NOT_FOUND = 'Not found.';

export async function assertResumeOwned(userId: string, resumeId: string) {
  const resume = await db.masterResume.findFirst({ where: { id: resumeId, userId } });
  if (!resume) throw new Error(NOT_FOUND);
  return resume;
}

export async function assertWorkCompanyOwned(userId: string, companyId: string) {
  const c = await db.workCompany.findFirst({
    where: { id: companyId, resume: { userId } },
  });
  if (!c) throw new Error(NOT_FOUND);
  return c;
}

export async function assertWorkRoleOwned(userId: string, roleId: string) {
  const r = await db.workRole.findFirst({
    where: { id: roleId, company: { resume: { userId } } },
  });
  if (!r) throw new Error(NOT_FOUND);
  return r;
}

export async function assertWorkProjectOwned(userId: string, projectId: string) {
  const p = await db.workProject.findFirst({
    where: { id: projectId, role: { company: { resume: { userId } } } },
  });
  if (!p) throw new Error(NOT_FOUND);
  return p;
}

export async function assertEducationOwned(userId: string, id: string) {
  const row = await db.education.findFirst({
    where: { id, resume: { userId } },
  });
  if (!row) throw new Error(NOT_FOUND);
  return row;
}

export async function assertSkillOwned(userId: string, id: string) {
  const row = await db.skill.findFirst({ where: { id, resume: { userId } } });
  if (!row) throw new Error(NOT_FOUND);
  return row;
}

export async function assertCertificationOwned(userId: string, id: string) {
  const row = await db.certification.findFirst({
    where: { id, resume: { userId } },
  });
  if (!row) throw new Error(NOT_FOUND);
  return row;
}

export async function assertAwardOwned(userId: string, id: string) {
  const row = await db.award.findFirst({ where: { id, resume: { userId } } });
  if (!row) throw new Error(NOT_FOUND);
  return row;
}

export async function assertProjectOwned(userId: string, id: string) {
  const row = await db.project.findFirst({ where: { id, resume: { userId } } });
  if (!row) throw new Error(NOT_FOUND);
  return row;
}

export async function assertVolunteeringRoleOwned(userId: string, id: string) {
  const row = await db.volunteeringRole.findFirst({
    where: { id, resume: { userId } },
  });
  if (!row) throw new Error(NOT_FOUND);
  return row;
}

export async function assertPublicationOwned(userId: string, id: string) {
  const row = await db.publication.findFirst({
    where: { id, resume: { userId } },
  });
  if (!row) throw new Error(NOT_FOUND);
  return row;
}

export async function assertApplicationOwned(userId: string, applicationId: string) {
  const a = await db.application.findFirst({
    where: { id: applicationId, vacancy: { userId } },
  });
  if (!a) throw new Error(NOT_FOUND);
  return a;
}

export async function assertApplicationNoteOwned(userId: string, noteId: string) {
  const n = await db.applicationNote.findFirst({
    where: { id: noteId, application: { vacancy: { userId } } },
  });
  if (!n) throw new Error(NOT_FOUND);
  return n;
}

export async function assertApplicationContactOwned(userId: string, contactId: string) {
  const c = await db.applicationContact.findFirst({
    where: { id: contactId, application: { vacancy: { userId } } },
  });
  if (!c) throw new Error(NOT_FOUND);
  return c;
}

export async function assertResumeDraftOwned(userId: string, draftId: string) {
  const d = await db.resumeDraft.findFirst({
    where: { id: draftId, application: { vacancy: { userId } } },
  });
  if (!d) throw new Error(NOT_FOUND);
  return d;
}

export async function assertCoverLetterDraftOwned(userId: string, draftId: string) {
  const d = await db.coverLetterDraft.findFirst({
    where: { id: draftId, application: { vacancy: { userId } } },
  });
  if (!d) throw new Error(NOT_FOUND);
  return d;
}

/**
 * Reorder helpers — verify the parent and every id in the array belongs to it.
 * Throws if any id is foreign or missing.
 */
export async function assertAllWorkCompaniesInResume(
  userId: string,
  resumeId: string,
  ids: string[]
) {
  await assertResumeOwned(userId, resumeId);
  const owned = await db.workCompany.findMany({
    where: { id: { in: ids }, resumeId, resume: { userId } },
    select: { id: true },
  });
  if (owned.length !== ids.length) throw new Error(NOT_FOUND);
}

export async function assertAllEducationInResume(userId: string, resumeId: string, ids: string[]) {
  await assertResumeOwned(userId, resumeId);
  const owned = await db.education.findMany({
    where: { id: { in: ids }, resumeId, resume: { userId } },
    select: { id: true },
  });
  if (owned.length !== ids.length) throw new Error(NOT_FOUND);
}

export async function assertAllSkillsInResume(userId: string, resumeId: string, ids: string[]) {
  await assertResumeOwned(userId, resumeId);
  const owned = await db.skill.findMany({
    where: { id: { in: ids }, resumeId, resume: { userId } },
    select: { id: true },
  });
  if (owned.length !== ids.length) throw new Error(NOT_FOUND);
}

export async function assertAllCertificationsInResume(
  userId: string,
  resumeId: string,
  ids: string[]
) {
  await assertResumeOwned(userId, resumeId);
  const owned = await db.certification.findMany({
    where: { id: { in: ids }, resumeId, resume: { userId } },
    select: { id: true },
  });
  if (owned.length !== ids.length) throw new Error(NOT_FOUND);
}

export async function assertAllAwardsInResume(userId: string, resumeId: string, ids: string[]) {
  await assertResumeOwned(userId, resumeId);
  const owned = await db.award.findMany({
    where: { id: { in: ids }, resumeId, resume: { userId } },
    select: { id: true },
  });
  if (owned.length !== ids.length) throw new Error(NOT_FOUND);
}

export async function assertAllProjectsInResume(userId: string, resumeId: string, ids: string[]) {
  await assertResumeOwned(userId, resumeId);
  const owned = await db.project.findMany({
    where: { id: { in: ids }, resumeId, resume: { userId } },
    select: { id: true },
  });
  if (owned.length !== ids.length) throw new Error(NOT_FOUND);
}

export async function assertAllVolunteeringRolesInResume(
  userId: string,
  resumeId: string,
  ids: string[]
) {
  await assertResumeOwned(userId, resumeId);
  const owned = await db.volunteeringRole.findMany({
    where: { id: { in: ids }, resumeId, resume: { userId } },
    select: { id: true },
  });
  if (owned.length !== ids.length) throw new Error(NOT_FOUND);
}

export async function assertAllPublicationsInResume(
  userId: string,
  resumeId: string,
  ids: string[]
) {
  await assertResumeOwned(userId, resumeId);
  const owned = await db.publication.findMany({
    where: { id: { in: ids }, resumeId, resume: { userId } },
    select: { id: true },
  });
  if (owned.length !== ids.length) throw new Error(NOT_FOUND);
}
