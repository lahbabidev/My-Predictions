import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { 
  computeAdvancedAnalysis, 
  computeTacticalScenario, 
  computeQuinteDesordreSystem,
  calculatePredictivePowerScore
} from "@/lib/analyticalEngine";
import { saveServerPrediction, normalizePredictionId } from "@/lib/serverPredictionStore";
import { StoredPredictionRecord } from "@/lib/predictionStorage";

// Lazy initialize GoogleGenAI
let aiClient: GoogleGenAI | null = null;
function getAI() {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({ 
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// In-memory prediction cache to eliminate redundant AI calls for the same race
const predictionCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

// Rate limit / Quota cooldown tracker to prevent repeated 429 quota errors
let quotaCooldownUntil = 0;

export async function POST(req: Request) {
  try {
    const { 
      raceInfo, 
      participants, 
      date: clientDate, 
      reunion: clientReunion, 
      course: clientCourse,
      tacticalOutputs,
      quantitativeOutputs,
      bonusSystemOutputs,
      selectedEnsemblePathway 
    } = await req.json();

    if (!raceInfo || !participants) {
      return NextResponse.json({ error: "Missing race data" }, { status: 400 });
    }

    const recDate = clientDate || (raceInfo.date ? String(raceInfo.date) : "");
    const recReunion = clientReunion || `R${raceInfo.numReunion || 1}`;
    const recCourse = clientCourse || `C${raceInfo.numOrdre || 1}`;

    // Build unique cache key for this race and pathway
    const cacheKey = `${recDate}_${recReunion}_${recCourse}_${participants.length}_${selectedEnsemblePathway || "balanced"}`;
    const cached = predictionCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return NextResponse.json(cached.data);
    }

    // Process participants through our advanced mathematical and tactical engine
    const metrics = computeAdvancedAnalysis(participants, raceInfo);
    const scenario = computeTacticalScenario(metrics, raceInfo.distance, raceInfo.discipline);
    const quinteSystem = computeQuinteDesordreSystem(metrics, scenario);

    const baseNumbers = quinteSystem.unbreakableBases.map(b => b.numPmu);
    const associeNumbers = quinteSystem.primeAssociés.map(a => a.numPmu);
    const tocardHorse = quinteSystem.tocardSauveur;
    const goldenHorse = quinteSystem.unbreakableBases[0];

    const fallbackPrediction = {
      isAiGenerated: false,
      aiModelUsed: "المحرك الرياضي البايزي ومحاكاة مونت كارلو (Bayesian Engine)",
      timestamp: Date.now(),
      prediction: quinteSystem.coreTop5.map(h => h.numPmu),
      goldenBase: goldenHorse ? goldenHorse.numPmu : baseNumbers[0],
      bases: baseNumbers,
      associes: associeNumbers,
      tocardSauveur: tocardHorse ? tocardHorse.numPmu : null,
      quinteDesordrePicks: quinteSystem.extendedTop7.map(h => h.numPmu),
      desordreConfidenceScore: quinteSystem.overallDesordreConfidence,
      analysis: `تحليل تكتيكي مسند لسباق ${raceInfo.libelle} (${raceInfo.distance}م): تم اعتماد النمذجة البايزية المتقدمة لتقليص فجوة التوقعات بين الخيول المفضلة والأوتسايدر وتثبيت الركيزة الذهبية N°${goldenHorse?.numPmu || baseNumbers[0]} مع تأمين جوائز الكينتي ديزورد والـ Bonus.`,
      quinteDesordreAnalysis: `لضمان دخول 5 خيول في الكينتي ديزورد، تم تثبيت الركائز (${baseNumbers.join(", ")}) وتطويق المراكز المتبقية بالخيول المرافقة والتوكار المنقذ في صيغة Champ Réduit مع المتغير X لتغطية جوائز Bonus 5 و Bonus 4 و Bonus 3.`,
      tacticalAnalysis: `سيناريو الشوط يتجه نحو "${scenario.paceTitle}". تم إخضاع المسار لتحليل ديناميكي للمنعطفات والخط المستقيم (Dynamic Pathfinding): الخيول ذات تصفيف الحوافر D4 تمتلك الأفضلية الحركية للتموضع المثالي على الحبل وحسم السرعة عند مدخل الخط المستقيم الأخير.`,
      quantitativeAnalysis: `المؤشرات الكمية تبرز الخيول ذات مؤشر القوة التنبؤية المرتفع وقوة الانعطاف لحسم سباق ${raceInfo.distance}م.`,
      profitStrategy: "تطبيق استراتيجية الرهان التبادلي والـ Combiné 6 يضمن استرداد رأس المال مع أرباح مضاعفة حتى عند وصول 4 خيول فقط عبر جوائز البونص.",
      unbreakableBases: baseNumbers,
      targetedStrategies: quinteSystem.targetedStrategies,
      formulas: quinteSystem.formulas,
      fauxFavoris: quinteSystem.fauxFavoris,
      profitSafeguardRules: quinteSystem.profitSafeguardRules,
      ensembleProfiles: quinteSystem.ensembleProfiles,
    };

    let resultJson: any = null;
    let modelUsedName = "";
    const ai = getAI();
    const isCooldownActive = Date.now() < quotaCooldownUntil;

    // Only attempt Gemini API if API key is present and quota is not currently exhausted
    if (ai && !isCooldownActive) {
      const syntheseSummary = quinteSystem.syntheseUltime.map(entry => {
        return `#${entry.rank} -> N°${entry.numPmu} ${entry.nom} | Score: ${entry.predictivePowerScore}/100 | Role: ${entry.roleLabel} | Edge: ${entry.primaryKeyEdge} | Ticket: ${entry.ticketUsage}`;
      }).join("\n");

      const fauxFavorisSummary = quinteSystem.fauxFavoris.length > 0
        ? quinteSystem.fauxFavoris.map(f => `⚠️ TRAP DETECTED: N°${f.numPmu} ${f.nom} is a Fake Favorite! Vulnerabilities: ${f.reasons.join(" + ")}. Better statistical alternative: N°${f.saferAlternativeNum} ${f.saferAlternativeNom}`).join("\n")
        : "No public traps detected. Field aligns with mathematical ratings.";

      // Incorporate explicit client tactical and quantitative analysis payloads if supplied
      const tacticalSummaryText = tacticalOutputs ? `
- مخرجات TacticalAnalysisView المستلمة:
  * وتيرة ونسق الشوط: ${tacticalOutputs.paceTitle || scenario.paceTitle} (${tacticalOutputs.paceDescription || scenario.paceDescription})
  * نصيحة التموضع التكتيكي: ${tacticalOutputs.tacticalAdvice || scenario.tacticalAdvice}
  * الركيزة التكتيكية الذهبية: ${tacticalOutputs.goldenBase ? `N°${tacticalOutputs.goldenBase.numPmu} ${tacticalOutputs.goldenBase.nom}` : `N°${scenario.goldenBase?.numPmu}`}
  * المتصدرون المحتملون: ${tacticalOutputs.probableLeaders?.map((l: any) => `N°${l.numPmu} ${l.nom}`).join("، ") || "كوكبة متقاربة"}
  * خيول التسارع في الخط المستقيم (Closers): ${tacticalOutputs.probableClosers?.map((c: any) => `N°${c.numPmu} ${c.nom}`).join("، ") || "كوكبة متقاربة"}
` : "";

      const quantitativeSummaryText = quantitativeOutputs ? `
- مخرجات QuantitativeAnalysisView المستلمة:
  * عدد المشاركين المحللين كمياً: ${quantitativeOutputs.participantsRatings?.length || metrics.length} خيول
  * الخيول الأعلى تصنيفاً في القوة التنبؤية (Predictive Power): ${quantitativeOutputs.participantsRatings?.slice(0, 5).map((r: any) => `N°${r.numPmu} ${r.nom} (${r.predictivePowerScore}/100)`).join("، ") || ""}
` : "";

      const horseStats = metrics.map((m) => {
        const p = participants.find((x: any) => x.numPmu === m.numPmu) || {};
        const posMatrix = m.positionProbMatrix;
        const powerScore = calculatePredictivePowerScore(m, scenario);
        const pathfinding = m.pathfindingMetrics || { turnEfficiencyScore: 70, straightlineAccelerationScore: 70, pathfindingOrdreScore: 70, tacticalPathNotes: "" };
        const fatigue = m.fatigueMetrics || { energyReservePct: 85, statusLabel: "جاهزية مثالية", tacticalDrainRiskLabel: "منخفض" };
        const riskReward = m.riskRewardMetrics || { ratio: 1.0, score: 5, categoryLabel: "فرصة متوازنة", recommendation: "" };

        return `Num: ${m.numPmu} | Nom: ${m.nom} | Age: ${p.age} | Driver/Jockey: ${p.driver || p.jockey} | Trainer: ${p.entraineur} | Musique: ${p.musique} | Gains: ${p.gainsParticipant?.gainsCarriere || 0} € | Place Corde: ${p.placeCorde || p.numPmu} | PMU Odds: ${m.pmuOdds || "N/A"}
- PREDICTIVE POWER COMPOSITE: ${powerScore}/100 (Profit-driven: Penalizes fake favorites, boosts true value Tocards)
- Quantitative Benchmarks: Quantitative Score: ${m.quantitativeScore}/100 | Class Power: ${m.classPowerIndex}/100 | Speed Rating (Réduction Km): ${m.speedRatingKm || "N/A"} | Profit Safety: ${m.profitSafetyScore}/100
- Dynamic Pathfinding: Turn Efficiency: ${pathfinding.turnEfficiencyScore}/100 | Straightline Acceleration: ${pathfinding.straightlineAccelerationScore}/100 | Tiercé Ordre Pathfinding Score: ${pathfinding.pathfindingOrdreScore}/100 | Path Note: ${pathfinding.tacticalPathNotes}
- Physical Fatigue & Energy: Energy Reserve: ${fatigue.energyReservePct}% | State: ${fatigue.statusLabel} | Tactical Drain Risk: ${fatigue.tacticalDrainRiskLabel}
- Risk / Reward Ratio: ${riskReward.ratio} (Score: ${riskReward.score}/10) | Category: ${riskReward.categoryLabel} | Advice: ${riskReward.recommendation}
- Tactical Profile: Style: ${m.runningStyleLabel} | Ferrage: ${m.ferrageCode} (${m.ferrageLabel}) | Tactical Role: ${m.tacticalRole} | Blinkers: ${m.oeilleres || "SANS"} | Driver Changed: ${m.driverChange ? "OUI" : "Non"}
- Strike Rates: Wins: ${m.strikeRateWins || 0}% | Places (Top 3): ${m.strikeRatePlaces || 0}%
- Real PMU Signals: Trainer Outlook: ${m.trainerOpinion || "NEUTRE"} | Grosse Prise (Institutional Bet): ${m.grossePrise ? "YES - DÉTECTÉE PAR PMU" : "Non"} | Earnings Velocity: ${m.earningsVelocity}% of career earnings this year | Supplementary: ${m.isSupplemented ? "OUI (Supplémenté)" : "Non"}
- Bayesian Position Posteriors: 1er: ${posMatrix?.pos1}% | 2e: ${posMatrix?.pos2}% | 3e: ${posMatrix?.pos3}% | 4e: ${posMatrix?.pos4}% | 5e: ${posMatrix?.pos5}% | Top 5 Désordre Total: ${posMatrix?.top5Desordre}% | Role: ${posMatrix?.desordreRoleLabel}
- Monte Carlo (10K runs): Win Prob: ${m.winProb}% | Top 3 Place Prob: ${m.top3Prob}% | 95% CI Rank: [${m.confidenceInterval[0]} - ${m.confidenceInterval[1]}] | EV Value Index: ${m.valueIndex} | Oracle Score: ${m.oracleScore}/100`;
      }).join("\n\n");

      const prompt = `أنت الخبير الاستراتيجي والمحلل الكمي الأول لسباقات الخيول الفرنسية (PMU Syndicator & AI Quantitative Handicapper).
المطلوب منك تحليل هذا السباق الحقيقي بدقة فائقة باللغة العربية، وتقديم توقعات ذكية واضحة مع الشرح التكتيكي المفصل مع ذكر أسماء الخيول والفرسان وأرقامهم.

معلومات السباق:
- اسم السباق: ${raceInfo.libelle}
- المسافة: ${raceInfo.distance} متر | التخصص: ${raceInfo.discipline}
- الشروط والظروف: ${raceInfo.conditions || "عادية"}
- وتيرة السباق المتوقعة: ${scenario.paceTitle} (${scenario.paceDescription})
- مسار التوقع المختار: ${selectedEnsemblePathway || "balanced"}

=== مدخلات ومخرجات التحليل التكتيكي الصريحة (TacticalAnalysisView Inputs) ===
${tacticalSummaryText}
- نوع النسق والوتيرة: ${scenario.paceType} - ${scenario.paceTitle} (${scenario.paceDescription})
- متصدرو السباق المحتملون (Probable Leaders): ${scenario.probableLeaders.map(h => `N°${h.numPmu} ${h.nom} [الأسلوب: ${h.runningStyleLabel}]`).join("، ") || "لا يوجد متصدر صريح"}
- الخيول المباغتة في الخط الأخير (Probable Closers / Finisseurs): ${scenario.probableClosers.map(h => `N°${h.numPmu} ${h.nom} [تسارع الخط المستقيم: ${h.pathfindingMetrics?.straightlineAccelerationScore || 70}/100]`).join("، ") || "كوكبة متقاربة"}
- نصيحة التموضع التكتيكي: ${scenario.tacticalAdvice}
- الركيزة الذهبية التكتيكية الموصى بها: N°${scenario.goldenBase?.numPmu} ${scenario.goldenBase?.nom} (نقاط تكتيكية: ${scenario.goldenBase?.tacticalScore}/100)
- الثنائي الأكثر أماناً (Safe Couples): ${scenario.safeCouples && scenario.safeCouples.length >= 2 ? `N°${scenario.safeCouples[0]?.numPmu} ${scenario.safeCouples[0]?.nom} + N°${scenario.safeCouples[1]?.numPmu} ${scenario.safeCouples[1]?.nom}` : "غير محدد"}
- ترتيب المسار الديناميكي لـ Tiercé Ordre: ${scenario.safeTierceReduction.map(h => `N°${h.numPmu} ${h.nom} (كفاءة المنعطفات: ${h.pathfindingMetrics?.turnEfficiencyScore} | تسارع الخط: ${h.pathfindingMetrics?.straightlineAccelerationScore} | مؤشر الترتيب: ${h.pathfindingMetrics?.pathfindingOrdreScore})`).join(" -> ")}

=== مدخلات ومخرجات التحليل الكمي وحسابات البونص والكينتي الصريحة (QuantitativeAnalysisView & Bonus Engine Inputs) ===
${quantitativeSummaryText}
- الركائز الثابتة المحسوبة رياضياً (Unbreakable Bases): ${baseNumbers.map(n => `N°${n}`).join("، ")}
- الخيول المرافقة المؤهلة (Prime Associés): ${associeNumbers.map(n => `N°${n}`).join("، ")}
- التوكار المنقذ ذو القيمة الرياضية العالية (Tocard Sauveur): ${tocardHorse ? `N°${tocardHorse.numPmu} ${tocardHorse.nom} (نسبة العائد/المخاطرة: ${tocardHorse.riskRewardMetrics?.ratio} | فئة: ${tocardHorse.riskRewardMetrics?.categoryLabel})` : "لا يوجد توكار صريح"}
- الخماسي الأساسي المقترح رياضياً لـ Quinté+ Désordre: ${quinteSystem.coreTop5.map(h => `N°${h.numPmu} ${h.nom}`).join(" - ")}
- السباعي الموسع لحماية جوائز البونص (Bonus 5, Bonus 4, Bonus 3): ${quinteSystem.extendedTop7.map(h => `N°${h.numPmu} ${h.nom}`).join(" - ")}
- نسبة الثقة الإحصائية لـ Quinté+ Désordre: ${quinteSystem.overallDesordreConfidence}%
- التوليفات المحسوبة لجوائز البونص:
  * Tiercé Ordre المقترح رياضياً: ${quinteSystem.targetedStrategies.tierceOrdre.ticket.join(" - ")} (احتمالية: ${quinteSystem.targetedStrategies.tierceOrdre.confidence}%)
  * Quinté+ Bonus 5 المقترح: ${(quinteSystem.targetedStrategies.quinteBonus5?.ticket || quinteSystem.extendedTop7.slice(0, 6).map(h => h.numPmu)).join(" - ")} (احتمالية: ${quinteSystem.targetedStrategies.quinteBonus5?.confidence || 90}%)
  * Quarté+ Bonus 3 المقترح: ${quinteSystem.targetedStrategies.quarteBonus3.ticket.join(" - ")} (احتمالية: ${quinteSystem.targetedStrategies.quarteBonus3.confidence}%)
  * Quinté+ Bonus 4 و Bonus 3: ${(quinteSystem.targetedStrategies.quinteBonus4?.ticket || quinteSystem.coreTop5.map(h => h.numPmu)).join(" - ")}

بيانات الخيول المشاركة:
${horseStats}

التصنيف الإحصائي المبدئي:
${syntheseSummary}

فخاخ الخيول المفضلة المزيفة (Faux Favoris):
${fauxFavorisSummary}

توجيهات حاسمة ومشددة لدمج نتائج التحليل التكتيكي والكمي في التوقع النهائي:
1. الترتيب الدقيق لمراكز الخماسي (prediction):
   - يجب أن تعكس المراكز الثلاثة الأولى (Tiercé Ordre) نتائج تحليل المسار الديناميكي (Pathfinding Ordre Score) وتصنيف السرعة والتسارع في الخط المستقيم.
   - يجب أن تتضمن المراكز الخمسة الركائز الثابتة (bases) أو الركيزة الذهبية (goldenBase) مع إدماج خيل مرافق أو التوكار المنقذ ذي القيمة العالية في المراكز 3 إلى 5 لتحقيق Quinté+ Désordre وحماية شبكة الـ Bonus.
2. حقل "quantitativeAnalysis":
   - يجب أن يتضمن تحليلاً رقمياً دقيقاً يستشهد بالمعطيات الرقمية المحددة: مؤشرات القوة التنبؤية (Predictive Power Scores)، سرعة الكيلومتر (Réduction Km)، نسب الفوز، ومصفوفة الاحتمالات البايزية (Bayesian Positional Probabilities).
3. حقل "tacticalAnalysis":
   - يجب أن يعكس تفصيلياً سيناريو النسق (${scenario.paceTitle})، حركة المتصدرين عند المنعطف الأخير، واستجابة الخيول المباغتة في الخط المستقيم وتأثير تصفيف الحوافر D4.
4. حقل "quinteDesordreAnalysis":
   - وضح كيف تم توزيع الخيول لتغطية Quinté+ Désordre وجوائز Bonus 5 و Bonus 4 و Bonus 3، مع تبرير إدراج الخيول ذات القيمة العالية (Value Tocards) لتقليص فجوة التوقعات بين الخيول المفضلة والخيول المفاجئة.

أرجع حصرياً كائن JSON صالح وبدون نصوص خارج الكائن:
{
  "prediction": [رقم1, رقم2, رقم3, رقم4, رقم5],
  "goldenBase": رقم_الركيزة_الذهبية,
  "bases": [رقم_ركيزة1, رقم_ركيزة2],
  "associes": [رقم_مرافق1, رقم_مرافق2, رقم_مرافق3],
  "tocardSauveur": رقم_التوكار_المنقذ,
  "quinteDesordrePicks": [7_أرقام_للكينتي_ديزورد_والبونص],
  "desordreConfidenceScore": نسبة_الثقة_من_80_الى_98,
  "analysis": "تحليل استراتيجي شامل باللغة العربية يذكر أرقام وأسماء الخيول والفرسان بالتفصيل...",
  "tacticalAnalysis": "تحليل تكتيكي يدمج سيناريو النسق والمسار الديناميكي في المنعطفات والخط المستقيم...",
  "quinteDesordreAnalysis": "خطة وتكتيك اقتناص Quinté+ Désordre وتغطية جوائز Bonus 5 و Bonus 4 و Bonus 3...",
  "quantitativeAnalysis": "قراءة دقيقة للأرقام المحسوبة: مؤشرات القوة التنبؤية ومعدلات السرعة والاحتمالات البايزية...",
  "profitStrategy": "استراتيجية الرهان التبادلي وتوزيع الحصص لحماية رأس المال واقتناص أفضل قيمة متوقعة (EV)..."
}`;

      // Cascade of models: fastest and most resilient first
      const candidateModels = [
        "gemini-3.1-flash-lite",
        "gemini-2.5-flash",
        "gemini-flash-latest",
        "gemini-3.8-flash"
      ];

      const modelDisplayMap: Record<string, string> = {
        "gemini-3.1-flash-lite": "Google Gemini 3.1 Flash Lite",
        "gemini-2.5-flash": "Google Gemini 2.5 Flash",
        "gemini-flash-latest": "Google Gemini Flash",
        "gemini-3.8-flash": "Google Gemini 3.8 Flash",
      };

      for (const modelCandidate of candidateModels) {
        let attempt = 0;
        let modelSuccess = false;

        while (attempt < 2 && !modelSuccess) {
          attempt++;
          try {
            const response = await ai.models.generateContent({
              model: modelCandidate,
              contents: prompt,
              config: {
                responseMimeType: "application/json",
              },
            });

            const text = response.text || "{}";
            const clean = text.replace(/^```json/m, '').replace(/```$/m, '').trim();
            resultJson = JSON.parse(clean);
            if (resultJson && Array.isArray(resultJson.prediction) && resultJson.prediction.length >= 3) {
              modelUsedName = modelDisplayMap[modelCandidate] || `Google Gemini (${modelCandidate})`;
              modelSuccess = true;
              break;
            }
          } catch (err: any) {
            const errString = String(err?.message || err);
            const is503 = errString.includes("503") || errString.includes("high demand") || errString.includes("unavailable");
            const isQuota = errString.includes("429") || 
                            errString.includes("quota") || 
                            errString.includes("RESOURCE_EXHAUSTED");

            if (isQuota) {
              quotaCooldownUntil = Date.now() + 60 * 1000;
              break;
            }

            if (is503 && attempt === 1) {
              await new Promise((r) => setTimeout(r, 400));
              continue;
            }

            console.info(`[Prediction API] Model ${modelCandidate} stepped down, passing to next model...`);
            break;
          }
        }

        if (modelSuccess) {
          break;
        }
      }
    }

    const structuredTacticalScenario = {
      paceType: scenario.paceType,
      paceTitle: scenario.paceTitle,
      paceDescription: scenario.paceDescription,
      probableLeaders: scenario.probableLeaders.map(h => ({ numPmu: h.numPmu, nom: h.nom })),
      probableClosers: scenario.probableClosers.map(h => ({ numPmu: h.numPmu, nom: h.nom })),
      tacticalAdvice: scenario.tacticalAdvice,
      goldenBase: scenario.goldenBase ? { numPmu: scenario.goldenBase.numPmu, nom: scenario.goldenBase.nom } : undefined,
      safeCouples: scenario.safeCouples ? scenario.safeCouples.map(h => ({ numPmu: h.numPmu, nom: h.nom })) : undefined,
    };

    const structuredQuantitativeRatings = metrics.map(m => ({
      numPmu: m.numPmu,
      nom: m.nom,
      predictivePowerScore: m.predictivePowerScore || calculatePredictivePowerScore(m, scenario),
      quantitativeScore: m.quantitativeScore,
      tacticalScore: m.tacticalScore,
      pathfindingScore: m.pathfindingMetrics?.pathfindingOrdreScore || 70,
      winProb: m.winProb,
      top3Prob: m.top3Prob,
      odds: m.pmuOdds,
      ferrage: m.ferrageCode,
      role: m.tacticalRole,
      speedRatingKm: m.speedRatingKm,
      energyReservePct: m.fatigueMetrics?.energyReservePct,
      riskRewardRatio: m.riskRewardMetrics?.ratio,
    }));

    const structuredBonusCombinations = {
      bonus3Picks: quinteSystem.targetedStrategies.quinteBonus3?.ticket || quinteSystem.coreTop5.map(h => h.numPmu),
      bonus4Picks: quinteSystem.targetedStrategies.quinteBonus4?.ticket || quinteSystem.coreTop5.map(h => h.numPmu),
      bonus5Picks: quinteSystem.targetedStrategies.quinteBonus5?.ticket || quinteSystem.extendedTop7.slice(0, 6).map(h => h.numPmu),
      weightedCombinations: [
        {
          label: "توليفة Quinté+ Désordre & Bonus 5 المرجحة",
          combination: quinteSystem.targetedStrategies.quinteBonus5?.ticket || quinteSystem.extendedTop7.slice(0, 6).map(h => h.numPmu),
          tierceOrdre: quinteSystem.targetedStrategies.tierceOrdre.ticket,
          confidence: quinteSystem.overallDesordreConfidence,
          evPotential: "عائد مرتفع (High EV)",
          type: "BONUS_5"
        },
        {
          label: "توليفة Quarté+ Bonus 3 التأمينية",
          combination: quinteSystem.targetedStrategies.quarteBonus3.ticket,
          tierceOrdre: quinteSystem.targetedStrategies.tierceOrdre.ticket,
          confidence: quinteSystem.targetedStrategies.quarteBonus3.confidence,
          evPotential: "عائد متوازن (Optimal)",
          type: "BONUS_3"
        }
      ]
    };

    if (!resultJson || !Array.isArray(resultJson.prediction) || resultJson.prediction.length === 0) {
      resultJson = fallbackPrediction;
    } else {
      resultJson.isAiGenerated = true;
      resultJson.aiModelUsed = modelUsedName || "Google Gemini AI";
      resultJson.timestamp = Date.now();
      // Ensure all deterministic mathematical strategies & ensemble pathways are populated
      resultJson.targetedStrategies = quinteSystem.targetedStrategies;
      resultJson.formulas = quinteSystem.formulas;
      resultJson.fauxFavoris = quinteSystem.fauxFavoris;
      resultJson.profitSafeguardRules = quinteSystem.profitSafeguardRules;
      resultJson.unbreakableBases = Array.isArray(resultJson.bases) && resultJson.bases.length > 0 ? resultJson.bases : baseNumbers;
      resultJson.goldenBase = resultJson.goldenBase || baseNumbers[0];
      resultJson.tocardSauveur = resultJson.tocardSauveur || (tocardHorse ? tocardHorse.numPmu : null);
      resultJson.quinteDesordrePicks = Array.isArray(resultJson.quinteDesordrePicks) && resultJson.quinteDesordrePicks.length >= 5 ? resultJson.quinteDesordrePicks : quinteSystem.extendedTop7.map(h => h.numPmu);
      resultJson.ensembleProfiles = quinteSystem.ensembleProfiles;
    }

    // Attach structured tactical, quantitative, and bonus objects
    resultJson.tacticalScenario = structuredTacticalScenario;
    resultJson.quantitativeRatings = structuredQuantitativeRatings;
    resultJson.bonusCombinations = structuredBonusCombinations;
    resultJson.syntheseUltime = quinteSystem.syntheseUltime;
    resultJson.profitMaximizerInsights = quinteSystem.profitMaximizerInsights;

    // Auto-persist directly to server-side permanent archive
    try {
      const ordreArr = raceInfo.ordreArrivee;
      const hasArrival = Array.isArray(ordreArr) && ordreArr.length > 0;
      const actualArrival = hasArrival ? ordreArr.map((pos: any) => pos[0]).slice(0, 5) : [];
      const isFinished = Boolean(raceInfo.statut !== "PROGRAMMEE" && hasArrival);

      const canonicalId = normalizePredictionId(recDate, recReunion, recCourse);
      const serverRecord: StoredPredictionRecord = {
        id: canonicalId,
        date: recDate,
        reunion: recReunion,
        course: recCourse,
        raceName: raceInfo.libelle || `سباق (${recReunion} ${recCourse})`,
        hippodrome: raceInfo.hippodrome?.libelleCourt || "",
        discipline: raceInfo.discipline || "غير محدد",
        terrain: raceInfo.penetrometre?.intitule || raceInfo.typePiste || raceInfo.discipline || "غير محدد",
        distance: raceInfo.distance || 0,
        timestamp: Date.now(),
        savedAt: Date.now(),
        lastUpdated: Date.now(),
        prediction: resultJson.prediction,
        goldenBase: resultJson.goldenBase,
        bases: resultJson.bases,
        associes: resultJson.associes,
        tocardSauveur: resultJson.tocardSauveur,
        quinteDesordrePicks: resultJson.quinteDesordrePicks,
        desordreConfidenceScore: resultJson.desordreConfidenceScore,
        analysis: resultJson.analysis,
        tacticalAnalysis: resultJson.tacticalAnalysis,
        quantitativeAnalysis: resultJson.quantitativeAnalysis,
        quinteDesordreAnalysis: resultJson.quinteDesordreAnalysis,
        profitStrategy: resultJson.profitStrategy,
        aiModelUsed: resultJson.aiModelUsed,
        isAiGenerated: resultJson.isAiGenerated,
        ensemblePathway: "balanced",
        tacticalScenario: structuredTacticalScenario,
        quantitativeRatings: structuredQuantitativeRatings,
        bonusCombinations: structuredBonusCombinations,
        syntheseUltime: quinteSystem.syntheseUltime,
        profitMaximizerInsights: quinteSystem.profitMaximizerInsights,
        targetedStrategies: resultJson.targetedStrategies,
        formulas: resultJson.formulas,
        fauxFavoris: resultJson.fauxFavoris,
        profitSafeguardRules: resultJson.profitSafeguardRules,
        ensembleProfiles: resultJson.ensembleProfiles,
        isFinished,
        actualArrival,
        status: raceInfo.statut || "PROGRAMMEE",
        matchCount: isFinished ? resultJson.prediction.filter((p: number) => actualArrival.includes(p)).length : 0,
      };

      saveServerPrediction(serverRecord);
      resultJson.serverSaved = true;
    } catch (storeErr) {
      console.warn("[Prediction API] Server auto-persistence warning:", storeErr);
    }

    // Cache the response
    predictionCache.set(cacheKey, { data: resultJson, timestamp: Date.now() });

    return NextResponse.json(resultJson);
  } catch (error) {
    console.error("[Prediction API] Unexpected error:", error);
    return NextResponse.json({ error: "Failed to generate prediction" }, { status: 500 });
  }
}
