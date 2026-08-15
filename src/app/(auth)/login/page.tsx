'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const emailSchema = z.object({
  email: z.string().email('Please enter a valid email'),
});

const otpSchema = z.object({
  code: z.string().length(6, 'Code must be 6 digits'),
});

type EmailForm = z.infer<typeof emailSchema>;
type OtpForm = z.infer<typeof otpSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const emailForm = useForm<EmailForm>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: '' },
  });

  const otpForm = useForm<OtpForm>({
    resolver: zodResolver(otpSchema),
    defaultValues: { code: '' },
  });

  async function onEmailSubmit(data: EmailForm) {
    setError('');
    try {
      const result = await signIn('nodemailer', {
        email: data.email,
        redirect: false,
      });
      if (result?.error) {
        setError('Could not send verification code. Please try again.');
        return;
      }
      setEmail(data.email);
      setStep('otp');
    } catch {
      setError('Something went wrong. Please try again.');
    }
  }

  async function onOtpSubmit(data: OtpForm) {
    setError('');
    const result = await signIn('otp', {
      email,
      code: data.code,
      redirect: false,
    });
    if (result?.error) {
      setError('Invalid or expired code.');
      return;
    }
    router.push('/');
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-muted/40">
      <Image
        src="/logo-wordmark-320.png"
        alt="Reeesume"
        width={320}
        height={60}
        priority
        className="h-14 w-auto"
      />
      <Card className="w-full max-w-sm">
        {step === 'email' ? (
          <>
            <CardHeader>
              <CardTitle>Sign in</CardTitle>
              <CardDescription>Enter your email to receive a verification code.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    {...emailForm.register('email')}
                  />
                  {emailForm.formState.errors.email && (
                    <p className="text-sm text-destructive">
                      {emailForm.formState.errors.email.message}
                    </p>
                  )}
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button type="submit" className="w-full">
                  Send code
                </Button>
              </form>
            </CardContent>
          </>
        ) : (
          <>
            <CardHeader>
              <CardTitle>Check your email</CardTitle>
              <CardDescription>We sent a verification code to {email}.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={otpForm.handleSubmit(onOtpSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Verification code</Label>
                  <Input
                    id="code"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="123456"
                    {...otpForm.register('code')}
                  />
                  {otpForm.formState.errors.code && (
                    <p className="text-sm text-destructive">
                      {otpForm.formState.errors.code.message}
                    </p>
                  )}
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button type="submit" className="w-full">
                  Verify
                </Button>
              </form>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}
