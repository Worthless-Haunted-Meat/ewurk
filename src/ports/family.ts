import type { Family } from '../domain/types.js';

export interface FamilyStore {
  /** Only whitelisted fields are ever accepted/persisted (R22 - no SSN/bank/income). */
  create(input: { name: string; contact: string; neighborhood?: string }): Family;
  getById(id: number): Family | null;
  search(nameQuery: string): Family[];
  list(): Family[];
}
