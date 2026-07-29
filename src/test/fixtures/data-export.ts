import type { UserArchive } from '@/lib/validations/data-export';
import { ARCHIVE_VERSION } from '@/lib/validations/data-export';

/**
 * Minimal-but-realistic archive used across the data-export test suite.
 * Dates are ISO strings (the wire format) — the reviver in restoreUserArchive
 * converts them back to Date instances during parse.
 */
export const sampleArchive: UserArchive = {
  version: ARCHIVE_VERSION,
  appVersion: '0.1.0-test',
  createdAt: '2026-07-02T12:00:00.000Z',
  userId: 'test-user',
  user: {
    id: 'test-user',
    email: 'test@example.com',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  masterResumes: [
    {
      id: 'resume-1',
      userId: 'test-user',
      name: 'Default',
      language: 'en',
      isDefault: true,
      contactInfo: { name: 'Test User', email: 'test@example.com' },
      targetTitle: 'Senior Engineer',
      professionalSummary: 'A test user.',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      workCompanies: [
        {
          id: 'company-1',
          resumeId: 'resume-1',
          name: 'Acme',
          location: 'SF',
          employmentType: 'Full-time',
          startDate: 'Jan 2020',
          endDate: null,
          order: 0,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
          roles: [
            {
              id: 'role-1',
              companyId: 'company-1',
              title: 'Engineer',
              startDate: 'Jan 2020',
              endDate: null,
              order: 0,
              createdAt: '2026-01-01T00:00:00.000Z',
              updatedAt: '2026-01-01T00:00:00.000Z',
              projects: [
                {
                  id: 'project-1',
                  roleId: 'role-1',
                  name: 'Migration',
                  order: 0,
                  createdAt: '2026-01-01T00:00:00.000Z',
                  updatedAt: '2026-01-01T00:00:00.000Z',
                },
              ],
            },
          ],
        },
      ],
      educations: [],
      skills: [],
      certifications: [],
      awards: [],
      projects: [],
      volunteeringRoles: [],
      publications: [],
    },
  ],
  vacancies: [
    {
      id: 'vacancy-1',
      userId: 'test-user',
      companyName: 'Acme',
      jobTitle: 'Engineer',
      location: 'SF',
      locationType: 'Hybrid',
      salaryMin: 100000,
      salaryMax: 150000,
      currency: 'USD',
      sourceUrl: null,
      rawText: null,
      aiAnalysis: null,
      createdAt: '2026-02-01T00:00:00.000Z',
      updatedAt: '2026-02-01T00:00:00.000Z',
    },
  ],
  applications: [
    {
      id: 'application-1',
      vacancyId: 'vacancy-1',
      masterResumeId: 'resume-1',
      status: 'applied',
      salaryMin: null,
      salaryMax: null,
      proposedSalary: 120000,
      dateSaved: '2026-02-01T00:00:00.000Z',
      dateApplied: '2026-02-03T00:00:00.000Z',
      interviewDate: null,
      offerDate: null,
      rejectedDate: null,
      excitement: 4,
      aiSuggestions: null,
      createdAt: '2026-02-01T00:00:00.000Z',
      updatedAt: '2026-02-03T00:00:00.000Z',
      resumeDrafts: [
        {
          id: 'draft-1',
          applicationId: 'application-1',
          name: 'Draft 1',
          content: null,
          status: 'ready',
          isActive: true,
          templateId: 'ats-simple',
          atsScore: null,
          createdAt: '2026-02-02T00:00:00.000Z',
          updatedAt: '2026-02-02T00:00:00.000Z',
        },
      ],
      coverLetterDrafts: [],
      notes: [
        {
          id: 'note-1',
          applicationId: 'application-1',
          content: 'Submitted',
          createdAt: '2026-02-03T00:00:00.000Z',
          updatedAt: '2026-02-03T00:00:00.000Z',
        },
      ],
    },
  ],
  aiProviderConfigs: [
    {
      id: 'config-1',
      userId: 'test-user',
      providerId: 'openai',
      apiKey: 'base64-ciphertext',
      model: 'gpt-4o',
      isDefault: true,
      baseUrl: null,
      displayName: null,
      apiMode: null,
      encryptionVersion: 2,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ],
  aiCallLogs: [],
  aiPromptOverrides: [],
};

/** Stringify the sample archive — what a real exported file looks like. */
export const sampleArchiveJson = JSON.stringify(sampleArchive, null, 2);
