import type { Device, Donation } from '../domain/types.js';
import type { DonationStore } from '../ports/donation.js';
import type { DeviceStore } from '../ports/device.js';
import type { Clock } from '../ports/clock.js';

export interface AcknowledgmentLetter {
  donorOrg: string;
  pickupDate: string;
  items: Array<{ model: string; assetTag: string }>;
  acknowledgedAt: string;
  text: string;
}

/**
 * STUB — implemented by T2. Real implementation notes (see DESIGN.md §3, §5):
 * - createDonation: `donations.create(input)`.
 * - receiveItem(donationId, input, actor): `donations.getById(donationId)`;
 *   throw `new AppError('NOT_FOUND')` if missing. `deviceCreation.create({donationId, ...input})`.
 *   `deviceCreation.appendEvent(device.id, 'received', actor)`. Return the device.
 * - generateAcknowledgment(donationId): load the donation (NOT_FOUND if
 *   missing); `deviceCreation.listByDonation(donationId)`; throw
 *   `new AppError('NO_ITEMS')` if the list is empty. Build `text` by string
 *   concatenation ONLY from donorOrg, pickupDate, and each item's model +
 *   assetTag, plus this fixed IRS boilerplate line (verbatim, no
 *   variables): "No goods or services were provided in exchange for this
 *   donation." **Never** read, accept, or reference any price/value/cost
 *   field anywhere in this function — there is none in the domain model,
 *   and it must stay that way (R4). Call `donations.updateStatus(donationId, 'acknowledged')`.
 *   Return `{donorOrg, pickupDate, items, acknowledgedAt: clock.now().toISOString(), text}`.
 */
export class DonationService {
  constructor(
    private donations: DonationStore,
    private deviceCreation: Pick<DeviceStore, 'create' | 'appendEvent' | 'listByDonation'>,
    private clock: Clock,
  ) {}

  createDonation(_input: { donorOrg: string; pickupDate: string }): Donation {
    throw new Error('not implemented: DonationService.createDonation');
  }

  receiveItem(_donationId: number, _input: { model: string; serial: string }, _actor: string): Device {
    throw new Error('not implemented: DonationService.receiveItem');
  }

  generateAcknowledgment(_donationId: number): AcknowledgmentLetter {
    throw new Error('not implemented: DonationService.generateAcknowledgment');
  }
}
