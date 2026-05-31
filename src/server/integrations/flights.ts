/**
 * Flight booking integration — STUBBED behind an interface (rule #7).
 * The synthetic provider returns a deterministic fake booking reference so the
 * flow is demoable without a real GDS/airline API key. Swap to a real provider
 * (Amadeus, Duffel, etc.) by implementing FlightProvider.
 */
export interface FlightBookingInput {
  fromCity: string;
  toCity: string;
  departureDate: string; // ISO date
}
export interface FlightBooking {
  bookingRef: string;
  provider: string;
}

function hashRef(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36).toUpperCase().padStart(6, "0").slice(0, 6);
}

export interface FlightProvider {
  readonly name: string;
  book(input: FlightBookingInput): Promise<FlightBooking>;
}

const syntheticFlightProvider: FlightProvider = {
  name: "synthetic-flights",
  async book(input) {
    return { bookingRef: `INC-${hashRef(`${input.fromCity}>${input.toCity}@${input.departureDate}`)}`, provider: "synthetic-flights" };
  },
};

export function getFlightProvider(): FlightProvider {
  return syntheticFlightProvider;
}
