import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const downloadMock = vi.fn();
const restoreMock = vi.fn();
vi.mock('@/server/actions/data-export', () => ({
  downloadUserArchive: (...args: unknown[]) => downloadMock(...args),
  restoreUserArchive: (...args: unknown[]) => restoreMock(...args),
}));

import { DataExportPanel } from '@/components/settings/DataExportPanel';
import { sampleArchiveJson } from '@/test/fixtures/data-export';
import { ARCHIVE_VERSION } from '@/lib/validations/data-export';

beforeEach(() => {
  vi.clearAllMocks();
  downloadMock.mockReset();
  restoreMock.mockReset();
  // jsdom doesn't implement URL.createObjectURL / revokeObjectURL
  vi.stubGlobal('URL', {
    ...URL,
    createObjectURL: vi.fn(() => 'blob:mock-url'),
    revokeObjectURL: vi.fn(),
  });
  // jsdom doesn't actually navigate on a.click() — stub to be safe
  HTMLAnchorElement.prototype.click = vi.fn();
});

function selectFile(input: HTMLInputElement, contents: string, name = 'archive.json') {
  const file = new File([contents], name, { type: 'application/json' });
  Object.defineProperty(input, 'files', { value: [file], configurable: true });
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

/** The file <input> isn't labelled via htmlFor/id, so query it by type. */
function getFileInput(container: HTMLElement): HTMLInputElement {
  const input = container.querySelector('input[type="file"]');
  if (!input) throw new Error('file input not rendered');
  return input as HTMLInputElement;
}

describe('DataExportPanel — rendering', () => {
  it('renders the Export and Import / Restore cards', () => {
    render(<DataExportPanel />);
    expect(screen.getByText('Export')).toBeInTheDocument();
    expect(screen.getByText('Import / Restore')).toBeInTheDocument();
  });

  it('renders the Download backup button', () => {
    render(<DataExportPanel />);
    expect(screen.getByRole('button', { name: /download backup/i })).toBeInTheDocument();
  });
});

describe('DataExportPanel — export', () => {
  it('calls downloadUserArchive and triggers a blob download on click', async () => {
    downloadMock.mockResolvedValue({
      filename: 'reeesume-backup-2026-07-02-1300.json',
      json: '{}',
    });
    render(<DataExportPanel />);

    await userEvent.click(screen.getByRole('button', { name: /download backup/i }));

    await waitFor(() => expect(downloadMock).toHaveBeenCalledTimes(1));
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalledWith(
      'Backup downloaded as reeesume-backup-2026-07-02-1300.json'
    );
  });

  it('shows an error toast when the export throws', async () => {
    downloadMock.mockRejectedValue(new Error('boom'));
    render(<DataExportPanel />);

    await userEvent.click(screen.getByRole('button', { name: /download backup/i }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Failed to generate backup'));
  });
});

describe('DataExportPanel — import preview', () => {
  it('shows version and per-section counts after selecting a valid archive', async () => {
    const { container } = render(<DataExportPanel />);
    const input = getFileInput(container);
    selectFile(input, sampleArchiveJson);

    // FileReader.readAsText fires onload async — use findBy to wait.
    const versionLabel = await screen.findByText(/archive version/i);
    expect(versionLabel.parentElement).toHaveTextContent(String(ARCHIVE_VERSION));

    const contents = await screen.findByText(/contents:/i);
    expect(contents).toHaveTextContent(/1 master resume/i);
    expect(contents).toHaveTextContent(/1 vacancies/i);
    expect(contents).toHaveTextContent(/1 applications/i);
    expect(contents).toHaveTextContent(/1 AI configs/i);
  });

  it('shows an error when the file is not valid JSON', async () => {
    const { container } = render(<DataExportPanel />);
    const input = getFileInput(container);
    selectFile(input, '{not json');

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/not valid JSON/i);
  });

  it('reveals the type-to-confirm field only after a valid preview', async () => {
    const { container } = render(<DataExportPanel />);
    expect(screen.queryByPlaceholderText('restore')).not.toBeInTheDocument();

    const input = getFileInput(container);
    selectFile(input, sampleArchiveJson);

    expect(await screen.findByPlaceholderText('restore')).toBeInTheDocument();
  });

  it('does not show a preview when the JSON is malformed', async () => {
    const { container } = render(<DataExportPanel />);
    const input = getFileInput(container);
    selectFile(input, '{not json');

    // Wait for the error alert to confirm FileReader completed.
    await screen.findByRole('alert');
    expect(screen.queryByText(/archive version/i)).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText('restore')).not.toBeInTheDocument();
  });
});

describe('DataExportPanel — restore confirmation', () => {
  it('keeps the Restore button disabled until the user types "restore"', async () => {
    const { container } = render(<DataExportPanel />);
    const input = getFileInput(container);
    selectFile(input, sampleArchiveJson);

    const restoreBtn = await screen.findByRole('button', { name: /restore \(destructive\)/i });
    expect(restoreBtn).toBeDisabled();

    const confirmInput = await screen.findByPlaceholderText('restore');
    await userEvent.type(confirmInput, 'restor');
    expect(restoreBtn).toBeDisabled();

    await userEvent.clear(confirmInput);
    await userEvent.type(confirmInput, 'restore');
    expect(restoreBtn).not.toBeDisabled();
  });

  it('calls restoreUserArchive with the file contents on click and shows a success toast', async () => {
    restoreMock.mockResolvedValue({ ok: true, summary: 'Restored 1 master resume(s).' });
    const { container } = render(<DataExportPanel />);

    const input = getFileInput(container);
    selectFile(input, sampleArchiveJson);
    const confirmInput = await screen.findByPlaceholderText('restore');
    await userEvent.type(confirmInput, 'restore');

    await act(async () => {
      await userEvent.click(screen.getByRole('button', { name: /restore \(destructive\)/i }));
    });

    await waitFor(() => expect(restoreMock).toHaveBeenCalledTimes(1));
    expect(restoreMock).toHaveBeenCalledWith(sampleArchiveJson);
    expect(toast.success).toHaveBeenCalledWith('Restored 1 master resume(s).');
  });

  it('shows the error message via toast when restore returns ok:false', async () => {
    restoreMock.mockResolvedValue({ ok: false, error: 'Archive version 99 is not supported.' });
    const { container } = render(<DataExportPanel />);

    const input = getFileInput(container);
    selectFile(input, sampleArchiveJson);
    const confirmInput = await screen.findByPlaceholderText('restore');
    await userEvent.type(confirmInput, 'restore');

    await act(async () => {
      await userEvent.click(screen.getByRole('button', { name: /restore \(destructive\)/i }));
    });

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Archive version 99 is not supported.')
    );
  });
});
