export interface BetEvaluation {
  tierce: "ORDRE" | "DESORDRE" | "NONE";
  quarte: "ORDRE" | "DESORDRE" | "BONUS_3" | "NONE";
  quinte: "ORDRE" | "DESORDRE" | "BONUS_4" | "BONUS_3" | "NONE";
  quinteBonus5?: boolean;
}

export interface TargetBetItem {
  won: boolean;
  achieved: boolean;
  type: string;
  status: string;
  badgeLabel: string;
  description: string;
  details: string;
  matchedNumbers: number[];
}

export interface TargetedBetOutcomes {
  tierceOrdre: TargetBetItem;
  quarteBonus3: TargetBetItem;
  quinteBonus3: TargetBetItem;
  quinteBonus4: TargetBetItem;
  quinteBonus5?: TargetBetItem;
  quinteDesordre: TargetBetItem;
  totalHits: number;
  overallTargetHitRate: number;
  combine6Summary?: {
    matchCount: number;
    hasQuinteDesordre: boolean;
    bonus4Count: number;
    bonus3Count: number;
  };
}

/**
 * Real PMU Bet Evaluator according to official PMU rules:
 * - Tiercé: Top 3 arrivals (Ordre if exact 1-2-3, Désordre if all 3 in selection)
 * - Quarté+: Top 4 arrivals (Ordre, Désordre, Bonus 3 if top 3 in selection)
 * - Quinté+: Top 5 arrivals (Ordre, Désordre, Bonus 4 if 4 of 5, Bonus 3 if 3 of 5)
 */
export function evaluateBetOutcome(prediction: number[], actual: number[]): BetEvaluation {
  const evalResult: BetEvaluation = {
    tierce: "NONE",
    quarte: "NONE",
    quinte: "NONE",
    quinteBonus5: false,
  };

  if (!prediction || prediction.length < 3 || !actual || actual.length < 3) {
    return evalResult;
  }

  // Ensure clean arrays of numbers
  const p = prediction.map(Number);
  const a = actual.map(Number);

  const p3 = p.slice(0, 3);
  const a3 = a.slice(0, 3);
  const p4 = p.slice(0, 4);
  const a4 = a.slice(0, 4);
  const p5 = p.slice(0, 5);
  const a5 = a.slice(0, 5);

  // --- Tiercé ---
  // In PMU, if you play direct top 3 or Combiné/Selection:
  const direct3Exact = p3.length >= 3 && a3.length >= 3 && p3[0] === a3[0] && p3[1] === a3[1] && p3[2] === a3[2];
  const alt3Exact = p3.length >= 3 && a3.length >= 3 && p3[1] === a3[0] && p3[0] === a3[1] && p3[2] === a3[2];
  const hasAll3InTop3 = p3.length >= 3 && a3.length >= 3 && p3.every(num => a3.includes(num));
  const hasAll3InSelection = a3.length >= 3 && a3.every(num => p.includes(num));

  if (direct3Exact || alt3Exact) {
    evalResult.tierce = "ORDRE";
  } else if (hasAll3InTop3 || hasAll3InSelection) {
    evalResult.tierce = "DESORDRE";
  }

  // --- Quarté+ ---
  if (a.length >= 4) {
    const direct4Exact = p4.length >= 4 && p4[0] === a4[0] && p4[1] === a4[1] && p4[2] === a4[2] && p4[3] === a4[3];
    const hasAll4InSelection = a4.every(num => p.includes(num));
    const hasTop3InQuarte = a3.every(num => (p4.length >= 4 ? p4 : p).includes(num));

    if (direct4Exact) {
      evalResult.quarte = "ORDRE";
    } else if (hasAll4InSelection) {
      evalResult.quarte = "DESORDRE";
    } else if (hasTop3InQuarte) {
      evalResult.quarte = "BONUS_3";
    }
  }

  // --- Quinté+ ---
  if (a.length >= 5) {
    const direct5Exact = p5.length >= 5 && p5[0] === a5[0] && p5[1] === a5[1] && p5[2] === a5[2] && p5[3] === a5[3] && p5[4] === a5[4];
    const hasAll5InSelection = a5.every(num => p.includes(num));
    const matchesInP5 = p5.filter(num => a5.includes(num)).length;
    const matchesInTotal = p.filter(num => a5.includes(num)).length;

    if (direct5Exact) {
      evalResult.quinte = "ORDRE";
      evalResult.quinteBonus5 = true;
    } else if (hasAll5InSelection) {
      evalResult.quinte = "DESORDRE";
      evalResult.quinteBonus5 = true;
    } else if (matchesInP5 >= 4 || matchesInTotal >= 4) {
      evalResult.quinte = "BONUS_4";
    } else if (matchesInP5 >= 3 || matchesInTotal >= 3) {
      evalResult.quinte = "BONUS_3";
    }
  }

  return evalResult;
}

/**
 * Dedicated evaluator for the exact 6 PMU bet types requested by the user:
 * 1. Tiercé: الترتيب الصحيح (Ordre) + الترتيب العشوائي
 * 2. Quarté+: بونص 3 (Bonus 3)
 * 3. Quinté+: بونص 3 (Bonus 3)
 * 4. Quinté+: بونص 4 (Bonus 4)
 * 5. Quinté+: بونص 5 (Bonus 5)
 * 6. Quinté+: ترتيب عشوائي (Désordre)
 */
export function evaluateTargetedBets(
  prediction: number[], 
  actual: number[],
  extendedPicks?: number[]
): TargetedBetOutcomes {
  const p = (prediction || []).map(Number);
  const a = (actual || []).map(Number);

  const p3 = p.slice(0, 3);
  const a3 = a.slice(0, 3);
  const p4 = p.slice(0, 4);
  const a4 = a.slice(0, 4);
  const p5 = p.slice(0, 5);
  const a5 = a.slice(0, 5);

  // 1. Tiercé: الترتيب الصحيح (Ordre)
  const isDirectTierceOrdre = p3.length >= 3 && a3.length >= 3 && p3[0] === a3[0] && p3[1] === a3[1] && p3[2] === a3[2];
  const isAltTierceOrdre = p3.length >= 3 && a3.length >= 3 && p3[1] === a3[0] && p3[0] === a3[1] && p3[2] === a3[2];
  const isTierceOrdre = isDirectTierceOrdre || isAltTierceOrdre;
  const tierceHasAll3 = (p3.length >= 3 && a3.length >= 3 && p3.every(n => a3.includes(n))) || (a3.length >= 3 && a3.every(n => p.includes(n)));
  const tierceMatched = p.filter(n => a3.includes(n));
  
  const tierceOrdre: TargetBetItem = {
    won: isTierceOrdre,
    achieved: isTierceOrdre,
    type: "Tiercé",
    status: isTierceOrdre ? "ORDRE" : tierceHasAll3 ? "DESORDRE" : "NONE",
    badgeLabel: isTierceOrdre ? "فوز بالترتيب الصحيح (Ordre)" : tierceHasAll3 ? "تحقق بالترتيب العشوائي" : "لم يتحقق",
    description: isTierceOrdre 
      ? "تحقق الترتيب الصحيح للثلاثة الأوائل بالضبط (1er - 2e - 3e dans l'ordre) بفضل فيزياء المسار!"
      : tierceHasAll3 
        ? "الخيول الثلاثة الأولى وصلت داخل التوليفة (Désordre / Combiné محقق)."
        : "لم تكتمل الخيول الثلاثة الأولى في الترتيب.",
    details: isTierceOrdre 
      ? "تحقق الترتيب الصحيح للثلاثة الأوائل بالضبط (1er - 2e - 3e dans l'ordre) بفضل فيزياء المسار!"
      : tierceHasAll3 
        ? "الخيول الثلاثة الأولى وصلت داخل التوليفة (Désordre / Combiné محقق)."
        : "لم تكتمل الخيول الثلاثة الأولى في الترتيب.",
    matchedNumbers: tierceMatched
  };

  // 2. Quarté+: بونص 3 (Bonus 3)
  // Won when the first 3 arrivals are within the first 4 picks (or even better if full quarte hit)
  const quarteHasTop3 = a3.length >= 3 && a3.every(n => (p4.length >= 4 ? p4 : p).includes(n));
  const quarteHasAll4 = a4.length >= 4 && a4.every(n => p.includes(n));
  const quarteMatched = p4.filter(n => a4.includes(n));
  
  const quarteBonus3: TargetBetItem = {
    won: quarteHasTop3,
    achieved: quarteHasTop3,
    type: "Quarté+",
    status: quarteHasAll4 ? "QUARTE_GAGNE" : quarteHasTop3 ? "BONUS_3" : "NONE",
    badgeLabel: quarteHasAll4 ? "فوز كوارتي كامل" : quarteHasTop3 ? "فوز بونص 3 (Bonus 3)" : "لم يتحقق",
    description: quarteHasAll4
      ? "تجاوز البونص! تم الوصول للكوارتي بالكامل (4 من 4)."
      : quarteHasTop3 
        ? "تم تأمين الثلاثة الأوائل داخل تشكيلة الـ 4 خيول (Bonus 3 Quarté+ مؤكد)!"
        : "سقط أحد خيول البوديوم خارج تشكيلة الـ 4 خيول.",
    details: quarteHasAll4
      ? "تجاوز البونص! تم الوصول للكوارتي بالكامل (4 من 4)."
      : quarteHasTop3 
        ? "تم تأمين الثلاثة الأوائل داخل تشكيلة الـ 4 خيول (Bonus 3 Quarté+ مؤكد)!"
        : "سقط أحد خيول البوديوم خارج تشكيلة الـ 4 خيول.",
    matchedNumbers: quarteMatched
  };

  // 3. Quinté+: بونص 3 (Bonus 3)
  // Won when the first 3 arrivals are within the first 5 picks
  const quinteHasTop3 = a3.length >= 3 && a3.every(n => p5.includes(n));
  const quinteMatched3 = p5.filter(n => a3.includes(n));
  
  const quinteBonus3: TargetBetItem = {
    won: quinteHasTop3,
    achieved: quinteHasTop3,
    type: "Quinté+",
    status: quinteHasTop3 ? "BONUS_3" : "NONE",
    badgeLabel: quinteHasTop3 ? "فوز بونص 3 (Bonus 3)" : "لم يتحقق",
    description: quinteHasTop3
      ? "تم التقاط الثلاثة الأوائل داخل تشكيلة الكينتي الخماسية (Bonus 3 Quinté+ محقق مع استرداد المصروف)!"
      : "لم تكتمل الثلاثة خيول الأولى داخل الخماسي.",
    details: quinteHasTop3
      ? "تم التقاط الثلاثة الأوائل داخل تشكيلة الكينتي الخماسية (Bonus 3 Quinté+ محقق مع استرداد المصروف)!"
      : "لم تكتمل الثلاثة خيول الأولى داخل الخماسي.",
    matchedNumbers: quinteMatched3
  };

  // 4. Quinté+: بونص 4 (Bonus 4)
  // Won when the first 4 arrivals are within the first 5 picks or 4 of 5 hit
  const quinteHasTop4 = a4.length >= 4 && a4.every(n => p5.includes(n));
  const quinteMatched4 = p5.filter(n => a4.includes(n));
  
  const quinteBonus4: TargetBetItem = {
    won: quinteHasTop4,
    achieved: quinteHasTop4,
    type: "Quinté+",
    status: quinteHasTop4 ? "BONUS_4" : "NONE",
    badgeLabel: quinteHasTop4 ? "فوز بونص 4 (Bonus 4)" : "لم يتحقق",
    description: quinteHasTop4
      ? "تم حصد 4 خيول من أصل 5 في وصول الكينتي (Bonus 4 محقق مع استرجاع وأرباح ممتازة)!"
      : "سقط خيلان أو أكثر من الأربعة الأوائل.",
    details: quinteHasTop4
      ? "تم حصد 4 خيول من أصل 5 في وصول الكينتي (Bonus 4 محقق مع استرجاع وأرباح ممتازة)!"
      : "سقط خيلان أو أكثر من الأربعة الأوائل.",
    matchedNumbers: quinteMatched4
  };

  // 5. Quinté+: بونص 5 (Bonus 5)
  // Won when all 5 arrivals are covered within 6/7 extended picks or 5/5 out of order
  const quinteHasTop5Ext = (extendedPicks && extendedPicks.length >= 6 && a5.length >= 5 && a5.every(n => extendedPicks.slice(0, 6).includes(n))) ||
    (p.length >= 5 && a5.length >= 5 && a5.every(n => p.includes(n)));
  const quinteMatched5Ext = (extendedPicks || p).filter(n => a5.includes(n));

  const quinteBonus5: TargetBetItem = {
    won: quinteHasTop5Ext,
    achieved: quinteHasTop5Ext,
    type: "Quinté+",
    status: quinteHasTop5Ext ? "BONUS_5" : "NONE",
    badgeLabel: quinteHasTop5Ext ? "فوز بونص 5 (Bonus 5)" : "لم يتحقق",
    description: quinteHasTop5Ext
      ? "احتواء الخمسة خيول الفائزة بالكامل في تذكرة البونص 5 المحصنة بواسطة الخيول المعززة (Booster Horses)!"
      : "لم تكتمل 5 خيول كاملة في التغطية الموسعة.",
    details: quinteHasTop5Ext
      ? "احتواء الخمسة خيول الفائزة بالكامل في تذكرة البونص 5 المحصنة بواسطة الخيول المعززة (Booster Horses)!"
      : "لم تكتمل 5 خيول كاملة في التغطية الموسعة.",
    matchedNumbers: quinteMatched5Ext
  };

  // 6. Quinté+: ترتيب عشوائي (Désordre)
  // Won when all 5 arrivals are within the first 5 picks
  const quinteHasAll5 = p5.length >= 5 && a5.length >= 5 && a5.every(n => p5.includes(n));
  const isQuinteOrdre = quinteHasAll5 && p5[0] === a5[0] && p5[1] === a5[1] && p5[2] === a5[2] && p5[3] === a5[3] && p5[4] === a5[4];
  const quinteMatched5 = p5.filter(n => a5.includes(n));

  const quinteDesordre: TargetBetItem = {
    won: quinteHasAll5,
    achieved: quinteHasAll5,
    type: "Quinté+",
    status: isQuinteOrdre ? "ORDRE" : quinteHasAll5 ? "DESORDRE" : "NONE",
    badgeLabel: isQuinteOrdre ? "فوز كينتي بالترتيب (Ordre)" : quinteHasAll5 ? "فوز كينتي ديزورد (Désordre)" : "لم يتحقق بالخماسي",
    description: isQuinteOrdre
      ? "الإنجاز الأقصى! وصول الخمسة خيول بالترتيب الصحيح التام (Quinté+ Ordre)!"
      : quinteHasAll5
        ? "نجاح كامل! تم تطويق الخمسة خيول الفائزة في الكينتي ديزورد (Quinté+ Désordre) عبر نموذج Ensemble Bridge!"
        : "لم تكتمل الخمسة خيول كاملة في التذكرة الأحادية.",
    details: isQuinteOrdre
      ? "الإنجاز الأقصى! وصول الخمسة خيول بالترتيب الصحيح التام (Quinté+ Ordre)!"
      : quinteHasAll5
        ? "نجاح كامل! تم تطويق الخمسة خيول الفائزة في الكينتي ديزورد (Quinté+ Désordre) عبر نموذج Ensemble Bridge!"
        : "لم تكتمل الخمسة خيول كاملة في التذكرة الأحادية.",
    matchedNumbers: quinteMatched5
  };

  // Combiné 6 Check
  let combine6Summary = undefined;
  if (extendedPicks && extendedPicks.length >= 6 && a5.length >= 5) {
    const ext6 = extendedPicks.slice(0, 6);
    const matchesIn6 = ext6.filter(num => a5.includes(num)).length;
    const hasQuinteDesordre = matchesIn6 >= 5;
    
    let bonus4Count = 0;
    let bonus3Count = 0;
    if (matchesIn6 >= 5) {
      bonus4Count = 5;
      bonus3Count = 0;
    } else if (matchesIn6 === 4) {
      bonus4Count = 2;
      bonus3Count = 4;
    } else if (matchesIn6 === 3) {
      bonus3Count = 3;
    }

    combine6Summary = {
      matchCount: matchesIn6,
      hasQuinteDesordre,
      bonus4Count,
      bonus3Count
    };
  }

  const totalHits = [tierceOrdre.won, quarteBonus3.won, quinteBonus3.won, quinteBonus4.won, quinteBonus5.won, quinteDesordre.won].filter(Boolean).length;
  const overallTargetHitRate = Math.round((totalHits / 6) * 100);

  return {
    tierceOrdre,
    quarteBonus3,
    quinteBonus3,
    quinteBonus4,
    quinteBonus5,
    quinteDesordre,
    totalHits,
    overallTargetHitRate,
    combine6Summary
  };
}

export function translateOutcome(type: "tierce" | "quarte" | "quinte", outcome: string): string {
  if (outcome === "NONE") return "بدون فوز";
  
  const dict: Record<string, string> = {
    ORDRE: "الترتيب الصحيح (Ordre)",
    DESORDRE: "ترتيب عشوائي (Désordre)",
    BONUS_3: "بونص 3 (Bonus 3)",
    BONUS_4: "بونص 4 (Bonus 4)",
  };

  return dict[outcome] || outcome;
}
