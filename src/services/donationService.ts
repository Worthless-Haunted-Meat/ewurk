import type { Device, Donation } from '../domain/types.js';
import type { DonationStore } from '../ports/donation.js';
import type { DeviceStore } from '../ports/device.js';
import type { Clock } from '../ports/clock.js';
import { AppError } from '../http/errors.js';

export interface AcknowledgmentLetter {
  donorOrg: string;
  pickupDate: string;
  items: Array<{ model: string; assetTag: string }>;
  acknowledgedAt: string;
  text: string;
}

/**
 * DonationService orchestrates the donation lifecycle per §3 and §5 of
 * DESIGN.md.  All monetary / valuation data must never be read or
 * referenced — every method in this class follows that invariant (R4).
 *
 * createDonation(input):
 *   delegate to `donations.create(input)`.
 *
 * receiveItem(donationId, input, actor):
 *   1. `donations.getById(donationId)` — throw `AppError('NOT_FOUND')`
 *      if the donation is missing.
 *   2. `deviceCreation.create({ donationId, ...input })` — inserts a
 *      new device with `status === 'received'` and a deterministic
 *      asset tag (`EW-` + zero-padded id).
 *   3. `deviceCreation.appendEvent(device.id, 'received', actor)`.
 *   4. Return the Device.
 *
 * generateAcknowledgment(donationId):
 *   1. Load the Donation (throw `AppError('NOT_FOUND')` if missing).
 *   2. `deviceCreation.listByDonation(donationId)`.
 *   3. Throw `AppError('NO_ITEMS')` if the list is empty.
 *   4. Build `text` by concatenating donor org, pickup date, each
 *      item's model + asset tag, and the fixed boilerplate line.
 *      **Never** read/dereference/accept any price, value, or cost
 *      field (there is none in the domain model).
 *   5. `donations.updateStatus(donationId, 'acknowledged')`.
 *   6. Return `{ donorOrg, pickupDate, items, acknowledgedAt, text }`.
 */
export class DonationService {
  constructor(
    private donations: DonationStore,
    private deviceCreation: Pick<DeviceStore, 'create' | 'appendEvent' | 'listByDonation'>,
    private clock: Clock,
  ) {}

  createDonation(input: { donorOrg: string; pickupDate: string }): Donation {
    return this.donations.create(input);
  }

  receiveItem(donationId: number, input: { model: string; serial: string }, actor: string): Device {
    const donation = this.donations.getById(donationId);
    if (!donation) {
      throw new AppError('NOT_FOUND');
    }
    const device = this.deviceCreation.create({ donationId, ...input });
    this.deviceCreation.appendEvent(device.id, 'received', actor);
    return device;
  }

  generateAcknowledgment(donationId: number): AcknowledgmentLetter {
    const donation = this.donations.getById(donationId);
    if (!donation) {
      throw new AppError('NOT_FOUND');
    }
    const devices = this.deviceCreation.listByDonation(donationId);
    if (devices.length === 0) {
      throw new AppError('NO_ITEMS');
    }

    const items = devices.map((d) => ({
      model: d.model,
      assetTag: d.assetTag,
    }));

    // R4: build the letter text from donor org, pickup date, and item
    // identifiers only — NO price / value / cost field is ever read.
    let text = `EWURK Donation Acknowledgment\n\n`;
    text += `From: ${donation.donorOrg}\n`;
    text += `Pickup date: ${donation.pickupDate}\n\n`;
    text += `We received the following donated items:\n\n`;
    for (const item of items) {
      text += `- ${item.model} (Asset Tag: ${item.assetTag})\n`;
    }
    text += `\nNo goods or services were provided in exchange for this donation.\n`;

    return {
      donorOrg: donation.donorOrg,
      pickupDate: donation.pickupDate,
      items,
      acknowledgedAt: this.clock.now().toISOString(),
      text,
    };
  }
}
