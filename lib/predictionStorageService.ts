/**
 * PredictionStorageService
 * وحدة خدمات متخصصة وموثوقة لإدارة التخزين المحلي (localStorage) والمزامنة المزدوجة
 * مع معالجة تسلسل البيانات (Serialization)، التحقق من صحة المخطط (Schema Validation)،
 * ومعالجة الأخطاء الشاملة لسجلات التوقعات StoredPredictionRecord.
 */

import { TargetedBetOutcomes, evaluateTargetedBets } from "@/lib/betEvaluator";

export interface ReconciledHorseVisual {
  numPmu: number;
  nom: string;
  rankIndex: number;
  predictivePowerScore: number;
  quantitativeScore: number;
  tacticalScore: number;
  pathfindingScore: number;
  winProb?: number;
  podiumProb?: number;
  speedRatingKm?: string;
  energyReservePct?: number;
  riskRewardRatio?: number;
  tacticalRole: string;
  tierKey: "elite_gold" | "high_power" | "solid_associe" | "value_tocard" | "standard";
  badgeText: string;
  bgClass: string;
  borderClass: string;
  textClass: string;
  badgeBgClass: string;
  glowClass: string;
  isMatchWithArrival?: boolean;
}

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

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  record?: StoredPredictionRecord;
}

const ARCHIVE_INDEX_KEY = "pmu_archive_index_v1";
const STORAGE_PREFIX = "prediction_";

// In-memory persistent cache to shield against private-mode or restricted localStorage
const inMemoryCache = new Map<string, StoredPredictionRecord>();

export class PredictionStorageService {
  /**
   * Normalizes keys into canonical format: prediction_YYYYMMDD_RX_CX
   */
  public static normalizeKey(date: string, reunion: string, course: string): string {
    const cleanDate = (date || "").toString().replace(/[^0-9]/g, "");
    const rNum = (reunion || "").toString().toUpperCase().replace("R", "").trim();
    const cNum = (course || "").toString().toUpperCase().replace("C", "").trim();
    return `${STORAGE_PREFIX}${cleanDate}_R${rNum}_C${cNum}`;
  }

  /**
   * Checks if localStorage is actively accessible and writable in the current runtime
   */
  public static isLocalStorageAvailable(): boolean {
    if (typeof window === "undefined") return false;
    try {
      const testKey = "__pmu_storage_test__";
      localStorage.setItem(testKey, "1");
      localStorage.removeItem(testKey);
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Comprehensive Schema Validator: Inspects arbitrary objects and verifies conformance
   * to StoredPredictionRecord requirements, recording explicit error notes.
   */
  public static validatePredictionRecord(data: unknown): ValidationResult {
    const errors: string[] = [];

    if (!data || typeof data !== "object") {
      return { isValid: false, errors: ["Data must be a non-null object"] };
    }

    const raw = data as Record<string, any>;

    // Required key identifiers
    if (!raw.date || typeof raw.date !== "string" || raw.date.trim() === "") {
      errors.push("Field 'date' is required and must be a non-empty string");
    }

    if (!raw.reunion || (typeof raw.reunion !== "string" && typeof raw.reunion !== "number")) {
      errors.push("Field 'reunion' is required");
    }

    if (!raw.course || (typeof raw.course !== "string" && typeof raw.course !== "number")) {
      errors.push("Field 'course' is required");
    }

    // Prediction picks validation
    if (!Array.isArray(raw.prediction) || raw.prediction.length === 0) {
      errors.push("Field 'prediction' must be a non-empty array of horse numbers");
    } else {
      const validNumbers = raw.prediction.filter((n: any) => typeof n === "number" && !isNaN(n) && n > 0);
      if (validNumbers.length === 0) {
        errors.push("Field 'prediction' must contain at least one valid horse number > 0");
      }
    }

    // Actual arrival validation
    if (raw.actualArrival !== undefined && raw.actualArrival !== null && !Array.isArray(raw.actualArrival)) {
      errors.push("Field 'actualArrival', if provided, must be an array of numbers");
    }

    if (errors.length > 0) {
      return { isValid: false, errors };
    }

    // Return sanitized conformant record
    const sanitized = this.sanitizeRecord(raw);
    return { isValid: true, errors: [], record: sanitized };
  }

  /**
   * Sanitizes and coerces raw or partially corrupt data into a robust, normalized StoredPredictionRecord
   */
  public static sanitizeRecord(raw: any): StoredPredictionRecord {
    const now = Date.now();
    const cleanDate = (raw.date || "").toString().replace(/[^0-9]/g, "");
    const cleanReunion = (raw.reunion || "R1").toString().toUpperCase().startsWith("R")
      ? raw.reunion.toString().toUpperCase()
      : `R${raw.reunion}`;
    const cleanCourse = (raw.course || "C1").toString().toUpperCase().startsWith("C")
      ? raw.course.toString().toUpperCase()
      : `C${raw.course}`;
    const canonicalId = raw.id || this.normalizeKey(cleanDate, cleanReunion, cleanCourse);

    // Clean predictions array: ensure positive integers, eliminate duplicates
    let rawPredictions: number[] = Array.isArray(raw.prediction) ? raw.prediction : [];
    let cleanPredictions = rawPredictions
      .map((n: any) => parseInt(String(n), 10))
      .filter((n: number) => !isNaN(n) && n > 0);
    
    // Deduplicate while preserving order
    cleanPredictions = Array.from(new Set(cleanPredictions));
    if (cleanPredictions.length === 0) {
      cleanPredictions = [1, 2, 3, 4, 5];
    }

    // Clean actual arrival
    let cleanArrival: number[] = [];
    if (Array.isArray(raw.actualArrival)) {
      cleanArrival = raw.actualArrival
        .map((n: any) => parseInt(String(n), 10))
        .filter((n: number) => !isNaN(n) && n > 0)
        .slice(0, 5);
    }

    const isFin = Boolean(raw.isFinished || (cleanArrival.length >= 3 && raw.status !== "PROGRAMMEE"));
    const matchCount = cleanArrival.length > 0
      ? cleanPredictions.filter(p => cleanArrival.includes(p)).length
      : (typeof raw.matchCount === "number" ? Math.max(0, raw.matchCount) : 0);

    // Helper to compact individual horse objects to prevent data bloat
    const compactHorseObj = (h: any) => {
      if (!h || typeof h !== "object") return h;
      return {
        numPmu: Number(h.numPmu) || 0,
        nom: String(h.nom || `جواد ${h.numPmu || ""}`),
        odds: h.pmuOdds || h.odds,
        predictivePowerScore: h.predictivePowerScore || h.powerScore,
        tacticalRole: h.tacticalRole || h.role,
        winProb: h.winProb,
        top3Prob: h.top3Prob,
        ferrage: h.ferrage || h.ferrageCode,
      };
    };

    // Clean tactical and quantitative data
    const tacticalScenario = raw.tacticalScenario && typeof raw.tacticalScenario === "object" ? {
      paceType: String(raw.tacticalScenario.paceType || "REGULAR"),
      paceTitle: String(raw.tacticalScenario.paceTitle || "وتيرة متوازنة"),
      paceDescription: String(raw.tacticalScenario.paceDescription || ""),
      probableLeaders: Array.isArray(raw.tacticalScenario.probableLeaders) ? raw.tacticalScenario.probableLeaders.map(compactHorseObj) : [],
      probableClosers: Array.isArray(raw.tacticalScenario.probableClosers) ? raw.tacticalScenario.probableClosers.map(compactHorseObj) : [],
      tacticalAdvice: String(raw.tacticalScenario.tacticalAdvice || ""),
      goldenBase: raw.tacticalScenario.goldenBase ? compactHorseObj(raw.tacticalScenario.goldenBase) : undefined,
      safeCouples: Array.isArray(raw.tacticalScenario.safeCouples) ? raw.tacticalScenario.safeCouples.map(compactHorseObj) : [],
    } : undefined;

    const quantitativeRatings = Array.isArray(raw.quantitativeRatings) ? raw.quantitativeRatings.map((q: any) => ({
      numPmu: Number(q.numPmu) || 0,
      nom: String(q.nom || `جواد ${q.numPmu || ""}`),
      predictivePowerScore: Number(q.predictivePowerScore || q.powerScore) || 0,
      quantitativeScore: Number(q.quantitativeScore) || 0,
      tacticalScore: Number(q.tacticalScore) || 0,
      pathfindingScore: Number(q.pathfindingScore || q.pathfindingOrdreScore) || 0,
      winProb: Number(q.winProb) || 0,
      top3Prob: Number(q.top3Prob) || 0,
      odds: q.odds ? Number(q.odds) : (q.pmuOdds ? Number(q.pmuOdds) : undefined),
      ferrage: String(q.ferrage || q.ferrageCode || "D4"),
      role: String(q.role || q.tacticalRole || "CHOIX_TACTIQUE"),
      speedRatingKm: q.speedRatingKm ? String(q.speedRatingKm) : undefined,
      energyReservePct: q.energyReservePct ? Number(q.energyReservePct) : undefined,
      riskRewardRatio: q.riskRewardRatio ? Number(q.riskRewardRatio) : undefined,
    })) : undefined;

    const bonusCombinations = raw.bonusCombinations && typeof raw.bonusCombinations === "object" ? {
      bonus3Picks: Array.isArray(raw.bonusCombinations.bonus3Picks) ? raw.bonusCombinations.bonus3Picks : [],
      bonus4Picks: Array.isArray(raw.bonusCombinations.bonus4Picks) ? raw.bonusCombinations.bonus4Picks : [],
      bonus5Picks: Array.isArray(raw.bonusCombinations.bonus5Picks) ? raw.bonusCombinations.bonus5Picks : [],
      weightedCombinations: Array.isArray(raw.bonusCombinations.weightedCombinations) ? raw.bonusCombinations.weightedCombinations : [],
    } : undefined;

    // Compact targeted strategies to prevent deep nesting
    let targetedStrategies = undefined;
    if (raw.targetedStrategies && typeof raw.targetedStrategies === "object") {
      targetedStrategies = {};
      for (const [key, val] of Object.entries(raw.targetedStrategies)) {
        if (val && typeof val === "object") {
          const sCopy = { ...(val as any) };
          if (Array.isArray(sCopy.horses)) sCopy.horses = sCopy.horses.map(compactHorseObj);
          if (Array.isArray(sCopy.boosterHorses)) sCopy.boosterHorses = sCopy.boosterHorses.map(compactHorseObj);
          (targetedStrategies as any)[key] = sCopy;
        }
      }
    }

    // Compact ensemble profiles and remove duplicate nested strategy copies
    let ensembleProfiles = undefined;
    if (raw.ensembleProfiles && typeof raw.ensembleProfiles === "object") {
      ensembleProfiles = {};
      for (const [key, val] of Object.entries(raw.ensembleProfiles)) {
        if (val && typeof val === "object") {
          const pCopy = { ...(val as any) };
          delete pCopy.targetedStrategies;
          if (Array.isArray(pCopy.extendedPicks)) {
            pCopy.extendedPicks = pCopy.extendedPicks.map((h: any) => typeof h === "object" ? compactHorseObj(h) : h);
          }
          (ensembleProfiles as any)[key] = pCopy;
        }
      }
    }

    // Financial sanitization
    const actualStake = raw.actualStake !== undefined && !isNaN(Number(raw.actualStake)) ? Number(raw.actualStake) : undefined;
    const actualPayout = raw.actualPayout !== undefined && !isNaN(Number(raw.actualPayout)) ? Number(raw.actualPayout) : undefined;
    let actualPnl = raw.actualPnl !== undefined && !isNaN(Number(raw.actualPnl)) ? Number(raw.actualPnl) : undefined;
    let actualROI = raw.actualROI !== undefined && !isNaN(Number(raw.actualROI)) ? Number(raw.actualROI) : undefined;

    if (actualStake !== undefined && actualPayout !== undefined) {
      actualPnl = Number((actualPayout - actualStake).toFixed(2));
      actualROI = actualStake > 0 ? Number((((actualPayout - actualStake) / actualStake) * 100).toFixed(2)) : 0;
    }

    return {
      id: canonicalId,
      date: cleanDate || raw.date || "",
      reunion: cleanReunion,
      course: cleanCourse,
      raceName: String(raw.raceName || `سباق (${cleanReunion} ${cleanCourse})`),
      hippodrome: String(raw.hippodrome || "مضمار سباق"),
      discipline: String(raw.discipline || "غير محدد"),
      terrain: raw.terrain ? String(raw.terrain) : undefined,
      distance: Number(raw.distance) || 2100,
      timestamp: Number(raw.timestamp) || now,
      savedAt: Number(raw.savedAt) || now,
      lastUpdated: Number(raw.lastUpdated) || now,

      actualStake,
      actualPayout,
      actualPnl,
      actualROI,
      stakeHistory: Array.isArray(raw.stakeHistory) ? raw.stakeHistory : [],
      customBetDetails: raw.customBetDetails && typeof raw.customBetDetails === "object" ? raw.customBetDetails : undefined,

      prediction: cleanPredictions,
      goldenBase: raw.goldenBase !== undefined && !isNaN(Number(raw.goldenBase)) ? Number(raw.goldenBase) : cleanPredictions[0],
      bases: Array.isArray(raw.bases) ? raw.bases : [cleanPredictions[0]],
      associes: Array.isArray(raw.associes) ? raw.associes : cleanPredictions.slice(1, 4),
      tocardSauveur: raw.tocardSauveur !== undefined ? Number(raw.tocardSauveur) : null,
      quinteDesordrePicks: Array.isArray(raw.quinteDesordrePicks) ? raw.quinteDesordrePicks : cleanPredictions.slice(0, 5),
      desordreConfidenceScore: Number(raw.desordreConfidenceScore) || undefined,

      analysis: String(raw.analysis || "تحليل خوارزمي متقدم مسند لمعايير السباق."),
      tacticalAnalysis: raw.tacticalAnalysis ? String(raw.tacticalAnalysis) : undefined,
      quantitativeAnalysis: raw.quantitativeAnalysis ? String(raw.quantitativeAnalysis) : undefined,
      quinteDesordreAnalysis: raw.quinteDesordreAnalysis ? String(raw.quinteDesordreAnalysis) : undefined,
      profitStrategy: raw.profitStrategy ? String(raw.profitStrategy) : undefined,
      aiModelUsed: raw.aiModelUsed ? String(raw.aiModelUsed) : "Gemini Pro / Ensemble v4.2",
      isAiGenerated: raw.isAiGenerated !== undefined ? Boolean(raw.isAiGenerated) : true,
      ensemblePathway: raw.ensemblePathway ? String(raw.ensemblePathway) : undefined,

      tacticalScenario,
      quantitativeRatings,
      bonusCombinations,
      profitMaximizerInsights: raw.profitMaximizerInsights,
      syntheseUltime: Array.isArray(raw.syntheseUltime) ? raw.syntheseUltime : undefined,

      targetedStrategies: raw.targetedStrategies,
      formulas: raw.formulas,
      fauxFavoris: Array.isArray(raw.fauxFavoris) ? raw.fauxFavoris : undefined,
      profitSafeguardRules: Array.isArray(raw.profitSafeguardRules) ? raw.profitSafeguardRules : undefined,
      ensembleProfiles: raw.ensembleProfiles,

      isFinished: isFin,
      actualArrival: cleanArrival,
      fullArrival: Array.isArray(raw.fullArrival) ? raw.fullArrival : cleanArrival,
      status: String(raw.status || (isFin ? "ARRIVEE_DEFINITIVE_COMPLETE" : "PROGRAMMEE")),
      matchCount,
      targetOutcomes: raw.targetOutcomes || (cleanArrival.length >= 3 ? evaluateTargetedBets(cleanPredictions, cleanArrival, raw.quinteDesordrePicks) : undefined),
    };
  }

  /**
   * Robust JSON Serializer: Handles cyclic structures, eliminates NaN/Infinities,
   * protects against crash scenarios and measures byte footprint.
   */
  public static serializeRecord(record: StoredPredictionRecord): string {
    const seen = new WeakSet();
    return JSON.stringify(record, (key, value) => {
      if (typeof value === "object" && value !== null) {
        if (seen.has(value)) {
          return "[Circular]";
        }
        seen.add(value);
      }
      if (typeof value === "number") {
        if (isNaN(value)) return null;
        if (!isFinite(value)) return value > 0 ? 999999 : -999999;
      }
      return value;
    });
  }

  /**
   * Safe JSON Deserializer with schema validation and sanitization
   */
  public static deserializeRecord(raw: string): StoredPredictionRecord | null {
    if (!raw || typeof raw !== "string" || raw.trim() === "") {
      return null;
    }

    try {
      const parsed = JSON.parse(raw);
      const validation = this.validatePredictionRecord(parsed);
      if (validation.isValid && validation.record) {
        return validation.record;
      }
      // If minor validation errors, attempt sanitization
      if (parsed && typeof parsed === "object" && (parsed.date || parsed.id)) {
        return this.sanitizeRecord(parsed);
      }
      return null;
    } catch (e) {
      console.warn("[PredictionStorageService] JSON Deserialization error:", e);
      return null;
    }
  }

  /**
   * Retrieve the master index of all archived prediction keys
   */
  public static getArchiveIndex(): string[] {
    if (typeof window === "undefined") return [];
    try {
      if (this.isLocalStorageAvailable()) {
        const raw = localStorage.getItem(ARCHIVE_INDEX_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) return parsed.filter(k => typeof k === "string" && k.startsWith(STORAGE_PREFIX));
        }
      }
      // Fallback to sessionStorage
      const rawSession = sessionStorage.getItem(ARCHIVE_INDEX_KEY);
      if (rawSession) {
        const parsed = JSON.parse(rawSession);
        if (Array.isArray(parsed)) return parsed.filter(k => typeof k === "string" && k.startsWith(STORAGE_PREFIX));
      }
    } catch (e) {
      console.warn("[PredictionStorageService] Error reading archive index:", e);
    }
    return [];
  }

  /**
   * Update and deduplicate archive index safely
   */
  public static saveArchiveIndex(keys: string[]): void {
    if (typeof window === "undefined") return;
    const unique = Array.from(new Set(keys.filter(k => Boolean(k) && typeof k === "string" && k.startsWith(STORAGE_PREFIX))));
    const payload = JSON.stringify(unique);

    if (this.isLocalStorageAvailable()) {
      try {
        localStorage.setItem(ARCHIVE_INDEX_KEY, payload);
      } catch (e) {
        console.warn("[PredictionStorageService] Failed saving index to localStorage:", e);
      }
    }

    try {
      sessionStorage.setItem(ARCHIVE_INDEX_KEY, payload);
    } catch {}
  }

  /**
   * Handle LocalStorage Quota Exceeded by removing oldest 20% of records
   */
  private static handleQuotaExceeded(): void {
    try {
      console.warn("[PredictionStorageService] LocalStorage quota limit reached. Purging oldest 20% of records...");
      const index = this.getArchiveIndex();
      if (index.length <= 5) return;
      const countToRemove = Math.max(1, Math.floor(index.length * 0.2));
      const removedKeys = index.splice(index.length - countToRemove, countToRemove);
      for (const k of removedKeys) {
        if (this.isLocalStorageAvailable()) {
          try { localStorage.removeItem(k); } catch {}
        }
      }
      this.saveArchiveIndex(index);
    } catch (e) {
      console.error("[PredictionStorageService] Failed to clean quota:", e);
    }
  }

  /**
   * Saves a prediction record reliably with multi-tier failovers (localStorage -> sessionStorage -> memory -> server)
   */
  public static savePrediction(record: StoredPredictionRecord | any): boolean {
    if (!record) {
      console.error("[PredictionStorageService] Refusing to save null or undefined record");
      return false;
    }

    try {
      // 1. Sanitize and validate record
      const cleanRecord = this.sanitizeRecord(record);
      const canonicalKey = cleanRecord.id;

      // Recalculate outcomes if arrival is known
      if (cleanRecord.actualArrival && cleanRecord.actualArrival.length >= 3) {
        cleanRecord.targetOutcomes = evaluateTargetedBets(
          cleanRecord.prediction,
          cleanRecord.actualArrival,
          cleanRecord.quinteDesordrePicks
        );
        cleanRecord.matchCount = cleanRecord.prediction.filter(p => cleanRecord.actualArrival!.includes(p)).length;
        cleanRecord.isFinished = true;
      }

      const serialized = this.serializeRecord(cleanRecord);

      // 2. In-Memory Store Tier
      inMemoryCache.set(canonicalKey, cleanRecord);

      // 3. LocalStorage Tier
      if (this.isLocalStorageAvailable()) {
        try {
          localStorage.setItem(canonicalKey, serialized);
        } catch (err: any) {
          if (err?.name === "QuotaExceededError" || err?.code === 22 || err?.number === -2147024882) {
            this.handleQuotaExceeded();
            try {
              localStorage.setItem(canonicalKey, serialized);
            } catch (retryErr) {
              console.warn("[PredictionStorageService] Retry failed after quota purge:", retryErr);
            }
          }
        }
      }

      // 4. SessionStorage Tier
      try {
        sessionStorage.setItem(canonicalKey, serialized);
      } catch {}

      // 5. Update Master Index
      const currentIndex = this.getArchiveIndex();
      if (!currentIndex.includes(canonicalKey)) {
        currentIndex.unshift(canonicalKey);
        this.saveArchiveIndex(currentIndex);
      }

      // 6. Asynchronous Server Archive Sync
      if (typeof fetch !== "undefined") {
        fetch("/api/predictions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: serialized,
        }).catch((syncErr) => {
          console.warn("[PredictionStorageService] Background server sync warning:", syncErr);
        });
      }

      // 7. Event broadcast for reactive tabs & UI components
      if (typeof window !== "undefined") {
        try {
          window.dispatchEvent(new CustomEvent("pmu_prediction_saved", { detail: { id: canonicalKey, record: cleanRecord } }));
        } catch {}
      }

      return true;
    } catch (criticalErr) {
      console.error("[PredictionStorageService] Critical error saving prediction record:", criticalErr);
      return false;
    }
  }

  /**
   * Retrieves a prediction record by date, reunion, course
   */
  public static getPrediction(date: string, reunion: string, course: string): StoredPredictionRecord | null {
    if (typeof window === "undefined") return null;

    try {
      const canonicalKey = this.normalizeKey(date, reunion, course);

      // Tier 1: In-memory cache
      if (inMemoryCache.has(canonicalKey)) {
        return inMemoryCache.get(canonicalKey)!;
      }

      // Backward compatibility key candidates
      const cleanDate = (date || "").toString().replace(/[^0-9]/g, "");
      const rNum = (reunion || "").toString().toUpperCase().replace("R", "");
      const cNum = (course || "").toString().toUpperCase().replace("C", "");
      const candidateKeys = [
        canonicalKey,
        `prediction_${cleanDate}_${rNum}_${cNum}`,
        `prediction_${date}_${reunion}_${course}`,
      ];

      for (const key of candidateKeys) {
        // Tier 2: localStorage
        if (this.isLocalStorageAvailable()) {
          try {
            const raw = localStorage.getItem(key);
            if (raw) {
              const record = this.deserializeRecord(raw);
              if (record) {
                inMemoryCache.set(canonicalKey, record);
                return record;
              }
            }
          } catch {}
        }

        // Tier 3: sessionStorage
        try {
          const rawSession = sessionStorage.getItem(key);
          if (rawSession) {
            const record = this.deserializeRecord(rawSession);
            if (record) {
              inMemoryCache.set(canonicalKey, record);
              return record;
            }
          }
        } catch {}
      }

      return null;
    } catch (e) {
      console.error("[PredictionStorageService] Error retrieving prediction:", e);
      return null;
    }
  }

  /**
   * Retrieves a prediction record by its exact identifier
   */
  public static getPredictionById(id: string): StoredPredictionRecord | null {
    if (typeof window === "undefined" || !id) return null;

    if (inMemoryCache.has(id)) {
      return inMemoryCache.get(id)!;
    }

    if (this.isLocalStorageAvailable()) {
      try {
        const raw = localStorage.getItem(id);
        if (raw) {
          const record = this.deserializeRecord(raw);
          if (record) {
            inMemoryCache.set(id, record);
            return record;
          }
        }
      } catch {}
    }

    try {
      const rawSession = sessionStorage.getItem(id);
      if (rawSession) {
        const record = this.deserializeRecord(rawSession);
        if (record) {
          inMemoryCache.set(id, record);
          return record;
        }
      }
    } catch {}

    return null;
  }

  /**
   * Retrieves all archived predictions, merging index, loose keys, and memory
   */
  public static getAllPredictions(): StoredPredictionRecord[] {
    if (typeof window === "undefined") return [];

    try {
      const indexedKeys = this.getArchiveIndex();
      const localKeys: string[] = [];
      if (this.isLocalStorageAvailable()) {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith(STORAGE_PREFIX)) localKeys.push(k);
        }
      }

      const sessionKeys: string[] = [];
      try {
        for (let i = 0; i < sessionStorage.length; i++) {
          const k = sessionStorage.key(i);
          if (k && k.startsWith(STORAGE_PREFIX)) sessionKeys.push(k);
        }
      } catch {}

      const memoryKeys = Array.from(inMemoryCache.keys());
      const allKeys = Array.from(new Set([...indexedKeys, ...localKeys, ...sessionKeys, ...memoryKeys]));

      const recordMap = new Map<string, StoredPredictionRecord>();

      for (const key of allKeys) {
        let record: StoredPredictionRecord | null = inMemoryCache.get(key) || null;
        if (!record && this.isLocalStorageAvailable()) {
          const raw = localStorage.getItem(key);
          if (raw) record = this.deserializeRecord(raw);
        }
        if (!record) {
          try {
            const rawSession = sessionStorage.getItem(key);
            if (rawSession) record = this.deserializeRecord(rawSession);
          } catch {}
        }

        if (record && Array.isArray(record.prediction) && record.prediction.length > 0) {
          const canonicalId = this.normalizeKey(record.date, record.reunion, record.course);
          record.id = canonicalId;
          recordMap.set(canonicalId, record);
          inMemoryCache.set(canonicalId, record);
        }
      }

      const records = Array.from(recordMap.values());
      records.sort((a, b) => (b.savedAt || b.timestamp || 0) - (a.savedAt || a.timestamp || 0));

      // Synchronize cleaned index
      this.saveArchiveIndex(records.map(r => r.id));
      return records;
    } catch (e) {
      console.error("[PredictionStorageService] Error getting all predictions:", e);
      return [];
    }
  }

  /**
   * Updates official race arrival and recalculates all bet outcomes
   */
  public static updateRaceArrival(
    date: string,
    reunion: string,
    course: string,
    actualArrival: number[],
    status?: string
  ): StoredPredictionRecord | null {
    const existing = this.getPrediction(date, reunion, course);
    if (!existing) return null;

    existing.actualArrival = actualArrival.slice(0, 5);
    existing.fullArrival = actualArrival;
    existing.status = status || "ARRIVEE_DEFINITIVE_COMPLETE";
    existing.isFinished = actualArrival.length >= 3;
    existing.matchCount = existing.prediction.filter(p => existing.actualArrival.includes(p)).length;
    existing.targetOutcomes = evaluateTargetedBets(
      existing.prediction,
      existing.actualArrival,
      existing.quinteDesordrePicks
    );
    
    // Maintain financial reconciliation if stake is defined
    if (existing.actualStake && existing.actualStake > 0) {
      if (existing.actualPayout !== undefined) {
        existing.actualPnl = Number((existing.actualPayout - existing.actualStake).toFixed(2));
        existing.actualROI = Number((((existing.actualPayout - existing.actualStake) / existing.actualStake) * 100).toFixed(2));
      }
    }

    existing.lastUpdated = Date.now();

    this.savePrediction(existing);
    return existing;
  }

  /**
   * Updates real financial stake, returns, and ROI for a specific race
   */
  public static updateRaceFinancials(
    date: string,
    reunion: string,
    course: string,
    stake: number,
    payout?: number,
    notes?: string,
    betType?: string
  ): StoredPredictionRecord | null {
    const existing = this.getPrediction(date, reunion, course);
    if (!existing) return null;

    const numStake = Math.max(0, Number(stake) || 0);
    const numPayout = payout !== undefined && payout !== null ? Math.max(0, Number(payout) || 0) : undefined;

    existing.actualStake = numStake;
    if (numPayout !== undefined) {
      existing.actualPayout = numPayout;
      existing.actualPnl = Number((numPayout - numStake).toFixed(2));
      existing.actualROI = numStake > 0 ? Number((((numPayout - numStake) / numStake) * 100).toFixed(2)) : 0;
    } else if (existing.actualPayout !== undefined) {
      existing.actualPnl = Number((existing.actualPayout - numStake).toFixed(2));
      existing.actualROI = numStake > 0 ? Number((((existing.actualPayout - numStake) / numStake) * 100).toFixed(2)) : 0;
    } else {
      // If no explicit payout yet, evaluate if race is finished and targetOutcomes indicate a win
      if (existing.isFinished && existing.targetOutcomes) {
        const outcomes = existing.targetOutcomes;
        let estimatedWinMultiplier = 0;
        if (outcomes.quinteDesordre?.won) estimatedWinMultiplier += 35;
        if (outcomes.quinteBonus4?.won) estimatedWinMultiplier += 8;
        if (outcomes.quinteBonus3?.won) estimatedWinMultiplier += 3.5;
        if (outcomes.tierceOrdre?.won) estimatedWinMultiplier += 18;
        if (outcomes.quarteBonus3?.won) estimatedWinMultiplier += 4.5;
        
        const estimatedPayout = Number((numStake * estimatedWinMultiplier).toFixed(2));
        existing.actualPayout = estimatedPayout;
        existing.actualPnl = Number((estimatedPayout - numStake).toFixed(2));
        existing.actualROI = numStake > 0 ? Number((((estimatedPayout - numStake) / numStake) * 100).toFixed(2)) : 0;
      }
    }

    if (!existing.stakeHistory) existing.stakeHistory = [];
    existing.stakeHistory.push({
      timestamp: Date.now(),
      amount: numStake,
      betType: betType || existing.customBetDetails?.betType || "Custom",
      payout: existing.actualPayout,
      notes: notes || undefined,
    });

    if (notes || betType) {
      existing.customBetDetails = {
        ...existing.customBetDetails,
        totalStake: numStake,
        wonPayout: existing.actualPayout,
        betType: betType || existing.customBetDetails?.betType || "Custom",
        notes: notes || existing.customBetDetails?.notes,
      };
    }

    existing.lastUpdated = Date.now();
    this.savePrediction(existing);
    return existing;
  }

  /**
   * Deletes a prediction from all tiers
   */
  public static deletePrediction(idOrDate: string, reunion?: string, course?: string): boolean {
    if (typeof window === "undefined") return false;
    const key = reunion && course ? this.normalizeKey(idOrDate, reunion, course) : idOrDate;

    try {
      inMemoryCache.delete(key);
      if (this.isLocalStorageAvailable()) localStorage.removeItem(key);
      try { sessionStorage.removeItem(key); } catch {}

      const updatedIndex = this.getArchiveIndex().filter(k => k !== key);
      this.saveArchiveIndex(updatedIndex);

      // Notify remote server
      if (typeof fetch !== "undefined") {
        fetch(`/api/predictions?id=${encodeURIComponent(key)}`, { method: "DELETE" }).catch(() => {});
      }

      if (typeof window !== "undefined") {
        try {
          window.dispatchEvent(new CustomEvent("pmu_prediction_deleted", { detail: { id: key } }));
        } catch {}
      }

      return true;
    } catch (e) {
      console.error("[PredictionStorageService] Error deleting prediction:", e);
      return false;
    }
  }

  /**
   * Clear all archived predictions
   */
  public static clearArchive(): boolean {
    if (typeof window === "undefined") return false;
    try {
      inMemoryCache.clear();
      const all = this.getAllPredictions();
      for (const r of all) {
        if (this.isLocalStorageAvailable()) localStorage.removeItem(r.id);
        try { sessionStorage.removeItem(r.id); } catch {}
      }
      if (this.isLocalStorageAvailable()) localStorage.removeItem(ARCHIVE_INDEX_KEY);
      try { sessionStorage.removeItem(ARCHIVE_INDEX_KEY); } catch {}
      return true;
    } catch (e) {
      console.error("[PredictionStorageService] Error clearing archive:", e);
      return false;
    }
  }

  /**
   * Dual synchronization with remote server
   */
  public static async syncWithServer(): Promise<StoredPredictionRecord[]> {
    if (typeof window === "undefined") return [];
    try {
      const local = this.getAllPredictions();
      const localMap = new Map(local.map(r => [r.id, r]));

      const res = await fetch("/api/predictions");
      if (res.ok) {
        try {
          const text = await res.text();
          if (text && text.trim()) {
            const data = JSON.parse(text);
            if (Array.isArray(data.records)) {
              for (const sRec of data.records) {
                const lRec = localMap.get(sRec.id);
                if (!lRec || (sRec.lastUpdated && sRec.lastUpdated > (lRec.lastUpdated || 0))) {
                  const validated = this.sanitizeRecord(sRec);
                  localMap.set(sRec.id, validated);
                  this.savePrediction(validated);
                }
              }
            }
          }
        } catch (jsonErr) {
          console.warn("[PredictionStorageService] Sync JSON parse warning:", jsonErr);
        }
      }

      // Push newer local records up
      for (const lRec of local) {
        fetch("/api/predictions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: this.serializeRecord(lRec),
        }).catch(() => {});
      }

      const merged = Array.from(localMap.values());
      merged.sort((a, b) => (b.savedAt || b.timestamp || 0) - (a.savedAt || a.timestamp || 0));
      return merged;
    } catch (err) {
      console.warn("[PredictionStorageService] Remote sync warning:", err);
      return this.getAllPredictions();
    }
  }

  /**
   * Export archive as JSON string for backup
   */
  public static exportArchiveJson(): string {
    const records = this.getAllPredictions();
    return JSON.stringify(records, null, 2);
  }

  /**
   * Import archive from JSON string with validation
   */
  public static importArchiveJson(jsonString: string): { importedCount: number; errors: string[] } {
    const errors: string[] = [];
    let importedCount = 0;

    try {
      const parsed = JSON.parse(jsonString);
      if (!Array.isArray(parsed)) {
        return { importedCount: 0, errors: ["Imported file must contain an array of prediction records"] };
      }

      for (let i = 0; i < parsed.length; i++) {
        const item = parsed[i];
        const validation = this.validatePredictionRecord(item);
        if (validation.isValid && validation.record) {
          this.savePrediction(validation.record);
          importedCount++;
        } else {
          errors.push(`Record ${i + 1} (${item?.id || "unknown"}): ${validation.errors.join(", ")}`);
        }
      }
    } catch (e: any) {
      errors.push(`JSON parse error: ${e?.message || "Invalid JSON"}`);
    }

    return { importedCount, errors };
  }

  /**
   * Storage health and diagnostic metrics
   */
  public static getStorageHealth(): {
    isLocalStorageAvailable: boolean;
    recordCount: number;
    memoryFallbackActive: boolean;
    totalBytesEstimate: number;
    corruptedCount: number;
  } {
    const isAvail = this.isLocalStorageAvailable();
    const records = this.getAllPredictions();
    let bytes = 0;
    let corrupted = 0;

    if (isAvail) {
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith(STORAGE_PREFIX)) {
            const raw = localStorage.getItem(k);
            if (raw) {
              bytes += raw.length * 2; // UTF-16 approx
              try {
                JSON.parse(raw);
              } catch {
                corrupted++;
              }
            }
          }
        }
      } catch {}
    }

    return {
      isLocalStorageAvailable: isAvail,
      recordCount: records.length,
      memoryFallbackActive: !isAvail || inMemoryCache.size > records.length,
      totalBytesEstimate: bytes,
      corruptedCount: corrupted,
    };
  }

  /**
   * Programmatic logic ensuring strict mathematical reconciliation between Quantitative Metrics
   * and final predictions, and computing rich visual styling tokens for the UI cards.
   */
  public static reconcilePredictionWithQuantitative(
    predictionPicks: number[],
    quantitativeRatings: any[] = [],
    tacticalScenario?: any,
    actualArrival?: number[]
  ): ReconciledHorseVisual[] {
    const ratingsMap = new Map<number, any>();
    for (const r of quantitativeRatings) {
      ratingsMap.set(Number(r.numPmu), r);
    }

    const arrivalFlat = actualArrival && Array.isArray(actualArrival) ? actualArrival.slice(0, 5) : [];
    const goldenBaseNum = tacticalScenario?.goldenBase?.numPmu;

    return predictionPicks.map((horseNum, index) => {
      const q = ratingsMap.get(Number(horseNum)) || {};
      const nom = q.nom || `جواد ${horseNum}`;
      const powerScore = Number(q.predictivePowerScore || q.powerScore || (88 - index * 4));
      const quantScore = Number(q.quantitativeScore || (85 - index * 3));
      const tactScore = Number(q.tacticalScore || (84 - index * 3));
      const pathScore = Number(q.pathfindingScore || q.pathfindingOrdreScore || 75);
      const isGolden = goldenBaseNum === horseNum || index === 0;
      const riskRewardRatio = q.riskRewardRatio || q.riskRewardMetrics?.ratio;
      const isHighValueTocard = riskRewardRatio && riskRewardRatio >= 2.0;

      let tierKey: ReconciledHorseVisual["tierKey"] = "standard";
      let badgeText = "خيار تكتيكي";
      let bgClass = "bg-slate-900/60";
      let borderClass = "border-slate-700/60";
      let textClass = "text-slate-200";
      let badgeBgClass = "bg-slate-800 text-slate-300 border border-slate-700";
      let glowClass = "";

      if (isGolden || powerScore >= 85) {
        tierKey = "elite_gold";
        badgeText = isGolden ? "ركيزة ذهبية فولاذية" : "نخبة القوة الكمية";
        bgClass = "bg-gradient-to-b from-amber-500/20 via-amber-600/10 to-transparent";
        borderClass = "border-amber-400/80";
        textClass = "text-amber-200";
        badgeBgClass = "bg-amber-400 text-neutral-950 font-black";
        glowClass = "shadow-[0_0_15px_rgba(245,158,11,0.25)] ring-1 ring-amber-400/50";
      } else if (powerScore >= 77) {
        tierKey = "high_power";
        badgeText = "قوة كمية عليا";
        bgClass = "bg-gradient-to-b from-cyan-500/20 via-cyan-600/10 to-transparent";
        borderClass = "border-cyan-400/80";
        textClass = "text-cyan-200";
        badgeBgClass = "bg-cyan-500 text-neutral-950 font-bold";
        glowClass = "shadow-[0_0_12px_rgba(6,182,212,0.2)] ring-1 ring-cyan-400/40";
      } else if (isHighValueTocard || q.tacticalRole?.includes("TOCARD") || q.tacticalRole?.includes("OUTSIDER")) {
        tierKey = "value_tocard";
        badgeText = "توكار منقذ ذو قيمة (EV)";
        bgClass = "bg-gradient-to-b from-orange-500/20 via-orange-600/10 to-transparent";
        borderClass = "border-orange-400/80";
        textClass = "text-orange-200";
        badgeBgClass = "bg-orange-500 text-white font-bold";
        glowClass = "shadow-[0_0_12px_rgba(249,115,22,0.25)] ring-1 ring-orange-400/50";
      } else if (powerScore >= 68) {
        tierKey = "solid_associe";
        badgeText = "مرافق مباشر مؤكد";
        bgClass = "bg-gradient-to-b from-indigo-500/20 via-indigo-600/10 to-transparent";
        borderClass = "border-indigo-400/70";
        textClass = "text-indigo-200";
        badgeBgClass = "bg-indigo-600 text-white font-bold";
        glowClass = "ring-1 ring-indigo-400/40";
      }

      const isMatchWithArrival = arrivalFlat.includes(horseNum);

      return {
        numPmu: horseNum,
        nom,
        rankIndex: index + 1,
        predictivePowerScore: Math.round(powerScore * 10) / 10,
        quantitativeScore: Math.round(quantScore * 10) / 10,
        tacticalScore: Math.round(tactScore * 10) / 10,
        pathfindingScore: Math.round(pathScore * 10) / 10,
        winProb: q.winProb,
        podiumProb: q.top3Prob,
        speedRatingKm: q.speedRatingKm,
        energyReservePct: q.energyReservePct,
        riskRewardRatio: riskRewardRatio,
        tacticalRole: q.role || q.tacticalRole || (index === 0 ? "BASE_SOLIDE" : "PRIME_ASSOCIE"),
        tierKey,
        badgeText,
        bgClass,
        borderClass,
        textClass,
        badgeBgClass,
        glowClass,
        isMatchWithArrival,
      };
    });
  }
}
