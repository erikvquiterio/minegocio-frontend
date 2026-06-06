export type Profile = {
  name?: string;
  birthDate?: string;
  sex?: string;
  phone?: string;
  occupation?: string;
  personType?: "Moral" | "Fisica" | "Fisica con actividad empresarial" | string;
};

export type Investment = {
  amount?: number;
  businessLine?: string;
};

export type LocationData = {
  stateCode?: string;
  stateName?: string;
  municipalityCode?: string;
  municipalityName?: string;
};

export type WizardData = {
  idea?: {
    description?: string;
    source?: string;
  };
  profile?: Profile;
  investment?: Investment;
  location?: LocationData;
  partnership?: {
    interested?: "si" | "no";
  };
};

export type ProcessState = {
  processId?: string;
  currentStep: number;
  data: WizardData;
  missingFields: string[];
  completion: number;
  updatedAt?: string;
};

export type User = {
  userId: string;
  email: string;
  profile: Profile;
};

export type Session = {
  token: string;
  expiresAt: number;
};

export type AuthState = {
  user: User;
  session: Session;
};

export type Municipality = {
  code: string;
  name: string;
};

export type BusinessLineOption = {
  name: string;
  recommended: boolean;
  minimumInvestment: number;
};

export type HeatZone = {
  zone: string;
  label: string;
  allowed: boolean;
  suitability: number;
  reason: string;
};

export type PricePoint = {
  zone: string;
  x: number;
  y: number;
  rent: number;
  purchase: number;
};

export type Paperwork = {
  name: string;
  authority: string;
  cost: number;
  days: number;
  required: boolean;
  basis?: string;
};

export type Analysis = {
  stateName: string;
  municipalityName: string;
  heatmap: HeatZone[];
  priceMap: PricePoint[];
  rentEstimate: { min: number; max: number; currency: string };
  jurisdiction?: { entity: string; authority: string; system: string };
  competition: { percent: number; source: string };
  governmentSupports: string[];
  regulatoryReferences?: Array<{ name: string; scope: string; articles?: string }>;
  paperwork: Paperwork[];
  paperworkTotalCost: number;
  paperworkTotalDays: number;
  runwayMonths: number;
  alternatives: Array<{ name: string; why: string; estimatedInvestment: number }>;
  expectedMonthlyIncome: number;
  expectedMonthlyIncomeNote?: string;
  monthlyProfit: number;
  roiMonths: number | null;
  legalNotice: string;
  regulatoryNote?: string;
};

export type RiskFactor = {
  name: string;
  score: number;
  weight: number;
};

export type Risk = {
  successProbability: number;
  riskProbability: number;
  factors: RiskFactor[];
  reasons: string[];
  recommendation: string;
  narrative?: string;
  mitigations?: string[];
};
