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

export const fallbackStates = [
  { code: "09", name: "Ciudad de Mexico" },
  { code: "14", name: "Jalisco" },
  { code: "15", name: "Estado de Mexico" },
  { code: "19", name: "Nuevo Leon" },
  { code: "21", name: "Puebla" },
  { code: "22", name: "Queretaro" },
  { code: "23", name: "Quintana Roo" },
  { code: "31", name: "Yucatan" }
];

export const fallbackMunicipalities: Record<string, Array<{ code: string; name: string }>> = {
  "09": [
    { code: "003", name: "Coyoacan" },
    { code: "014", name: "Benito Juarez" },
    { code: "015", name: "Cuauhtemoc" },
    { code: "016", name: "Miguel Hidalgo" }
  ],
  "14": [
    { code: "039", name: "Guadalajara" },
    { code: "098", name: "Tlaquepaque" },
    { code: "120", name: "Zapopan" }
  ],
  "19": [
    { code: "026", name: "Guadalupe" },
    { code: "039", name: "Monterrey" },
    { code: "046", name: "San Nicolas de los Garza" }
  ]
};

export const fallbackBusinessLines = [
  { name: "Cafeteria", recommended: true, minimumInvestment: 80000 },
  { name: "Tienda de abarrotes", recommended: true, minimumInvestment: 70000 },
  { name: "Estetica o barberia", recommended: true, minimumInvestment: 60000 },
  { name: "Restaurante", recommended: false, minimumInvestment: 180000 },
  { name: "Farmacia", recommended: false, minimumInvestment: 220000 },
  { name: "Taller mecanico", recommended: false, minimumInvestment: 140000 },
  { name: "Comercio electronico", recommended: true, minimumInvestment: 45000 }
];

export function localMissingFields(data: WizardData) {
  const required: Array<[string, string | number | undefined]> = [
    ["profile.name", data.profile?.name],
    ["profile.birthDate", data.profile?.birthDate],
    ["profile.sex", data.profile?.sex],
    ["profile.phone", data.profile?.phone],
    ["profile.occupation", data.profile?.occupation],
    ["investment.amount", data.investment?.amount],
    ["investment.businessLine", data.investment?.businessLine],
    ["location.stateCode", data.location?.stateCode],
    ["location.municipalityCode", data.location?.municipalityCode],
    ["partnership.interested", data.partnership?.interested]
  ];
  return required.filter(([, value]) => value === undefined || value === "").map(([key]) => key);
}

export function localCompletion(data: WizardData) {
  return Math.round(((10 - localMissingFields(data).length) / 10) * 100);
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
  if (normalized.includes("cdmx") || normalized.includes("ciudad de mexico")) {
    data.location = { stateCode: "09", stateName: "Ciudad de Mexico" };
  }
  if (normalized.includes("guadalajara")) {
    data.location = { stateCode: "14", stateName: "Jalisco", municipalityCode: "039", municipalityName: "Guadalajara" };
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
    zone: ["Centro", "Corredor comercial", "Residencial mixto", "Industrial ligero"][index % 4],
    label: `Z${index + 1}`,
    allowed: !(line === "Taller mecanico" && index % 4 === 2),
    suitability: Math.min(94, 42 + ((index * 9 + line.length) % 45)),
    reason: index % 4 === 2 ? "Uso condicionado" : "Compatible con uso comercial"
  }));
  const monthlyIncome = Math.round(Math.max(amount * 0.18, rentMin * 3));
  const monthlyProfit = Math.round(monthlyIncome * 0.18 - rentMin);
  return {
    stateName: data.location?.stateName ?? "Estado seleccionado",
    municipalityName: data.location?.municipalityName ?? "Municipio seleccionado",
    heatmap,
    priceMap: [
      { zone: "Centro", x: 20, y: 24, rent: rentMax, purchase: rentMax * 95 },
      { zone: "Corredor comercial", x: 62, y: 30, rent: Math.round((rentMin + rentMax) / 2), purchase: rentMax * 82 },
      { zone: "Residencial mixto", x: 43, y: 62, rent: rentMin, purchase: rentMin * 90 },
      { zone: "Industrial ligero", x: 77, y: 70, rent: Math.round(rentMin * 0.92), purchase: rentMin * 78 }
    ],
    rentEstimate: { min: rentMin, max: rentMax, currency: "MXN" },
    competition: { percent: line === "Restaurante" ? 78 : 62, source: "Reglas locales" },
    governmentSupports: ["Convocatorias MIPYME locales", "NAFIN capacitacion", "Ventanilla unica municipal"],
    paperwork: [
      { name: "Alta fiscal SAT", authority: "SAT", cost: 0, days: 2, required: true },
      { name: "Uso de suelo", authority: "Municipio o alcaldia", cost: 1200, days: 10, required: true },
      { name: "Licencia de funcionamiento", authority: "Municipio o alcaldia", cost: 2500, days: 12, required: true },
      { name: "Proteccion Civil", authority: "Proteccion Civil", cost: 4500, days: 15, required: true }
    ],
    paperworkTotalCost: 8200,
    paperworkTotalDays: 39,
    runwayMonths: monthlyProfit < 0 ? Math.max(1, Math.floor(amount / Math.abs(monthlyProfit))) : 24,
    alternatives: [
      { name: "Formato express", why: "Menor renta fija", estimatedInvestment: Math.round(amount * 0.5) },
      { name: "Punto movil", why: "Prueba de demanda", estimatedInvestment: Math.round(amount * 0.35) },
      { name: "Modelo compartido", why: "Reduce adecuaciones", estimatedInvestment: Math.round(amount * 0.65) }
    ],
    expectedMonthlyIncome: monthlyIncome,
    monthlyProfit,
    roiMonths: monthlyProfit > 0 ? Math.ceil((amount + 8200) / monthlyProfit) : null,
    legalNotice: "Estimacion orientativa. Confirmar requisitos vigentes con la autoridad competente."
  };
}

export function localRisk(data: WizardData, analysis: Analysis): Risk {
  const competitionScore = Math.max(20, 100 - analysis.competition.percent);
  const roiScore = analysis.roiMonths ? Math.max(20, 100 - analysis.roiMonths * 2) : 25;
  const factors = [
    { name: "Indice de seguridad segun giro", score: 72, weight: 0.13 },
    { name: "Indice de rotacion del negocio", score: 62, weight: 0.11 },
    { name: "Fracaso de negocios similares", score: competitionScore, weight: 0.12 },
    { name: "Afluencia", score: 70, weight: 0.12 },
    { name: "Espacio para estacionarse", score: 64, weight: 0.08 },
    { name: "Antiguedad del inmueble", score: 63, weight: 0.08 },
    { name: "Competencia", score: competitionScore, weight: 0.12 },
    { name: "Costo de tramites", score: 76, weight: 0.1 },
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
    recommendation: success >= 65 ? "Avanzar con validacion documental y prueba piloto." : "Ajustar giro, renta o ubicacion antes de invertir."
  };
}
