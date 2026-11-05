import type {
  CallsRepository,
  CallSummary,
  CallDetail,
  OwnerSettings,
} from "../repository";

type StoredCall = CallDetail & { ownerId: string };

type MemoryState = {
  callsByOwner: Map<string, StoredCall[]>;
  settingsByOwner: Map<string, OwnerSettings>;
};

const globalState = globalThis as typeof globalThis & {
  __afterbeepMemoryState?: MemoryState;
};

const memoryState: MemoryState = (globalState.__afterbeepMemoryState ??= {
  callsByOwner: new Map<string, StoredCall[]>(),
  settingsByOwner: new Map<string, OwnerSettings>(),
});

const { callsByOwner, settingsByOwner } = memoryState;

function makeSeedCalls(ownerId: string): StoredCall[] {
  const now = new Date();
  const expires = (daysFromNow: number) =>
    new Date(now.getTime() + daysFromNow * 24 * 60 * 60 * 1000);
  const ago = (minutes: number) =>
    new Date(now.getTime() - minutes * 60 * 1000);

  return [
    {
      id: `${ownerId}-001`,
      ownerId,
      receivedAt: ago(12),
      callerName: "Thomas Berger",
      callbackNumber: "+49 30 5550 0112",
      callerIdNumber: "+493055500112",
      reason: "Burst pipe in the basement, water coming in fast",
      urgency: "high",
      handledAt: null,
      expiresAt: expires(28),
      transcriptLanguage: "de",
      transcript:
        "Hallo, hier ist Thomas Berger. Ich habe ein ernstes Problem: in meinem Keller platzt gerade ein Rohr und Wasser quillt heraus. Bitte rufen Sie mich so schnell wie moeglich zurueck. Meine Nummer ist 030 5550 0112. Das ist sehr dringend.",
      suggestedReply:
        "Hallo Herr Berger, wir haben Ihre Nachricht erhalten. Wir melden uns innerhalb der naechsten Stunde bei Ihnen.",
      isSilentOrEmpty: false,
      extractionFailed: false,
    },
    {
      id: `${ownerId}-002`,
      ownerId,
      receivedAt: ago(47),
      callerName: "Sandra Koch",
      callbackNumber: "+49 30 5550 0234",
      callerIdNumber: "+493055500234",
      reason: "Boiler showing error code E4, no heating or hot water",
      urgency: "high",
      handledAt: null,
      expiresAt: expires(29),
      transcriptLanguage: "de",
      transcript:
        "Guten Tag, mein Name ist Sandra Koch. Meine Heizung zeigt den Fehlercode E4 an und ich habe weder Heizung noch warmes Wasser. Kinder im Haus. Telefon: 030 5550 0234. Bitte bald melden.",
      suggestedReply:
        "Hallo Frau Koch, wir kommen heute noch vorbei. Bitte halten Sie das Geraetemodell bereit.",
      isSilentOrEmpty: false,
      extractionFailed: false,
    },
    {
      id: `${ownerId}-003`,
      ownerId,
      receivedAt: ago(130),
      callerName: "Marcus Webb",
      callbackNumber: "+1 555 0187",
      callerIdNumber: "+15550187",
      reason: "Requesting a quote for rewiring the kitchen",
      urgency: "normal",
      handledAt: null,
      expiresAt: expires(27),
      transcriptLanguage: "en",
      transcript:
        "Hi, this is Marcus Webb calling. I'd like to get a quote for rewiring my kitchen. I'm doing a full renovation and need the electrical sorted out. My number is 1 555 0187. No rush, just whenever you get a chance.",
      suggestedReply:
        "Hi Marcus, thanks for calling. We'll give you a ring to arrange a site visit.",
      isSilentOrEmpty: false,
      extractionFailed: false,
    },
    {
      id: `${ownerId}-004`,
      ownerId,
      receivedAt: ago(200),
      callerName: "unknown",
      callbackNumber: "unknown",
      callerIdNumber: null,
      reason: "Dentist appointment reschedule request, Tuesday at 3pm",
      urgency: "normal",
      handledAt: null,
      expiresAt: expires(26),
      transcriptLanguage: "en",
      transcript:
        "Hello, I need to reschedule my dentist appointment. I have a Tuesday at three pm and I can't make it. I didn't leave my number but I'll call back. Thanks.",
      suggestedReply:
        "Thanks for calling. Since we don't have a number for you, please call us back so we can rebook.",
      isSilentOrEmpty: false,
      extractionFailed: false,
    },
    {
      id: `${ownerId}-005`,
      ownerId,
      receivedAt: ago(480),
      callerName: "DHL Delivery",
      callbackNumber: "+49 30 5550 0800",
      callerIdNumber: "+493055500800",
      reason: "Missed delivery window, parcel at depot, ref 7741882",
      urgency: "low",
      handledAt: null,
      expiresAt: expires(3),
      transcriptLanguage: "de",
      transcript:
        "Hallo, hier spricht der Kundendienst von DHL. Wir konnten Ihr Paket heute nicht zustellen. Das Paket liegt bei unserer Filiale. Sendungsnummer 7741882. Bitte melden Sie sich unter 030 5550 0800.",
      suggestedReply:
        "Danke fuer Ihren Anruf. Wir melden uns wegen der Abholung.",
      isSilentOrEmpty: false,
      extractionFailed: false,
    },
    {
      id: `${ownerId}-006`,
      ownerId,
      receivedAt: ago(1200),
      callerName: "Priya Sharma",
      callbackNumber: "+1 555 0142",
      callerIdNumber: "+15550142",
      reason: "Annual boiler service booking",
      urgency: "low",
      handledAt: new Date(new Date().getTime() - 900 * 60 * 1000),
      expiresAt: expires(25),
      transcriptLanguage: "en",
      transcript:
        "Hi, this is Priya Sharma. I'd like to book the annual boiler service we talked about last year. My number is 1 555 0142. Mornings work best for me. Thank you.",
      suggestedReply:
        "Hi Priya, great to hear from you. We'll call to pick a morning slot.",
      isSilentOrEmpty: false,
      extractionFailed: false,
    },
    {
      id: `${ownerId}-007`,
      ownerId,
      receivedAt: ago(2880),
      callerName: "James Okafor",
      callbackNumber: "+1 555 0163",
      callerIdNumber: "+15550163",
      reason: "Leaking tap in the bathroom, not urgent",
      urgency: "low",
      handledAt: new Date(new Date().getTime() - 2400 * 60 * 1000),
      expiresAt: expires(20),
      transcriptLanguage: "en",
      transcript:
        "Hello, James Okafor here. Got a tap dripping in the bathroom. Not urgent but would like it sorted in the next couple of weeks. Number is 1 555 0163. Cheers.",
      suggestedReply:
        "Hi James, no problem. We'll be in touch to schedule a convenient time.",
      isSilentOrEmpty: false,
      extractionFailed: false,
    },
  ];
}

export function createMemoryRepository(): CallsRepository {
  return {
    async listCalls(ownerId: string): Promise<CallSummary[]> {
      const calls = callsByOwner.get(ownerId) ?? [];
      return calls.map(
        ({
          transcript: _t,
          suggestedReply: _s,
          isSilentOrEmpty: _i,
          extractionFailed: _e,
          ownerId: _o,
          ...summary
        }) => summary,
      );
    },

    async getCall(callId: string, ownerId: string): Promise<CallDetail | null> {
      const calls = callsByOwner.get(ownerId) ?? [];
      const call = calls.find((c) => c.id === callId && c.ownerId === ownerId);
      if (!call) return null;
      const { ownerId: _o, ...detail } = call;
      return detail;
    },

    async markHandled(
      callId: string,
      ownerId: string,
      handled: boolean,
    ): Promise<void> {
      const calls = callsByOwner.get(ownerId) ?? [];
      const call = calls.find((c) => c.id === callId && c.ownerId === ownerId);
      if (!call) return;
      call.handledAt = handled ? new Date() : null;
    },

    async getSettings(ownerId: string): Promise<OwnerSettings> {
      return settingsByOwner.get(ownerId) ?? { notificationEmail: "" };
    },

    async saveSettings(
      ownerId: string,
      settings: OwnerSettings,
    ): Promise<void> {
      settingsByOwner.set(ownerId, { ...settings });
    },

    async seedDemo(ownerId: string): Promise<void> {
      callsByOwner.set(ownerId, makeSeedCalls(ownerId));
      if (!settingsByOwner.has(ownerId)) {
        settingsByOwner.set(ownerId, { notificationEmail: "" });
      }
    },
  };
}
