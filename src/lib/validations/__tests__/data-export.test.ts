import { describe, it, expect } from 'vitest';
import { UserArchiveSchema, ARCHIVE_VERSION } from '@/lib/validations/data-export';
import { sampleArchive } from '@/test/fixtures/data-export';

describe('UserArchiveSchema', () => {
  it('accepts a complete, well-formed archive', () => {
    const result = UserArchiveSchema.safeParse(sampleArchive);
    expect(result.success).toBe(true);
  });

  it('reports a missing version field', () => {
    const { version: _v, ...rest } = sampleArchive;
    void _v;
    const result = UserArchiveSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects an unsupported version', () => {
    const result = UserArchiveSchema.safeParse({ ...sampleArchive, version: 99 });
    expect(result.success).toBe(false);
  });

  it('rejects a missing top-level key (user)', () => {
    const { user: _u, ...rest } = sampleArchive;
    void _u;
    const result = UserArchiveSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects a missing top-level key (applications)', () => {
    const { applications: _a, ...rest } = sampleArchive;
    void _a;
    const result = UserArchiveSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('accepts archives with empty arrays (fresh-user case)', () => {
    const fresh = {
      ...sampleArchive,
      masterResumes: [],
      vacancies: [],
      applications: [],
      aiProviderConfigs: [],
      aiCallLogs: [],
      aiPromptOverrides: [],
    };
    const result = UserArchiveSchema.safeParse(fresh);
    expect(result.success).toBe(true);
  });

  it('rejects archives with unknown leaf fields (strict-mode injection defense)', () => {
    const withExtras = {
      ...sampleArchive,
      masterResumes: sampleArchive.masterResumes.map((mr) => ({
        ...mr,
        futureField: 'unknown',
        anotherFutureField: 42,
      })),
    };
    const result = UserArchiveSchema.safeParse(withExtras);
    expect(result.success).toBe(false);
  });

  it('rejects a malicious archive with injected isDefault: true', () => {
    // Even though isDefault is a known field, the strict schema exposes it as
    // a boolean — an attacker cannot escalate privileges by claiming default
    // status via a stringified/coerced shape.
    const tampered = {
      ...sampleArchive,
      masterResumes: sampleArchive.masterResumes.map((mr) => ({
        ...mr,
        isDefault: 'true', // wrong type
      })),
    };
    const result = UserArchiveSchema.safeParse(tampered);
    expect(result.success).toBe(false);
  });

  it('rejects a non-string appVersion', () => {
    const result = UserArchiveSchema.safeParse({ ...sampleArchive, appVersion: 1 });
    expect(result.success).toBe(false);
  });

  it('rejects a non-ISO createdAt', () => {
    const result = UserArchiveSchema.safeParse({ ...sampleArchive, createdAt: 'yesterday' });
    expect(result.success).toBe(false);
  });

  it('exposes ARCHIVE_VERSION as a constant matching the schema', () => {
    expect(ARCHIVE_VERSION).toBe(2);
    const result = UserArchiveSchema.safeParse(sampleArchive);
    if (result.success) {
      expect(result.data.version).toBe(ARCHIVE_VERSION);
    }
  });

  it('still accepts v1 archives (pre-contact) for restore', () => {
    const v1 = { ...sampleArchive, version: 1 };
    const result = UserArchiveSchema.safeParse(v1);
    expect(result.success).toBe(true);
  });

  it('accepts an application with a contact', () => {
    const withContact = {
      ...sampleArchive,
      applications: sampleArchive.applications.map((app, i) =>
        i === 0
          ? {
              ...app,
              contact: {
                id: 'contact-1',
                applicationId: app.id,
                name: 'Jane Doe',
                role: 'Recruiter',
                email: 'jane@acme.com',
                phone: null,
                linkedinUrl: null,
                createdAt: '2026-08-15T10:00:00.000Z',
                updatedAt: '2026-08-15T10:00:00.000Z',
              },
            }
          : app
      ),
    };
    const result = UserArchiveSchema.safeParse(withContact);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.applications[0].contact?.name).toBe('Jane Doe');
    }
  });

  it('defaults a missing contact to null (v1 archives without the field)', () => {
    const noContact = {
      ...sampleArchive,
      version: 1 as const,
      applications: sampleArchive.applications.map(({ contact: _c, ...app }) => {
        void _c;
        return app;
      }),
    };
    const result = UserArchiveSchema.safeParse(noContact);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.applications[0].contact).toBeNull();
    }
  });

  it('rejects a malformed contact (wrong field type)', () => {
    const badContact = {
      ...sampleArchive,
      applications: sampleArchive.applications.map((app, i) =>
        i === 0 ? { ...app, contact: { ...app, name: 42 } } : app
      ),
    };
    const result = UserArchiveSchema.safeParse(badContact);
    expect(result.success).toBe(false);
  });
});
