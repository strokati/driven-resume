import { vi } from 'vitest';

function createModelMock() {
  return {
    findUnique: vi.fn(),
    findUniqueOrThrow: vi.fn(),
    findFirst: vi.fn(),
    findFirstOrThrow: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    createMany: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    upsert: vi.fn(),
    count: vi.fn(),
    aggregate: vi.fn(),
    groupBy: vi.fn(),
  };
}

export const db = {
  user: createModelMock(),
  session: createModelMock(),
  otpCode: createModelMock(),
  masterResume: createModelMock(),
  workCompany: createModelMock(),
  workRole: createModelMock(),
  workProject: createModelMock(),
  education: createModelMock(),
  skill: createModelMock(),
  certification: createModelMock(),
  award: createModelMock(),
  project: createModelMock(),
  volunteeringRole: createModelMock(),
  publication: createModelMock(),
  vacancy: createModelMock(),
  application: createModelMock(),
  resumeDraft: createModelMock(),
  coverLetterDraft: createModelMock(),
  applicationNote: createModelMock(),
  applicationContact: createModelMock(),
  aiProviderConfig: createModelMock(),
  aiCallLog: createModelMock(),
  aiPromptOverride: createModelMock(),
  rateLimit: createModelMock(),
  $transaction: vi.fn((arg: unknown) => {
    if (typeof arg === 'function') return arg(db);
    return Promise.all(arg as unknown[]);
  }),
};

vi.mock('@/lib/db/client', () => ({ db }));
