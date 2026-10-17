// A small component map for testing the mechanism without Flourprint's own components.
import { createLibrary } from '../../src/library.ts';

export interface BadgeProps {
  readonly label: string;
  readonly tone?: 'neutral' | 'warning';
}
export interface CardProps {
  readonly title: string;
}
export type TestComponents = { 'fp.badge': BadgeProps; 'fp.card': CardProps };

export const testLibrary = createLibrary<TestComponents>();
