import type { Donation, DonationStatus } from '../domain/types.js';

export interface DonationStore {
  create(input: { donorOrg: string; pickupDate: string }): Donation;
  getById(id: number): Donation | null;
  list(): Donation[];
  updateStatus(id: number, status: DonationStatus): Donation;
}
