import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Brain,
  CheckCircle2,
  ClipboardList,
  FileText,
  Landmark,
  Loader2,
  Lock,
  MapPinned,
  Network,
  Play,
  Save,
  Search,
  ShieldCheck,
  Sparkles,
  UserPlus,
  WalletCards
} from "lucide-react";
import { Field } from "./components/Field";
import { HeatMap, PriceMap } from "./components/Maps";
import { Stepper, type StepItem } from "./components/Stepper";
import { api } from "./lib/api";
import {
  fallbackBusinessLines,
  fallbackMunicipalities,
  fallbackStates,
  localAnalysis,
  localCompletion,
  localIdeaFill,
  localMissingFields,
  localRisk,
  occupations
} from "./lib/options";
import type { Analysis, AuthState, BusinessLineOption, Municipality, ProcessState, Risk, WizardData } from "./types";

const money = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0
});

const steps: StepItem[] = [
  { id: 1, label: "Idea", icon: Sparkles },
  { id: 2, label: "Perfil e inversion", icon: WalletCards },
  { id: 3, label: "Ubicacion", icon: MapPinned },
  { id: 4, label: "Socios", icon: Network },
  { id: 5, label: "Costos", icon: ClipboardList },
  { id: 6, label: "Riesgo", icon: ShieldCheck }
];

const initialProcess: ProcessState = {
  currentStep: 1,
  data: {},
  missingFields: localMissingFields({}),
  completion: 0
};

function deepMerge<T extends Record<string, unknown>>(base: T, patch: Partial<T>): T {
  const result: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(patch)) {
    const current = result[key];
    if (value && typeof value === "object" && !Array.isArray(value) && current && typeof current === "object" && !Array.isArray(current)) {
      result[key] = deepMerge(current as Record<string, unknown>, value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }
  return result as T;
}

function hasData(data: WizardData) {
  return Object.values(data).some((value) => value && Object.keys(value).length > 0);
}

function authFromStorage(): AuthState | null {
  try {
    return JSON.parse(localStorage.getItem("viabilidadAuth") ?? "null") as AuthState | null;
  } catch {
    return null;
  }
}

export default function App() {
  const [process, setProcess] = useState<ProcessState>(initialProcess);
  const [auth, setAuth] = useState<AuthState | null>(authFromStorage);
  const [guestMode, setGuestMode] = useState(!auth);
  const [ideaText, setIdeaText] = useState("");
  const [states, setStates] = useState(fallbackStates);
  const [municipalities, setMunicipalities] = useState<Municipality[]>(fallbackMunicipalities["09"]);
  const [businessLines, setBusinessLines] = useState<BusinessLineOption[]>(fallbackBusinessLines);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [risk, setRisk] = useState<Risk | null>(null);
  const [authMode, setAuthMode] = useState<"signup" | "login">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("Listo");

  const data = process.data;

  useEffect(() => {
    api
      .states()
      .then((payload) => setStates(payload.states))
      .catch(() => setStates(fallbackStates));
  }, []);

  useEffect(() => {
    const stateCode = data.location?.stateCode ?? "09";
    api
      .municipalities(stateCode)
      .then((payload) => setMunicipalities(payload.municipalities.length ? payload.municipalities : fallbackMunicipalities[stateCode] ?? []))
      .catch(() => setMunicipalities(fallbackMunicipalities[stateCode] ?? []));
  }, [data.location?.stateCode]);

  useEffect(() => {
    const stateCode = data.location?.stateCode ?? "09";
    api
      .businessLines(stateCode, data.investment?.amount)
      .then((payload) => setBusinessLines(payload.businessLines))
      .catch(() => setBusinessLines(fallbackBusinessLines));
  }, [data.location?.stateCode, data.investment?.amount]);

  useEffect(() => {
    if (!auth || !hasData(process.data)) return;
    const timeout = window.setTimeout(() => {
      void syncProcess(process);
    }, 900);
    return () => window.clearTimeout(timeout);
  }, [auth, process.currentStep, process.data]);

  function updateData(patch: WizardData) {
    setProcess((current) => {
      const nextData = deepMerge(current.data as Record<string, unknown>, patch as Record<string, unknown>) as WizardData;
      return {
        ...current,
        data: nextData,
        missingFields: localMissingFields(nextData),
        completion: localCompletion(nextData)
      };
    });
  }

  function setStep(step: number) {
    setProcess((current) => ({ ...current, currentStep: step }));
  }

  async function syncProcess(target = process) {
    if (!auth) {
      setStatus("Invitado: sin guardado permanente");
      return;
    }
    setSaving(true);
    try {
      const payload = target.processId
        ? await api.updateProcess(target.processId, target.data, target.currentStep, auth)
        : await api.createProcess(target.data, target.currentStep, auth);
      setProcess((current) => ({
        ...current,
        processId: payload.process.processId,
        missingFields: payload.process.missingFields,
        completion: payload.process.completion,
        updatedAt: payload.process.updatedAt
      }));
      setStatus("Guardado");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Guardado pendiente");
    } finally {
      setSaving(false);
    }
  }

  async function handleIdeaFill() {
    if (!ideaText.trim()) return;
    setBusy(true);
    try {
      const payload = await api.autofillIdea(ideaText.trim());
      updateData(payload.data);
      setStatus("Autollenado con IA");
      setStep(2);
    } catch {
      updateData(localIdeaFill(ideaText.trim()));
      setStatus("Autollenado local");
      setStep(2);
    } finally {
      setBusy(false);
    }
  }

  async function handleAuth() {
    if (!email || !password) return;
    setBusy(true);
    try {
      const payload =
        authMode === "signup"
          ? await api.signup(email, password, data.profile)
          : await api.login(email, password);
      setAuth(payload);
      setGuestMode(false);
      localStorage.setItem("viabilidadAuth", JSON.stringify(payload));
      updateData({ profile: payload.user.profile });
      setStatus(authMode === "signup" ? "Cuenta creada" : "Sesion iniciada");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "No se pudo autenticar");
    } finally {
      setBusy(false);
    }
  }

  function logout() {
    setAuth(null);
    setGuestMode(true);
    localStorage.removeItem("viabilidadAuth");
    setStatus("Sesion cerrada");
  }

  async function runLocationAnalysis() {
    setBusy(true);
    try {
      const payload = await api.locationAnalysis(data, process.processId);
      setAnalysis(payload.analysis);
      setStatus("Ubicacion analizada");
    } catch {
      setAnalysis(localAnalysis(data));
      setStatus("Analisis local");
    } finally {
      setBusy(false);
    }
  }

  async function runRisk() {
    const currentAnalysis = analysis ?? localAnalysis(data);
    if (!analysis) setAnalysis(currentAnalysis);
    setBusy(true);
    try {
      const payload = await api.risk(data, currentAnalysis, process.processId);
      setRisk(payload.risk);
      setStatus("Riesgo calculado");
    } catch {
      setRisk(localRisk(data, currentAnalysis));
      setStatus("Riesgo local");
    } finally {
      setBusy(false);
    }
  }

  const currentMunicipalityName = useMemo(() => {
    return municipalities.find((item) => item.code === data.location?.municipalityCode)?.name ?? data.location?.municipalityName;
  }, [municipalities, data.location?.municipalityCode, data.location?.municipalityName]);

  const nextDisabled = process.currentStep === 6;
  const prevDisabled = process.currentStep === 1;

  return (
    <div className="appShell">
      <header className="topbar">
        <div>
          <p>Registro y verificacion</p>
          <h1>Viabilidad de negocio</h1>
        </div>
        <div className="statusPill">
          {saving ? <Loader2 className="spin" size={16} /> : <CheckCircle2 size={16} />}
          <span>{status}</span>
        </div>
      </header>

      <div className="workspace">
        <Stepper steps={steps} currentStep={process.currentStep} completion={process.completion} onStep={setStep} />

        <main className="mainPanel">
          {process.currentStep === 1 ? (
            <section className="stepSurface">
              <div className="sectionHeader">
                <div>
                  <span>Paso 1</span>
                  <h2>Idea inicial</h2>
                </div>
                <button className="iconButton primary" type="button" onClick={() => setStep(2)} title="Iniciar proceso">
                  <Play size={18} />
                  <span>Iniciar proceso</span>
                </button>
              </div>
              <div className="ideaGrid">
                <label className="field wide">
                  <span>Describir mi idea</span>
                  <textarea
                    value={ideaText}
                    onChange={(event) => setIdeaText(event.target.value)}
                    placeholder="Cafeteria en Guadalajara con $250,000"
                  />
                </label>
                <button className="actionTile" type="button" onClick={handleIdeaFill} disabled={busy || !ideaText.trim()}>
                  {busy ? <Loader2 className="spin" size={22} /> : <Brain size={22} />}
                  <strong>Autollenar</strong>
                </button>
              </div>
            </section>
          ) : null}

          {process.currentStep === 2 ? (
            <section className="stepSurface">
              <div className="sectionHeader">
                <div>
                  <span>Paso 2</span>
                  <h2>Perfil e inversion</h2>
                </div>
                <button className="iconButton" type="button" onClick={() => void syncProcess()} title="Guardar">
                  <Save size={18} />
                  <span>Guardar</span>
                </button>
              </div>

              <div className="authStrip">
                {auth ? (
                  <>
                    <div>
                      <strong>{auth.user.email}</strong>
                      <span>Cuenta activa</span>
                    </div>
                    <button className="iconButton ghost" type="button" onClick={logout} title="Cerrar sesion">
                      <Lock size={17} />
                      <span>Salir</span>
                    </button>
                  </>
                ) : (
                  <>
                    <div className="segmented">
                      <button
                        className={!guestMode && authMode === "signup" ? "selected" : ""}
                        type="button"
                        onClick={() => {
                          setAuthMode("signup");
                          setGuestMode(false);
                        }}
                      >
                        <UserPlus size={16} />
                        Crear cuenta
                      </button>
                      <button
                        className={!guestMode && authMode === "login" ? "selected" : ""}
                        type="button"
                        onClick={() => {
                          setAuthMode("login");
                          setGuestMode(false);
                        }}
                      >
                        <Lock size={16} />
                        Login
                      </button>
                      <button className={guestMode ? "selected" : ""} type="button" onClick={() => setGuestMode(true)}>
                        Invitado
                      </button>
                    </div>
                    {!guestMode ? null : <span className="hint">Invitado: se pierde al cerrar.</span>}
                  </>
                )}
              </div>

              {!auth && !guestMode ? (
                <div className="authForm">
                  <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="correo@dominio.com" type="email" />
                  <input value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Contraseña" type="password" />
                  <button className="iconButton primary" type="button" onClick={handleAuth} disabled={busy || !email || !password}>
                    {busy ? <Loader2 className="spin" size={17} /> : authMode === "signup" ? <UserPlus size={17} /> : <Lock size={17} />}
                    <span>{authMode === "signup" ? "Crear" : "Entrar"}</span>
                  </button>
                </div>
              ) : null}

              <div className="formGrid">
                <Field label="Nombre" path="profile.name" missingFields={process.missingFields}>
                  <input value={data.profile?.name ?? ""} onChange={(event) => updateData({ profile: { name: event.target.value } })} />
                </Field>
                <Field label="Fecha de nacimiento" path="profile.birthDate" missingFields={process.missingFields}>
                  <input value={data.profile?.birthDate ?? ""} onChange={(event) => updateData({ profile: { birthDate: event.target.value } })} type="date" />
                </Field>
                <Field label="Sexo" path="profile.sex" missingFields={process.missingFields}>
                  <select value={data.profile?.sex ?? ""} onChange={(event) => updateData({ profile: { sex: event.target.value } })}>
                    <option value="">Seleccionar</option>
                    <option value="Mujer">Mujer</option>
                    <option value="Hombre">Hombre</option>
                    <option value="No binario">No binario</option>
                    <option value="Prefiero no decirlo">Prefiero no decirlo</option>
                  </select>
                </Field>
                <Field label="Telefono" path="profile.phone" missingFields={process.missingFields}>
                  <input value={data.profile?.phone ?? ""} onChange={(event) => updateData({ profile: { phone: event.target.value } })} inputMode="tel" />
                </Field>
                <Field label="A que se dedica" path="profile.occupation" missingFields={process.missingFields}>
                  <input list="occupations" value={data.profile?.occupation ?? ""} onChange={(event) => updateData({ profile: { occupation: event.target.value } })} />
                </Field>
                <datalist id="occupations">
                  {occupations.map((occupation) => (
                    <option key={occupation} value={occupation} />
                  ))}
                </datalist>
                <Field label="Cuanto quieres invertir" path="investment.amount" missingFields={process.missingFields}>
                  <input
                    value={data.investment?.amount ?? ""}
                    onChange={(event) => updateData({ investment: { amount: Number(event.target.value) || undefined } })}
                    inputMode="numeric"
                    min="0"
                    type="number"
                  />
                </Field>
                <Field label="Giro de negocio" path="investment.businessLine" missingFields={process.missingFields}>
                  <input list="businessLines" value={data.investment?.businessLine ?? ""} onChange={(event) => updateData({ investment: { businessLine: event.target.value } })} />
                </Field>
                <datalist id="businessLines">
                  {businessLines.map((line) => (
                    <option key={line.name} value={line.name} />
                  ))}
                </datalist>
              </div>
            </section>
          ) : null}

          {process.currentStep === 3 ? (
            <section className="stepSurface">
              <div className="sectionHeader">
                <div>
                  <span>Paso 3</span>
                  <h2>Ubicacion</h2>
                </div>
                <button className="iconButton primary" type="button" onClick={runLocationAnalysis} disabled={busy}>
                  {busy ? <Loader2 className="spin" size={18} /> : <Search size={18} />}
                  <span>Analizar</span>
                </button>
              </div>

              <div className="formGrid two">
                <Field label="Estado" path="location.stateCode" missingFields={process.missingFields}>
                  <select
                    value={data.location?.stateCode ?? ""}
                    onChange={(event) => {
                      const state = states.find((item) => item.code === event.target.value);
                      updateData({ location: { stateCode: event.target.value, stateName: state?.name, municipalityCode: "", municipalityName: "" } });
                    }}
                  >
                    <option value="">Seleccionar</option>
                    {states.map((state) => (
                      <option key={state.code} value={state.code}>
                        {state.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Municipio o alcaldia" path="location.municipalityCode" missingFields={process.missingFields}>
                  <select
                    value={data.location?.municipalityCode ?? ""}
                    onChange={(event) => {
                      const municipality = municipalities.find((item) => item.code === event.target.value);
                      updateData({ location: { municipalityCode: event.target.value, municipalityName: municipality?.name } });
                    }}
                  >
                    <option value="">Seleccionar</option>
                    {municipalities.map((municipality) => (
                      <option key={municipality.code} value={municipality.code}>
                        {municipality.name}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              {analysis ? (
                <div className="analysisGrid">
                  <div className="mapPanel">
                    <h3>Mapa de calor</h3>
                    <HeatMap analysis={analysis} />
                  </div>
                  <div className="mapPanel">
                    <h3>Renta o compra</h3>
                    <PriceMap analysis={analysis} />
                  </div>
                  <Metric label="Renta estimada" value={`${money.format(analysis.rentEstimate.min)} - ${money.format(analysis.rentEstimate.max)}`} />
                  <Metric label="Competencia cercana" value={`${analysis.competition.percent}%`} />
                  <Metric label="Ingreso mensual IA/reglas" value={money.format(analysis.expectedMonthlyIncome)} />
                  <Metric label="Retorno estimado" value={analysis.roiMonths ? `${analysis.roiMonths} meses` : "No viable aun"} />
                </div>
              ) : (
                <div className="emptyState">
                  <MapPinned size={28} />
                  <strong>{currentMunicipalityName ?? "Selecciona ubicacion"}</strong>
                </div>
              )}
            </section>
          ) : null}

          {process.currentStep === 4 ? (
            <section className="stepSurface">
              <div className="sectionHeader">
                <div>
                  <span>Paso 4</span>
                  <h2>Red de inversionistas</h2>
                </div>
              </div>
              <div className="radioRow">
                <label>
                  <input
                    checked={data.partnership?.interested === "si"}
                    name="partner"
                    onChange={() => updateData({ partnership: { interested: "si" } })}
                    type="radio"
                  />
                  Si
                </label>
                <label>
                  <input
                    checked={data.partnership?.interested === "no"}
                    name="partner"
                    onChange={() => updateData({ partnership: { interested: "no" } })}
                    type="radio"
                  />
                  No
                </label>
              </div>
              <div className="investorPanel">
                <Network size={26} />
                <div>
                  <h3>Matching por perfil</h3>
                  <p>Embeddings NVIDIA para comparar giro, ubicacion, inversion y tolerancia al riesgo.</p>
                </div>
              </div>
            </section>
          ) : null}

          {process.currentStep === 5 ? (
            <section className="stepSurface">
              <div className="sectionHeader">
                <div>
                  <span>Paso 5</span>
                  <h2>Costos y tiempos</h2>
                </div>
                <button className="iconButton" type="button" onClick={runLocationAnalysis} disabled={busy}>
                  <FileText size={18} />
                  <span>Actualizar</span>
                </button>
              </div>
              {analysis ? (
                <>
                  <div className="summaryBand">
                    <Metric label="Tramites" value={money.format(analysis.paperworkTotalCost)} />
                    <Metric label="Tiempo total" value={`${analysis.paperworkTotalDays} dias`} />
                    <Metric label="Vida sin ingreso meta" value={`${analysis.runwayMonths} meses`} />
                  </div>
                  <div className="tableWrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Tramite</th>
                          <th>Autoridad</th>
                          <th>Costo</th>
                          <th>Dias</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analysis.paperwork.map((item) => (
                          <tr key={item.name}>
                            <td>{item.name}</td>
                            <td>{item.authority}</td>
                            <td>{money.format(item.cost)}</td>
                            <td>{item.days}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="alternatives">
                    {analysis.alternatives.map((item) => (
                      <article key={item.name}>
                        <strong>{item.name}</strong>
                        <span>{item.why}</span>
                        <b>{money.format(item.estimatedInvestment)}</b>
                      </article>
                    ))}
                  </div>
                  <p className="legalNotice">{analysis.legalNotice}</p>
                </>
              ) : (
                <div className="emptyState">
                  <Landmark size={28} />
                  <strong>Falta analisis de ubicacion</strong>
                </div>
              )}
            </section>
          ) : null}

          {process.currentStep === 6 ? (
            <section className="stepSurface">
              <div className="sectionHeader">
                <div>
                  <span>Paso 6</span>
                  <h2>Riesgo y exito</h2>
                </div>
                <button className="iconButton primary" type="button" onClick={runRisk} disabled={busy}>
                  {busy ? <Loader2 className="spin" size={18} /> : <Brain size={18} />}
                  <span>Calcular</span>
                </button>
              </div>
              {risk ? (
                <div className="riskLayout">
                  <div className="riskDial">
                    <strong>{risk.successProbability}%</strong>
                    <span>Exito</span>
                    <small>{risk.riskProbability}% riesgo</small>
                  </div>
                  <div className="factorList">
                    {risk.factors.map((factor) => (
                      <div className="factor" key={factor.name}>
                        <span>{factor.name}</span>
                        <div>
                          <i style={{ width: `${factor.score}%` }} />
                        </div>
                        <b>{factor.score}</b>
                      </div>
                    ))}
                  </div>
                  <div className="recommendation">
                    <ShieldCheck size={24} />
                    <div>
                      <strong>{risk.recommendation}</strong>
                      {risk.narrative ? <p>{risk.narrative}</p> : null}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="emptyState">
                  <ShieldCheck size={28} />
                  <strong>Modelo pendiente</strong>
                </div>
              )}
            </section>
          ) : null}

          <footer className="wizardNav">
            <button className="iconButton" disabled={prevDisabled} onClick={() => setStep(Math.max(1, process.currentStep - 1))} type="button">
              <ArrowLeft size={18} />
              <span>Atras</span>
            </button>
            <button className="iconButton primary" disabled={nextDisabled} onClick={() => setStep(Math.min(6, process.currentStep + 1))} type="button">
              <span>Siguiente</span>
              <ArrowRight size={18} />
            </button>
          </footer>
        </main>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
