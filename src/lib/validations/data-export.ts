import { z } from 'zod';

export const ARCHIVE_VERSION = 1 as const;

/**
 * Shape of a Reeesume data-export archive.
 *
 * Schemas use `.strict()` so unknown keys are rejected at parse time. This
 * prevents a malicious or accidentally-malformed archive from injecting
 * fields (isDefault, apiKey, arbitrary createdAt, etc.) into Prisma writes
 * via the restore path. The version constant above remains the only
 * cross-version compatibility gate.
 *
 * Date fields are accepted as ISO 8601 strings (or anything
 * `new Date(...)` can parse) because `serializeDates` in the export
 * pipeline converts Date instances to strings.
 */

const ISO_DATE_PREFIX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
const isoDate = z.string().regex(ISO_DATE_PREFIX, 'Expected ISO 8601 date string');

const nullableString = z.string().nullable().optional();
const nullableNumber = z.number().nullable().optional();
const nullableJsonArray = z.array(z.unknown()).nullable().optional();
const nullableJsonObject = z.record(z.string(), z.unknown()).nullable().optional();

const UserArchiveSchemaRow = z
  .object({
    id: z.string(),
    email: z.string(),
    createdAt: isoDate,
    updatedAt: isoDate,
  })
  .strict();

const WorkProjectArchiveSchema = z
  .object({
    id: z.string(),
    roleId: z.string(),
    name: z.string(),
    startDate: nullableString,
    endDate: nullableString,
    description: nullableString,
    contribution: nullableString,
    responsibilities: nullableJsonArray,
    technologies: nullableJsonArray,
    outcome: nullableString,
    order: z.number(),
    createdAt: isoDate,
    updatedAt: isoDate,
  })
  .strict();

const WorkRoleArchiveSchema = z
  .object({
    id: z.string(),
    companyId: z.string(),
    title: z.string(),
    startDate: nullableString,
    endDate: nullableString,
    workArrangement: nullableString,
    responsibilities: nullableJsonArray,
    achievements: nullableJsonArray,
    technologies: nullableJsonArray,
    order: z.number(),
    createdAt: isoDate,
    updatedAt: isoDate,
    projects: z.array(WorkProjectArchiveSchema).default([]),
  })
  .strict();

const WorkCompanyArchiveSchema = z
  .object({
    id: z.string(),
    resumeId: z.string(),
    name: z.string(),
    location: nullableString,
    employmentType: nullableString,
    startDate: nullableString,
    endDate: nullableString,
    order: z.number(),
    createdAt: isoDate,
    updatedAt: isoDate,
    roles: z.array(WorkRoleArchiveSchema).default([]),
  })
  .strict();

const EducationArchiveSchema = z
  .object({
    id: z.string(),
    resumeId: z.string(),
    institution: z.string(),
    degree: nullableString,
    field: nullableString,
    location: nullableString,
    startDate: nullableString,
    endDate: nullableString,
    gpa: nullableString,
    honors: nullableString,
    activities: nullableJsonArray,
    order: z.number(),
    createdAt: isoDate,
    updatedAt: isoDate,
  })
  .strict();

const SkillArchiveSchema = z
  .object({
    id: z.string(),
    resumeId: z.string(),
    name: z.string(),
    category: nullableString,
    level: nullableString,
    order: z.number(),
    createdAt: isoDate,
    updatedAt: isoDate,
  })
  .strict();

const CertificationArchiveSchema = z
  .object({
    id: z.string(),
    resumeId: z.string(),
    name: z.string(),
    issuer: nullableString,
    issueDate: nullableString,
    expiryDate: nullableString,
    credentialId: nullableString,
    url: nullableString,
    order: z.number(),
    createdAt: isoDate,
    updatedAt: isoDate,
  })
  .strict();

const AwardArchiveSchema = z
  .object({
    id: z.string(),
    resumeId: z.string(),
    title: z.string(),
    issuer: nullableString,
    date: nullableString,
    description: nullableString,
    order: z.number(),
    createdAt: isoDate,
    updatedAt: isoDate,
  })
  .strict();

const ProjectArchiveSchema = z
  .object({
    id: z.string(),
    resumeId: z.string(),
    name: z.string(),
    description: nullableString,
    role: nullableString,
    startDate: nullableString,
    endDate: nullableString,
    technologies: nullableJsonArray,
    url: nullableString,
    repoUrl: nullableString,
    order: z.number(),
    createdAt: isoDate,
    updatedAt: isoDate,
  })
  .strict();

const VolunteeringRoleArchiveSchema = z
  .object({
    id: z.string(),
    resumeId: z.string(),
    organization: z.string(),
    role: nullableString,
    location: nullableString,
    startDate: nullableString,
    endDate: nullableString,
    responsibilities: nullableJsonArray,
    order: z.number(),
    createdAt: isoDate,
    updatedAt: isoDate,
  })
  .strict();

const PublicationArchiveSchema = z
  .object({
    id: z.string(),
    resumeId: z.string(),
    title: z.string(),
    authors: nullableString,
    publisher: nullableString,
    date: nullableString,
    url: nullableString,
    doi: nullableString,
    description: nullableString,
    order: z.number(),
    createdAt: isoDate,
    updatedAt: isoDate,
  })
  .strict();

const MasterResumeArchiveSchema = z
  .object({
    id: z.string(),
    userId: z.string(),
    name: z.string(),
    language: z.string(),
    isDefault: z.boolean(),
    contactInfo: nullableJsonObject,
    targetTitle: nullableString,
    professionalSummary: nullableString,
    createdAt: isoDate,
    updatedAt: isoDate,
    workCompanies: z.array(WorkCompanyArchiveSchema).default([]),
    educations: z.array(EducationArchiveSchema).default([]),
    skills: z.array(SkillArchiveSchema).default([]),
    certifications: z.array(CertificationArchiveSchema).default([]),
    awards: z.array(AwardArchiveSchema).default([]),
    projects: z.array(ProjectArchiveSchema).default([]),
    volunteeringRoles: z.array(VolunteeringRoleArchiveSchema).default([]),
    publications: z.array(PublicationArchiveSchema).default([]),
  })
  .strict();

const VacancyArchiveSchema = z
  .object({
    id: z.string(),
    userId: z.string(),
    companyName: z.string(),
    jobTitle: z.string(),
    location: nullableString,
    locationType: nullableString,
    salaryMin: nullableNumber,
    salaryMax: nullableNumber,
    currency: nullableString,
    sourceUrl: nullableString,
    rawText: nullableString,
    aiAnalysis: nullableJsonObject,
    createdAt: isoDate,
    updatedAt: isoDate,
  })
  .strict();

const ResumeDraftArchiveSchema = z
  .object({
    id: z.string(),
    applicationId: z.string(),
    name: z.string(),
    content: nullableJsonObject,
    status: z.string(),
    isActive: z.boolean(),
    templateId: z.string(),
    atsScore: nullableJsonObject,
    createdAt: isoDate,
    updatedAt: isoDate,
  })
  .strict();

const CoverLetterDraftArchiveSchema = z
  .object({
    id: z.string(),
    applicationId: z.string(),
    name: z.string(),
    content: nullableString,
    tone: z.string(),
    status: z.string(),
    isActive: z.boolean(),
    hiringManager: nullableString,
    createdAt: isoDate,
    updatedAt: isoDate,
  })
  .strict();

const ApplicationNoteArchiveSchema = z
  .object({
    id: z.string(),
    applicationId: z.string(),
    content: z.string(),
    createdAt: isoDate,
    updatedAt: isoDate,
  })
  .strict();

const ApplicationArchiveSchema = z
  .object({
    id: z.string(),
    vacancyId: z.string(),
    masterResumeId: nullableString,
    status: z.string(),
    salaryMin: nullableNumber,
    salaryMax: nullableNumber,
    proposedSalary: nullableNumber,
    dateSaved: isoDate,
    dateApplied: isoDate.nullable().optional(),
    interviewDate: isoDate.nullable().optional(),
    offerDate: isoDate.nullable().optional(),
    rejectedDate: isoDate.nullable().optional(),
    excitement: nullableNumber,
    aiSuggestions: nullableJsonObject,
    createdAt: isoDate,
    updatedAt: isoDate,
    resumeDrafts: z.array(ResumeDraftArchiveSchema).default([]),
    coverLetterDrafts: z.array(CoverLetterDraftArchiveSchema).default([]),
    notes: z.array(ApplicationNoteArchiveSchema).default([]),
  })
  .strict();

const AiProviderConfigArchiveSchema = z
  .object({
    id: z.string(),
    userId: z.string(),
    providerId: z.string(),
    apiKey: nullableString,
    model: z.string(),
    isDefault: z.boolean(),
    baseUrl: nullableString,
    displayName: nullableString,
    apiMode: nullableString,
    encryptionVersion: z.number().int().default(1),
    createdAt: isoDate,
    updatedAt: isoDate,
  })
  .strict();

const AiCallLogArchiveSchema = z
  .object({
    id: z.string(),
    userId: z.string(),
    operation: z.string(),
    providerId: z.string(),
    model: z.string(),
    applicationId: nullableString,
    tokensIn: nullableNumber,
    tokensOut: nullableNumber,
    durationMs: nullableNumber,
    error: nullableString,
    createdAt: isoDate,
  })
  .strict();

const AiPromptOverrideArchiveSchema = z
  .object({
    id: z.string(),
    userId: z.string(),
    promptKey: z.string(),
    template: z.string(),
    createdAt: isoDate,
    updatedAt: isoDate,
  })
  .strict();

export const UserArchiveSchema = z
  .object({
    version: z.literal(ARCHIVE_VERSION),
    appVersion: z.string(),
    createdAt: isoDate,
    userId: z.string(),
    user: UserArchiveSchemaRow,
    masterResumes: z.array(MasterResumeArchiveSchema),
    vacancies: z.array(VacancyArchiveSchema),
    applications: z.array(ApplicationArchiveSchema),
    aiProviderConfigs: z.array(AiProviderConfigArchiveSchema),
    aiCallLogs: z.array(AiCallLogArchiveSchema),
    aiPromptOverrides: z.array(AiPromptOverrideArchiveSchema),
  })
  .strict();

export type UserArchive = z.infer<typeof UserArchiveSchema>;
