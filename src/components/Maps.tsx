import type { Analysis } from "../types";

const currency = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0
});

function zoneColor(score: number, allowed: boolean) {
  if (!allowed) return "blocked";
  if (score >= 76) return "strong";
  if (score >= 58) return "medium";
  return "weak";
}

export function HeatMap({ analysis }: { analysis: Analysis }) {
  return (
    <div className="heatMap" aria-label="Mapa de calor">
      {analysis.heatmap.map((zone) => (
        <div className={`heatCell ${zoneColor(zone.suitability, zone.allowed)}`} key={zone.label} title={`${zone.zone}: ${zone.reason}`}>
          <strong>{zone.label}</strong>
          <span>{zone.suitability}%</span>
        </div>
      ))}
    </div>
  );
}

export function PriceMap({ analysis }: { analysis: Analysis }) {
  return (
    <div className="priceMap" aria-label="Mapa de precios">
      <div className="road horizontal top" />
      <div className="road horizontal bottom" />
      <div className="road vertical left" />
      <div className="road vertical right" />
      {analysis.priceMap.map((point) => (
        <button
          className="pricePin"
          key={`${point.zone}-${point.x}-${point.y}`}
          style={{ left: `${point.x}%`, top: `${point.y}%` }}
          title={`${point.zone}: renta ${currency.format(point.rent)}`}
          type="button"
        >
          {currency.format(point.rent).replace("MX", "")}
        </button>
      ))}
    </div>
  );
}

