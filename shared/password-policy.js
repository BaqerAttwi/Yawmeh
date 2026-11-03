import {z} from 'zod';

export const newPasswordSchema=z.string().min(8,'Use at least 8 characters.').max(24,'Use no more than 24 characters.');
