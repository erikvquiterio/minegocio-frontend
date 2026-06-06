import type { Analysis, Risk, WizardData } from "../types";

export const occupations = [
  "Comerciante",
  "Empleado",
  "Profesionista independiente",
  "Estudiante",
  "Ama/o de casa",
  "Transportista",
  "Tecnologia",
  "Servicios de salud",
  "Docente",
  "Otro"
];

export const personTypes = ["Moral", "Fisica", "Fisica con actividad empresarial"];

export const fallbackStates = [{ code: "09", name: "Ciudad de Mexico" }];

export const fallbackMunicipalities: Record<string, Array<{ code: string; name: string }>> = {
  "09": [
    { code: "010", name: "Alvaro Obregon" },
    { code: "002", name: "Azcapotzalco" },
    { code: "014", name: "Benito Juarez" },
    { code: "003", name: "Coyoacan" },
    { code: "004", name: "Cuajimalpa de Morelos" },
    { code: "015", name: "Cuauhtemoc" },
    { code: "005", name: "Gustavo A. Madero" },
    { code: "006", name: "Iztacalco" },
    { code: "007", name: "Iztapalapa" },
    { code: "008", name: "La Magdalena Contreras" },
    { code: "016", name: "Miguel Hidalgo" },
    { code: "009", name: "Milpa Alta" },
    { code: "011", name: "Tlahuac" },
    { code: "012", name: "Tlalpan" },
    { code: "017", name: "Venustiano Carranza" },
    { code: "013", name: "Xochimilco" }
  ]
};

export const fallbackBusinessLines = [
  { name: "Comercio electronico", recommended: true, minimumInvestment: 45000 },
  { name: "Cafeteria", recommended: true, minimumInvestment: 80000 },
  { name: "Tienda de abarrotes", recommended: true, minimumInvestment: 70000 },
  { name: "Estetica o barberia", recommended: true, minimumInvestment: 60000 },
  { name: "Restaurante", recommended: false, minimumInvestment: 180000 },
  { name: "Farmacia", recommended: false, minimumInvestment: 220000 },
  { name: "Taller mecanico", recommended: false, minimumInvestment: 140000 }
];

export const requiredByStep: Record<number, string[]> = {
  2: [
    "profile.name",
    "profile.birthDate",
    "profile.sex",
    "profile.phone",
    "profile.occupation",
    "profile.personType",
    "investment.amount",
    "investment.businessLine"
  ],
  3: ["location.stateCode", "location.municipalityCode"],
  4: ["partnership.interested"]
};

export function missingForStep(data: WizardData, step: number) {
  const missing = new Set(localMissingFields(data));
  return (requiredByStep[step] ?? []).filter((field) => missing.has(field));
}

export function localMissingFields(data: WizardData) {
  const required: Array<[string, string | number | undefined]> = [
    ["profile.name", data.profile?.name],
    ["profile.birthDate", data.profile?.birthDate],
    ["profile.sex", data.profile?.sex],
    ["profile.phone", data.profile?.phone],
    ["profile.occupation", data.profile?.occupation],
    ["profile.personType", data.profile?.personType],
    ["investment.amount", data.investment?.amount],
    ["investment.businessLine", data.investment?.businessLine],
    ["location.stateCode", data.location?.stateCode],
    ["location.municipalityCode", data.location?.municipalityCode],
    ["partnership.interested", data.partnership?.interested]
  ];
  return required.filter(([, value]) => value === undefined || value === "").map(([key]) => key);
}

export function localCompletion(data: WizardData) {
  return Math.round(((11 - localMissingFields(data).length) / 11) * 100);
}

export function localIdeaFill(text: string): WizardData {
  const normalized = text.toLowerCase();
  const data: WizardData = { idea: { description: text, source: "local" } };
  const amount = normalized.match(/(?:\$|mxn)?\s?(\d{2,3}(?:[,.]\d{3})+|\d{5,7})/);
  if (amount) {
    data.investment = { amount: Number(amount[1].replace(/[,.]/g, "")) };
  }
  if (normalized.includes("cafe") || normalized.includes("cafeter")) {
    data.investment = { ...data.investment, businessLine: "Cafeteria" };
    data.profile = { occupation: "Comerciante" };
  } else if (normalized.includes("restaurante") || normalized.includes("comida")) {
    data.investment = { ...data.investment, businessLine: "Restaurante" };
    data.profile = { occupation: "Comerciante" };
  } else if (normalized.includes("barber") || normalized.includes("estetica")) {
    data.investment = { ...data.investment, businessLine: "Estetica o barberia" };
    data.profile = { occupation: "Profesionista independiente" };
  } else if (normalized.includes("online") || normalized.includes("software")) {
    data.investment = { ...data.investment, businessLine: "Comercio electronico" };
    data.profile = { occupation: "Tecnologia" };
  }
  if (normalized.includes("persona moral") || normalized.includes("sa de cv")) {
    data.profile = { ...data.profile, personType: "Moral" };
  } else if (normalized.includes("actividad empresarial")) {
    data.profile = { ...data.profile, personType: "Fisica con actividad empresarial" };
  } else if (normalized.includes("persona fisica")) {
    data.profile = { ...data.profile, personType: "Fisica" };
  }
  data.location = { stateCode: "09", stateName: "Ciudad de Mexico" };
  for (const municipality of fallbackMunicipalities["09"]) {
    if (normalized.includes(municipality.name.toLowerCase())) {
      data.location = {
        stateCode: "09",
        stateName: "Ciudad de Mexico",
        municipalityCode: municipality.code,
        municipalityName: municipality.name
      };
      break;
    }
  }
  return data;
}

export function localAnalysis(data: WizardData): Analysis {
  const amount = data.investment?.amount ?? 180000;
  const line = data.investment?.businessLine ?? "Servicios profesionales";
  const baseRent = line === "Restaurante" ? 28000 : line === "Cafeteria" ? 21000 : 15000;
  const rentMin = Math.round(baseRent * 0.85);
  const rentMax = Math.round(baseRent * 1.45);
  const heatmap = Array.from({ length: 16 }, (_, index) => ({
    zone: ["Corredor comercial", "Barrio mixto", "Zona habitacional", "Equipamiento urbano"][index % 4],
    label: `Z${index + 1}`,
    allowed: !(["Taller mecanico", "Gimnasio", "Restaurante"].includes(line) && index % 4 === 2),
    suitability: Math.min(94, 42 + ((index * 9 + line.length) % 45)),
    reason: index % 4 === 2 ? "Uso condicionado por uso de suelo CDMX" : "Compatible con actividad mercantil en CDMX"
  }));
  const monthlyIncome = Math.round(Math.max(amount * 0.18, rentMin * 3));
  const monthlyProfit = Math.round(monthlyIncome * 0.18 - rentMin);
  return {
    stateName: "Ciudad de Mexico",
    municipalityName: data.location?.municipalityName ?? "Alcaldia seleccionada",
    jurisdiction: {
      entity: "Ciudad de Mexico",
      authority: `Alcaldia ${data.location?.municipalityName ?? "seleccionada"}`,
      system: "SIAPEM"
    },
    heatmap,
    priceMap: [
      { zone: "Corredor comercial", x: 20, y: 24, rent: rentMax, purchase: rentMax * 95 },
      { zone: "Barrio mixto", x: 62, y: 30, rent: Math.round((rentMin + rentMax) / 2), purchase: rentMax * 82 },
      { zone: "Zona habitacional", x: 43, y: 62, rent: rentMin, purchase: rentMin * 90 },
      { zone: "Equipamiento urbano", x: 77, y: 70, rent: Math.round(rentMin * 0.92), purchase: rentMin * 78 }
    ],
    rentEstimate: { min: rentMin, max: rentMax, currency: "MXN" },
    competition: { percent: line === "Restaurante" ? 78 : 62, source: "Reglas CDMX" },
    governmentSupports: ["Convocatorias SEDECO CDMX", "SIAPEM", "Ventanilla unica de alcaldia"],
    regulatoryReferences: [
      {
        name: "Ley de Establecimientos Mercantiles para la Ciudad de Mexico",
        articles: "Arts. 2, 8, 10, 26, 27, 27 Bis, 31 y 32, segun giro y tramite.",
        scope: "Avisos, permisos, clasificacion y obligaciones."
      },
      { name: "SIAPEM", articles: "Tramites EM por tipo de giro y solicitud en sistema.", scope: "Gestion digital de avisos y permisos." }
    ],
    paperwork: [
      { name: "Alta fiscal SAT", authority: "SAT", cost: 0, days: 2, required: true },
      { name: "Uso de suelo", authority: "SEDUVI / alcaldia", cost: 1200, days: 10, required: true },
      { name: "Aviso o permiso SIAPEM", authority: "SEDECO CDMX / alcaldia", cost: 2500, days: 12, required: true },
      { name: "Proteccion Civil", authority: "SGIRPC / alcaldia", cost: 4500, days: 15, required: true }
    ],
    paperworkTotalCost: 8200,
    paperworkTotalDays: 39,
    runwayMonths: monthlyProfit < 0 ? Math.max(1, Math.floor(amount / Math.abs(monthlyProfit))) : 24,
    alternatives: [
      { name: "Formato express", why: "Menor renta fija en CDMX", estimatedInvestment: Math.round(amount * 0.5) },
      { name: "Punto movil", why: "Prueba de demanda", estimatedInvestment: Math.round(amount * 0.35) },
      { name: "Modelo compartido", why: "Reduce adecuaciones", estimatedInvestment: Math.round(amount * 0.65) }
    ],
    expectedMonthlyIncome: monthlyIncome,
    monthlyProfit,
    roiMonths: monthlyProfit > 0 ? Math.ceil((amount + 8200) / monthlyProfit) : null,
    legalNotice: "Estimacion orientativa basada en reglas CDMX. Confirmar requisitos vigentes con SIAPEM, SEDECO y la alcaldia."
  };
}

export function localRisk(data: WizardData, analysis: Analysis): Risk {
  const competitionScore = Math.max(20, 100 - analysis.competition.percent);
  const roiScore = analysis.roiMonths ? Math.max(20, 100 - analysis.roiMonths * 2) : 25;
  const factors = [
    { name: "Indice de seguridad segun giro CDMX", score: 72, weight: 0.13 },
    { name: "Indice de rotacion del negocio", score: 62, weight: 0.11 },
    { name: "Fracaso de negocios similares", score: competitionScore, weight: 0.12 },
    { name: "Afluencia", score: 70, weight: 0.12 },
    { name: "Espacio para estacionarse", score: 64, weight: 0.08 },
    { name: "Antiguedad del inmueble", score: 63, weight: 0.08 },
    { name: "Competencia", score: competitionScore, weight: 0.12 },
    { name: "Costo de tramites CDMX", score: 76, weight: 0.1 },
    { name: "Retorno de inversion", score: roiScore, weight: 0.14 }
  ];
  const success = Math.round(factors.reduce((sum, factor) => sum + factor.score * factor.weight, 0));
  return {
    successProbability: success,
    riskProbability: 100 - success,
    factors,
    reasons: [
      analysis.competition.percent > 70 ? "Competencia alta en negocios cercanos" : "Competencia manejable",
      analysis.monthlyProfit < 0 ? "Ingreso mensual insuficiente" : "Margen operativo viable",
      data.investment?.amount ? "Inversion declarada evaluada" : "Falta afinar inversion"
    ],
    recommendation: success >= 65 ? "Avanzar con validacion documental y prueba piloto en CDMX." : "Ajustar giro, renta o alcaldia antes de invertir."
  };
}
