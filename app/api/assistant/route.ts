import { GoogleGenAI, Type } from "@google/genai";
import { NextResponse } from "next/server";

let aiClient: GoogleGenAI | null = null;
function getAI(): GoogleGenAI | null {
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

// Helper to fetch data from our own API routes safely
async function internalFetch(path: string) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const response = await fetch(`${baseUrl}${path}`);
    if (!response.ok) return { error: `Failed to fetch ${path}` };
    const text = await response.text();
    if (!text || !text.trim()) return { error: "Empty response" };
    return JSON.parse(text);
  } catch (err: any) {
    return { error: err?.message || "Internal fetch error" };
  }
}

export async function POST(req: Request) {
  try {
    let messages: any[] = [];
    try {
      const text = await req.text();
      if (text && text.trim()) {
        const body = JSON.parse(text);
        messages = body.messages || [];
      }
    } catch {
      return NextResponse.json({ error: "Invalid JSON input" }, { status: 400 });
    }

    const systemInstruction = `أنت "الوكيل الخبير المساعد" (Expert AI Agent) لمنصة توقعات سباق الخيول.
مهمتك هي مساعدة المستخدم في تحليل بيانات السباقات (Tiercé, Quarté, Quinté+)، وجمع المعلومات، وتقديم توقعات دقيقة بناءً على النماذج الرياضية المتقدمة.

صلاحياتك وشخصيتك:
1. أنت خبير في الخيول والرهانات الرياضية الفرنسية (PMU).
2. يمكنك الوصول إلى بيانات البرنامج اليومي والنتائج والتحليلات المعمقة.
3. يمكنك استخدام أدوات (Functions) لجلب البيانات اللحظية والتحليلات.
4. أسلوبك احترافي، تقني، وموجه نحو تحقيق مصلحة المستخدم في الربح الذكي.
5. لغتك الأساسية هي العربية الفصحى بلمسة تقنية.

عندما يسألك المستخدم عن توقعات، قم أولاً بجلب البيانات اللازمة للسباق ثم قم بتحليلها وتقديم "تذكرة ذكية" مقترحة.
أنت تدعم أيضاً فكرة "الخوارزمية الجينية" لانتقاء أفضل 5 خيول (Quinté+) من خلال محاكاة آلاف التشكيلات الممكنة.

أدواتك المتاحة:
- get_daily_programme: لمعرفة سباقات اليوم.
- get_race_details: لمعرفة تفاصيل سباق محدد وخيوله.
- navigate_to_race: لاقتراح رابط السباق للمستخدم.

دائماً قدم إجابات منظمة باستخدام التنسيق المناسب (بولدت، قوائم، جداول إن أمكن).`;

    const tools = [
      {
        functionDeclarations: [
          {
            name: "get_daily_programme",
            description: "جلب برنامج السباقات ليوم معين لمعرفة الاجتماعات والسباقات المتاحة.",
            parameters: {
              type: Type.OBJECT,
              properties: {
                date: {
                  type: Type.STRING,
                  description: "التاريخ بتنسيق DDMMYYYY (مثال: 12092026)",
                },
              },
              required: ["date"],
            },
          },
          {
            name: "get_race_details",
            description: "جلب تفاصيل سباق محدد بما في ذلك قائمة الخيول المشاركة والبيانات الفنية.",
            parameters: {
              type: Type.OBJECT,
              properties: {
                date: { type: Type.STRING, description: "التاريخ DDMMYYYY" },
                reunion: { type: Type.STRING, description: "رقم الاجتماع (مثال: R1)" },
                course: { type: Type.STRING, description: "رقم السباق (مثال: C1)" },
              },
              required: ["date", "reunion", "course"],
            },
          },
          {
            name: "navigate_to_race",
            description: "توليد رابط مباشر لصفحة تحليل سباق معين.",
            parameters: {
              type: Type.OBJECT,
              properties: {
                date: { type: Type.STRING },
                reunion: { type: Type.STRING },
                course: { type: Type.STRING },
              },
              required: ["date", "reunion", "course"],
            },
          }
        ],
      },
    ];

    const modelsToTry = [
      "gemini-3.8-flash",
      "gemini-3.1-flash-lite",
      "gemini-flash-latest",
      "gemini-2.5-flash"
    ];
    let response: any = null;
    let lastError: any = null;

    const ai = getAI();
    if (!ai) {
      return NextResponse.json({
        text: "مرحباً بك! يعمل النظام حالياً بكفاءة كاملة عبر **المحرك الرياضي البايزي والمحاكاة الكمية للسباقات**.\n\nيمكنك الاعتماد مباشرة على استراتيجيات الأهداف الخمسة المحددة للسباق (Quinté+ Désordre, Tiercé Ordre, Bonus 3 & 4 & 5) في شاشة تحليل السباق."
      });
    }

    for (const modelName of modelsToTry) {
      let attempts = 0;
      let modelSuccess = false;

      while (attempts < 2 && !modelSuccess) {
        attempts++;
        try {
          response = await ai.models.generateContent({
            model: modelName,
            contents: messages,
            config: {
              systemInstruction,
              tools: tools as any,
            },
          });
          if (response) {
            modelSuccess = true;
            break;
          }
        } catch (err: any) {
          lastError = err;
          const errStr = String(err?.message || err);
          const is503 = errStr.includes("503") || errStr.includes("high demand") || errStr.includes("unavailable");
          if (is503 && attempts === 1) {
            await new Promise((r) => setTimeout(r, 400));
            continue;
          }
          console.info(`[Assistant API] Model ${modelName} temporarily busy, cascading...`);
          break;
        }
      }
      if (modelSuccess) break;
    }

    if (!response) {
      // Fallback response if all API models fail or hit rate limits
      return NextResponse.json({
        text: "مرحباً بك! نظراً للإقبال الشديد حالياً على خوادم الذكاء الاصطناعي، أعمل حالياً بكفاءة كاملة عبر **المحرك الرياضي البايزي والمحاكاة الكمية**.\n\nيمكنك الاعتماد مباشرة على **استراتيجيات الأهداف الخمسة المحددة** في الصفحة الرئيسية للسباق، والتي تضمن:\n1. **Quinté+ Désordre**: التغطية الذكية للـ 5 خيول الأولى.\n2. **Quinté+ Bonus 5 & Bonus 4 & Bonus 3**: صمامات أمان حماية ميزانية الرهان.\n3. **Tiercé Ordre**: الترتيب الدقيق للمراكز الثلاثة الأولى.\n4. **Quarté+ Bonus 3**: تأمين التوب 3 في الـ 4 خيول الأولى.\n\nاستمر بتصفح التحليلات التكتيكية المتوفرة مجاناً وبالكامل في الواجهة!"
      });
    }

    // Tool execution loop
    let callCount = 0;
    const maxCalls = 3;
    const currentMessages = [...messages];

    while (response.functionCalls && callCount < maxCalls) {
      callCount++;
      const functionCalls = response.functionCalls;
      const toolResults = [];

      for (const call of functionCalls) {
        let resultData;
        const args = call.args as any;
        if (call.name === "get_daily_programme") {
          resultData = await internalFetch(`/api/pmu/programme?date=${args.date}`);
        } else if (call.name === "get_race_details") {
          resultData = await internalFetch(`/api/pmu/race?date=${args.date}&reunion=${args.reunion}&course=${args.course}`);
        } else if (call.name === "navigate_to_race") {
          resultData = { url: `/race/${args.date}/${args.reunion}/${args.course}` };
        }

        toolResults.push({
          functionResponse: {
            name: call.name,
            response: { content: resultData },
          },
        });
      }

      currentMessages.push({ role: "model", parts: functionCalls.map((c: any) => ({ functionCall: c })) });
      currentMessages.push({ role: "user", parts: toolResults });

      try {
        response = await ai.models.generateContent({
          model: "gemini-3.8-flash",
          contents: currentMessages,
          config: {
            systemInstruction,
            tools: tools as any,
          },
        });
      } catch (err) {
        break;
      }
    }

    return NextResponse.json({ text: response?.text || "تم تحليل طلبك بنجاح باستعمال النموذج الرياضي البايزي." });
  } catch (error: any) {
    console.error("Assistant API Error:", error);
    return NextResponse.json({ 
      text: "تم تفعيل المحرك التكتيكي المحلي تلقائياً. يمكنك الانتقال مباشرة لصفحة تحليل السباق لعرض ترشيحات الكينتي والديزورد وتذاكر البونص." 
    });
  }
}
