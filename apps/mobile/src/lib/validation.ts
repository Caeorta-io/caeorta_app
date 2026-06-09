import { z } from 'zod';

/** Trimmed, RFC-ish email. Used to gate the OTP request on the sign-in screen. */
export const emailSchema = z.string().trim().email();

/** Exactly six digits — the Supabase email OTP shape. */
export const otpSchema = z.string().trim().regex(/^\d{6}$/);
