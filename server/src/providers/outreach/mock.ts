// Default OutreachProvider. Simulates handing the contact list to Max and
// getting back a campaign id, after a short delay so the demo feels real.

import type {
  OutreachProvider,
  OutreachLaunchInput,
  OutreachLaunchOutput,
} from "./index";

export class MockOutreachProvider implements OutreachProvider {
  launch(input: OutreachLaunchInput): Promise<OutreachLaunchOutput> {
    const reachable = input.targets.filter(
      (t) => t.email || t.linkedin || t.phone
    );
    const campaignId = `max-mock-${Date.now().toString(36)}`;
    const out: OutreachLaunchOutput = {
      campaignId,
      queued: reachable.length,
      message: `Mock Max campaign ${campaignId} queued ${reachable.length} ${input.channel} contact(s)`,
    };
    return new Promise((resolve) => setTimeout(() => resolve(out), 1400));
  }
}
