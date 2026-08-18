import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '@/test/mocks/db';

vi.mock('@/lib/db/client', async () => {
  const { db } = await import('@/test/mocks/db');
  return { db };
});

// Provider resolution is stubbed — tests never call real AI APIs.
vi.mock('@/lib/ai/providers', () => ({
  getProviderForUser: vi.fn().mockResolvedValue({
    model: 'stub-model',
    modelName: 'stub-model-name',
  }),
}));

// streamText/streamObject are captured so tests can fire onFinish/onError
// and assert the logging + persistence side effects.
const streamText = vi.hoisted(() => vi.fn());
const streamObject = vi.hoisted(() => vi.fn());
vi.mock('ai', () => ({
  streamText: streamText,
  streamObject: streamObject,
}));

// The master-resume query layer has its own tests; stub it with a fixture.
vi.mock('@/server/queries/master-resume', () => ({
  getFullMasterResume: vi.fn().mockResolvedValue({
    workCompanies: [],
    educations: [],
    skills: [],
    certifications: [],
    awards: [],
    projects: [],
    volunteeringRoles: [],
    publications: [],
    contactInfo: null,
    targetTitle: null,
    professionalSummary: null,
  }),
}));

import { analyzeVacancy } from '../operations/analyze-vacancy';
import { runAtsCheck } from '../operations/ats-check';
import { generateCoverLetter } from '../operations/cover-letter';
import { getResumeSuggestions } from '../operations/resume-suggestions';
import { rephraseBullet } from '../operations/rephrase';
import { importResume } from '../operations/import-resume';
import { getFullMasterResume } from '@/server/queries/master-resume';

function lastStreamCall() {
  return streamText.mock.calls[streamText.mock.calls.length - 1][0];
}

// Operations declare real SDK return types; at runtime the mock harness
// exposes __finish/__error. This cast bridges the two.
type StreamHarness = {
  __finish: (event: unknown) => Promise<void>;
  __error: (err: unknown) => Promise<void>;
};
function asHarness(result: unknown): StreamHarness {
  return result as StreamHarness;
}

beforeEach(() => {
  vi.clearAllMocks();
  type StreamOpts = {
    onFinish?: (e: unknown) => Promise<void>;
    onError?: (e: unknown) => Promise<void>;
  };
  const makeResult = (opts: StreamOpts) => ({
    async __finish(event: unknown) {
      await opts.onFinish?.(event);
    },
    async __error(err: unknown) {
      await opts.onError?.(err);
    },
  });
  streamText.mockImplementation((opts: StreamOpts) => makeResult(opts));
  streamObject.mockImplementation((opts: StreamOpts) => makeResult(opts));
});

describe('analyzeVacancy', () => {
  it('feeds vacancy text and resume summary into the prompt', async () => {
    db.application.findUnique.mockResolvedValue({
      id: 'app-1',
      vacancyId: 'vac-1',
      masterResumeId: 'mr-1',
      vacancy: { id: 'vac-1', rawText: 'We need a senior TypeScript engineer.' },
      masterResume: { language: 'en' },
    });
    db.aiPromptOverride.findUnique.mockResolvedValue(null);

    await analyzeVacancy('user-1', 'app-1', 'openai');

    const opts = lastStreamCall();
    expect(opts.prompt).toContain('We need a senior TypeScript engineer.');
    expect(opts.system).toContain('English');
  });

  it('throws when the vacancy has no raw text', async () => {
    db.application.findUnique.mockResolvedValue({
      id: 'app-1',
      vacancyId: 'vac-1',
      masterResumeId: null,
      vacancy: { id: 'vac-1', rawText: null },
      masterResume: null,
    });
    await expect(analyzeVacancy('user-1', 'app-1', 'openai')).rejects.toThrow(
      /no text to analyze/i
    );
  });

  it('persists parsed JSON to vacancy.aiAnalysis on finish', async () => {
    db.application.findUnique.mockResolvedValue({
      id: 'app-1',
      vacancyId: 'vac-1',
      masterResumeId: null,
      vacancy: { id: 'vac-1', rawText: 'text' },
      masterResume: null,
    });
    db.aiPromptOverride.findUnique.mockResolvedValue(null);

    const result = await analyzeVacancy('user-1', 'app-1', 'openai');
    await asHarness(result).__finish({
      finishReason: 'stop',
      text: '{"responsibilities":["build"]}',
      totalUsage: { inputTokens: 10, outputTokens: 20 },
    });

    expect(db.vacancy.update).toHaveBeenCalledWith({
      where: { id: 'vac-1' },
      data: { aiAnalysis: { responsibilities: ['build'] } },
    });
    expect(db.aiCallLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          operation: 'analyze-vacancy',
          providerId: 'openai',
          tokensIn: 10,
          tokensOut: 20,
          error: null,
        }),
      })
    );
  });

  it('falls back to { raw } when output is not valid JSON', async () => {
    db.application.findUnique.mockResolvedValue({
      id: 'app-1',
      vacancyId: 'vac-1',
      masterResumeId: null,
      vacancy: { id: 'vac-1', rawText: 'text' },
      masterResume: null,
    });
    db.aiPromptOverride.findUnique.mockResolvedValue(null);

    const result = await analyzeVacancy('user-1', 'app-1', 'openai');
    await asHarness(result).__finish({
      finishReason: 'stop',
      text: 'not json at all',
      totalUsage: { inputTokens: 1, outputTokens: 2 },
    });

    expect(db.vacancy.update).toHaveBeenCalledWith({
      where: { id: 'vac-1' },
      data: { aiAnalysis: { raw: 'not json at all' } },
    });
  });

  it('logs truncation as an error and skips persisting', async () => {
    db.application.findUnique.mockResolvedValue({
      id: 'app-1',
      vacancyId: 'vac-1',
      masterResumeId: null,
      vacancy: { id: 'vac-1', rawText: 'text' },
      masterResume: null,
    });
    db.aiPromptOverride.findUnique.mockResolvedValue(null);

    const result = await analyzeVacancy('user-1', 'app-1', 'openai');
    await asHarness(result).__finish({
      finishReason: 'length',
      text: '{"half":',
      totalUsage: { inputTokens: 5, outputTokens: 8192 },
    });

    expect(db.vacancy.update).not.toHaveBeenCalled();
    expect(db.aiCallLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ error: expect.stringMatching(/truncated/i) }),
      })
    );
  });

  it('logs stream errors to aiCallLog', async () => {
    db.application.findUnique.mockResolvedValue({
      id: 'app-1',
      vacancyId: 'vac-1',
      masterResumeId: null,
      vacancy: { id: 'vac-1', rawText: 'text' },
      masterResume: null,
    });
    db.aiPromptOverride.findUnique.mockResolvedValue(null);

    const result = await analyzeVacancy('user-1', 'app-1', 'openai');
    await asHarness(result).__error(new Error('provider 502'));

    expect(db.aiCallLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ error: 'provider 502' }),
      })
    );
  });
});

describe('runAtsCheck', () => {
  const DRAFT = {
    id: 'draft-1',
    applicationId: 'app-1',
    content: { skills: [{ name: 'TypeScript' }] },
    application: {
      vacancy: { id: 'vac-1', rawText: 'Must know TypeScript.' },
      masterResume: { language: 'en' },
    },
  };

  it('feeds resume text and vacancy text into the prompt', async () => {
    db.resumeDraft.findUnique.mockResolvedValue(DRAFT);
    db.aiPromptOverride.findUnique.mockResolvedValue(null);

    await runAtsCheck('user-1', 'draft-1', 'anthropic');

    const opts = lastStreamCall();
    expect(opts.prompt).toContain('Must know TypeScript.');
    expect(opts.prompt).toContain('TypeScript'); // resume content serialized
    expect(opts.system).toContain('English');
  });

  it('throws when there is no vacancy text', async () => {
    db.resumeDraft.findUnique.mockResolvedValue({
      ...DRAFT,
      application: { vacancy: { id: 'vac-1', rawText: null }, masterResume: null },
    });
    await expect(runAtsCheck('user-1', 'draft-1', 'anthropic')).rejects.toThrow(
      /no job posting text/i
    );
  });

  it('persists the parsed ATS report to resumeDraft.atsScore', async () => {
    db.resumeDraft.findUnique.mockResolvedValue(DRAFT);
    db.aiPromptOverride.findUnique.mockResolvedValue(null);

    const result = await runAtsCheck('user-1', 'draft-1', 'anthropic');
    await asHarness(result).__finish({
      finishReason: 'stop',
      text: '{"score": 78}',
      totalUsage: { inputTokens: 3, outputTokens: 4 },
    });

    expect(db.resumeDraft.update).toHaveBeenCalledWith({
      where: { id: 'draft-1' },
      data: { atsScore: { score: 78 } },
    });
    expect(db.aiCallLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ operation: 'ats-check', applicationId: 'app-1' }),
      })
    );
  });
});

describe('generateCoverLetter', () => {
  const APP = {
    id: 'app-1',
    vacancyId: 'vac-1',
    masterResumeId: null,
    vacancy: { id: 'vac-1', companyName: 'Acme', jobTitle: 'Eng', rawText: 'Join Acme.' },
    masterResume: null,
    resumeDrafts: [],
  };

  it('builds the prompt with company, title, tone and vacancy text', async () => {
    db.application.findUnique.mockResolvedValue(APP);
    db.aiPromptOverride.findUnique.mockResolvedValue(null);

    await generateCoverLetter('user-1', 'app-1', 'professional', 'openai');

    const opts = lastStreamCall();
    expect(opts.prompt).toContain('Acme');
    expect(opts.prompt).toContain('Eng');
    expect(opts.prompt).toContain('Join Acme.');
    expect(opts.prompt).toContain('professional');
  });

  it('throws when the application has no vacancy', async () => {
    db.application.findUnique.mockResolvedValue({ ...APP, vacancy: null });
    await expect(generateCoverLetter('user-1', 'app-1', 'professional', 'openai')).rejects.toThrow(
      /vacancy not found/i
    );
  });

  it('applies German market rules for de language', async () => {
    db.application.findUnique.mockResolvedValue({ ...APP, masterResume: { language: 'de' } });
    db.aiPromptOverride.findUnique.mockResolvedValue(null);

    await generateCoverLetter('user-1', 'app-1', 'warm', 'openai');

    const opts = lastStreamCall();
    expect(opts.system).toContain('German ("de") Market Rules');
  });
});

describe('getResumeSuggestions', () => {
  const APP = {
    id: 'app-1',
    vacancyId: 'vac-1',
    masterResumeId: null,
    vacancy: { id: 'vac-1', rawText: 'Looking for React devs.', aiAnalysis: null },
    masterResume: null,
  };

  it('lists master resume items with their ids in the prompt', async () => {
    db.application.findUnique.mockResolvedValue(APP);
    db.aiPromptOverride.findUnique.mockResolvedValue(null);
    vi.mocked(getFullMasterResume).mockResolvedValueOnce({
      workCompanies: [
        {
          id: 'wc-1',
          name: 'Globex',
          roles: [
            {
              id: 'role-1',
              title: 'Dev',
              responsibilities: ['built things'],
              achievements: null,
              projects: [],
            },
          ],
        },
      ],
      skills: [{ id: 'skill-1', name: 'React', category: 'Frontend' }],
      projects: [],
    } as unknown as Awaited<ReturnType<typeof getFullMasterResume>>);

    await getResumeSuggestions('user-1', 'app-1', 'openai');

    const opts = lastStreamCall();
    expect(opts.prompt).toContain('Looking for React devs.');
    expect(opts.prompt).toContain('Globex');
    expect(opts.prompt).toContain('skillId: "skill-1"');
  });

  it('throws when there is no vacancy text', async () => {
    db.application.findUnique.mockResolvedValue({
      ...APP,
      vacancy: { id: 'vac-1', rawText: null, aiAnalysis: null },
    });
    await expect(getResumeSuggestions('user-1', 'app-1', 'openai')).rejects.toThrow(
      /no job posting text/i
    );
  });
});

describe('rephraseBullet', () => {
  it('includes the original text, direction and context', async () => {
    db.aiPromptOverride.findUnique.mockResolvedValue(null);

    await rephraseBullet('Built the thing', 'stronger', 'E-commerce checkout', 'openai', 'user-1');

    const opts = lastStreamCall();
    expect(opts.prompt).toContain('Built the thing');
    expect(opts.prompt).toContain('E-commerce checkout');
    expect(db.aiCallLog.create).not.toHaveBeenCalled();
  });

  it('logs to aiCallLog on finish', async () => {
    db.aiPromptOverride.findUnique.mockResolvedValue(null);

    const result = await rephraseBullet('text', 'quantified', 'ctx', 'openai', 'user-1');
    await asHarness(result).__finish({
      finishReason: 'stop',
      text: 'rephrased',
      totalUsage: { inputTokens: 7, outputTokens: 8 },
    });

    expect(db.aiCallLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ operation: 'rephrase', tokensIn: 7, tokensOut: 8 }),
      })
    );
  });
});

describe('importResume', () => {
  it('sends the parsed file text as the prompt', async () => {
    db.aiPromptOverride.findUnique.mockResolvedValue(null);

    await importResume('user-1', 'John Doe — Engineer — 10 years', 'openai');

    expect(streamObject).toHaveBeenCalledWith(
      expect.objectContaining({ prompt: 'John Doe — Engineer — 10 years' })
    );
  });

  it('logs to aiCallLog on finish', async () => {
    db.aiPromptOverride.findUnique.mockResolvedValue(null);

    const result = await importResume('user-1', 'resume text', 'openai');
    await asHarness(result).__finish({
      usage: { inputTokens: 11, outputTokens: 12 },
      object: { workCompanies: [{ name: 'A' }], educations: [], skills: [] },
    });

    expect(db.aiCallLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          operation: 'import-resume',
          tokensIn: 11,
          tokensOut: 12,
        }),
      })
    );
  });
});
