import { z } from 'zod';

export const ApplicationStatusValues = [
  'saved',
  'planned',
  'applied',
  'screening',
  'interview',
  'offer',
  'rejected',
  'on_hold',
] as const;

export const LocationTypeValues = ['On-site', 'Hybrid', 'Remote'] as const;

export const NOTE_MAX_LENGTH = 2000;

export const NoteSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, 'Note cannot be empty.')
    .max(NOTE_MAX_LENGTH, `Note must be ${NOTE_MAX_LENGTH} characters or fewer.`),
});

export const CONTACT_NAME_MAX = 100;
export const CONTACT_ROLE_MAX = 100;
export const CONTACT_PHONE_MAX = 50;

export const ContactPersonSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Contact name is required.')
    .max(CONTACT_NAME_MAX, `Name must be ${CONTACT_NAME_MAX} characters or fewer.`),
  role: z
    .string()
    .trim()
    .max(CONTACT_ROLE_MAX, `Role must be ${CONTACT_ROLE_MAX} characters or fewer.`)
    .optional(),
  email: z.string().trim().max(255).email('Invalid email.').optional().or(z.literal('')),
  phone: z
    .string()
    .trim()
    .max(CONTACT_PHONE_MAX, `Phone must be ${CONTACT_PHONE_MAX} characters or fewer.`)
    .optional(),
  linkedinUrl: z.string().trim().max(500).url('Invalid URL.').optional().or(z.literal('')),
});

export const CreateApplicationSchema = z.object({
  companyName: z.string().min(1, 'Company name is required'),
  jobTitle: z.string().min(1, 'Job title is required'),
  location: z.string().optional(),
  locationType: z.enum(LocationTypeValues).optional(),
  salaryMin: z.string().optional(),
  salaryMax: z.string().optional(),
  proposedSalary: z.string().optional(),
  currency: z.string().optional(),
  sourceUrl: z.string().url('Invalid URL').optional().or(z.literal('')),
  rawText: z.string().optional(),
  masterResumeId: z.string().min(1),
  contact: ContactPersonSchema.optional(),
});

export const UpdateApplicationStatusSchema = z.object({
  status: z.enum(ApplicationStatusValues),
});

export const UpdateExcitementSchema = z.object({
  excitement: z.number().int().min(1).max(5),
});

export const UpdateTrackingSchema = z.object({
  dateApplied: z.string().optional(),
  interviewDate: z.string().optional(),
  offerDate: z.string().optional(),
  rejectedDate: z.string().optional(),
  salaryMin: z.number().int().positive().optional().nullable(),
  salaryMax: z.number().int().positive().optional().nullable(),
  proposedSalary: z.number().int().positive().optional().nullable(),
  excitement: z.number().int().min(1).max(5).optional(),
});

export type CreateApplicationInput = z.infer<typeof CreateApplicationSchema>;
export type ApplicationStatus = (typeof ApplicationStatusValues)[number];
export type NoteInput = z.infer<typeof NoteSchema>;
export type ContactPersonInput = z.infer<typeof ContactPersonSchema>;
