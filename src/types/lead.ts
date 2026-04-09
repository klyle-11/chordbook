export interface LeadNote {
  note: string;        // pitch class: "E", "G#", etc.
  stringIndex: number; // which string it was placed on
  fret: number;        // which fret
}

export interface Lead {
  id: string;
  name: string;
  notes: LeadNote[];   // ordered sequence — notes can repeat
  tuningId: string;    // ties lead to a specific tuning
  createdAt: Date;
  updatedAt: Date;
}
