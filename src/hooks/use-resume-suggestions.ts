'use client';

import { useState, useCallback } from 'react';
import type { ResumeSuggestions } from '@/lib/ai/prompts/resume-suggestions';

export function useResumeSuggestions(applicationId: string) {
  const [suggestions, setSuggestions] = useState<ResumeSuggestions | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getSuggestions = useCallback(
    async (providerId: string) => {
      setIsLoading(true);
      setError(null);
      setSuggestions(null);

      try {
        const res = await fetch('/api/ai/resume-suggestions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ applicationId, providerId }),
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || 'Suggestions failed');
        }

        if (!res.body) throw new Error('No response body');

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          fullText += decoder.decode(value, { stream: true });
        }

        const jsonMatch = fullText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            setSuggestions(JSON.parse(jsonMatch[0]));
          } catch {
            throw new Error(
              'The AI response was incomplete (likely a token limit). Please try again.'
            );
          }
        } else {
          throw new Error(
            'The AI response was incomplete (likely a token limit). Please try again.'
          );
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Suggestions failed');
      } finally {
        setIsLoading(false);
      }
    },
    [applicationId]
  );

  return { getSuggestions, suggestions, isLoading, error };
}
