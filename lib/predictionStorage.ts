import { TargetedBetOutcomes, evaluateTargetedBets } from "@/lib/betEvaluator";

export interface StoredPredictionRecord {
  id: string; // e.g. prediction_17092026_R1_C1
  date: string;
  reunion: string;
  course: string;
  raceName: string;
  hippodrome: string;
  discipline: string;
  terrain?: string;
  distance: number;
  timestamp: number;
  savedAt: number;
  lastUpdated: number;
  
  // Real Financial & Bankroll tracking fields
  actualStake?: number; // قيمة الرهان الفعلي المخصص للسباق (€)
  actualROI?: number; // نسبة العائد الفعلي على الاستثمار (%)
  actualPnl?: number; // صافي الربح أو الخسارة الفعلي (€)
  actualPayout?: number; // إجمالي العائد أو الأرباح المسترجعة من الرهان (€)
  stakeHistory?: Array<{
    timestamp: number;
    amount: number;
    betType?: string;
    payout?: number;
    notes?: string;
  }>;
  customBetDetails?: {
    betType?: string;
    stakePerTicket?: number;
    totalTickets?: number;
    totalStake?: number;
    wonPayout?: number;
    notes?: string;
  };
  
  // Predictions
  prediction: number[]; // Core top 5
  goldenBase?: number;
  bases?: number[];
  associes?: number[];
  tocardSauveur?: number | null;
  quinteDesordrePicks?: number[];
  desordreConfidenceScore?: number;
  
  // AI & Analysis fields
  analysis: string;
  tacticalAnalysis?: string;
  quantitativeAnalysis?: string;
  quinteDesordreAnalysis?: string;
  profitStrategy?: string;
  aiModelUsed?: string;
  isAiGenerated?: boolean;
  ensemblePathway?: string;
  
  // Detailed Tactical & Quantitative Structured Data
  tacticalScenario?: {
    paceType: string;
    paceTitle: string;
    paceDescription: string;
    probableLeaders?: Array<{ numPmu: number; nom: string }>;
    probableClosers?: Array<{ numPmu: number; nom: string }>;
    tacticalAdvice?: string;
    goldenBase?: { numPmu: number; nom: string };
    safeCouples?: Array<{ numPmu: number; nom: string }>;
  };
  quantitativeRatings?: Array<{
    numPmu: number;
    nom: string;
    predictivePowerScore: number;
    quantitativeScore: number;
    tacticalScore: number;
    pathfindingScore: number;
    winProb: number;
    top3Prob: number;
    odds?: number;
    ferrage: string;
    role: string;
    speedRatingKm?: string;
    energyReservePct?: number;
    riskRewardRatio?: number;
  }>;
  bonusCombinations?: {
    bonus3Picks: number[];
    bonus4Picks: number[];
    bonus5Picks: number[];
    weightedCombinations: Array<{
      label: string;
      combination: number[];
      tierceOrdre: number[];
      confidence: number;
      evPotential: string;
      type: string;
    }>;
  };
  profitMaximizerInsights?: any;
  syntheseUltime?: any[];

  // System strategies & formulas
  targetedStrategies?: any;
  formulas?: any;
  fauxFavoris?: any[];
  profitSafeguardRules?: any[];
  ensembleProfiles?: any;

  // Race outcome tracking
  isFinished: boolean;
  actualArrival: number[]; // First 5 arrival numbers
  fullArrival?: number[]; // Full arrival
  status: string; // "ARRIVEE_DEFINITIVE_COMPLETE", "PROGRAMMEE", etc.
  matchCount: number;
  targetOutcomes?: TargetedBetOutcomes;
}

export { PredictionStorageService, type ReconciledHorseVisual } from "@/lib/predictionStorageService";
import { PredictionStorageService } from "@/lib/predictionStorageService";

export function normalizeStorageKey(date: string, reunion: string, course: string): string {
  return PredictionStorageService.normalizeKey(date, reunion, course);
}

export function getArchiveIndex(): string[] {
  return PredictionStorageService.getArchiveIndex();
}

export function saveArchiveIndex(index: string[]): void {
  PredictionStorageService.saveArchiveIndex(index);
}

export function savePredictionRecord(record: StoredPredictionRecord): boolean {
  return PredictionStorageService.savePrediction(record);
}

export function getPredictionRecord(date: string, reunion: string, course: string): StoredPredictionRecord | null {
  return PredictionStorageService.getPrediction(date, reunion, course);
}
export function getAllArchivedPredictions(): StoredPredictionRecord[] {
  return PredictionStorageService.getAllPredictions();
}

export async function syncWithServerArchive(): Promise<StoredPredictionRecord[]> {
  return PredictionStorageService.syncWithServer();
}

export function updateRaceArrivalInStorage(
  date: string,
  reunion: string,
  course: string,
  actualArrival: number[],
  status: string
): StoredPredictionRecord | null {
  return PredictionStorageService.updateRaceArrival(date, reunion, course, actualArrival, status);
}

export function updateRaceFinancials(
  date: string,
  reunion: string,
  course: string,
  stake: number,
  payout?: number,
  notes?: string,
  betType?: string
): StoredPredictionRecord | null {
  return PredictionStorageService.updateRaceFinancials(date, reunion, course, stake, payout, notes, betType);
}

export function deleteArchivedPrediction(id: string): void {
  PredictionStorageService.deletePrediction(id);
}

export function clearArchive(): void {
  PredictionStorageService.clearArchive();
}

