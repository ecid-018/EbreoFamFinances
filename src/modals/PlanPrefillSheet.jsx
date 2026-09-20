import { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { useDerivedFinancials } from '../hooks/useDerivedFinancials.js';
import { addMonths, getCurrentMonth, getMonthKey, getMonthName } from '../utils/date.js';
import { validatePlanFile, suggestMapping, buildEnvelopeProposal, matchGoals } from '../utils/plan/prefill.js';
import { EnvelopesStep } from '../components/prefill/EnvelopesStep.jsx';
import { GoalsStep } from '../components/prefill/GoalsStep.jsx';
import { SplitStep } from '../components/prefill/SplitStep.jsx';
import { SummaryStep } from '../components/prefill/SummaryStep.jsx';
import { BottomSheet } from './BottomSheet.jsx';

const STEPS = ['load', 'envelopes', 'goals', 'split', 'summary'];
const STEP_LABELS = { load: 'File', envelopes: 'Envelopes', goals: 'Goals', split: 'Split', summary: 'Summary' };

// Loads a local plan file and previews what it would change. The file is read
// in the browser with FileReader and never uploaded, stored or sent anywhere —
// it holds the household's real figures and the repository is public.
//
// NOTHING IS APPLIED FROM HERE YET. The summary is read-only by design; the
// apply path lands in a follow-up once these previews have been reviewed.
export function PlanPrefillSheet() {
  const { state, closeModal } = useApp();
  const { envelopeStats } = useDerivedFinancials();

  const [step, setStep] = useState('load');
  const [plan, setPlan] = useState(null);
  const [fileName, setFileName] = useState('');
  const [errors, setErrors] = useState([]);

  // Budgets are month-scoped now, so the prefill needs a target month. Next
  // month is the default: the point of a prefill is the month that has not
  // started yet, and writing the current one would change a month already
  // partly spent.
  const [targetMonth, setTargetMonth] = useState(() => addMonths(getCurrentMonth(), 1));
  const targetMonthKey = getMonthKey(targetMonth.year, targetMonth.monthIndex);
  const targetMonthLabel = `${getMonthName(targetMonth.year, targetMonth.monthIndex)} ${targetMonth.year}`;

  const [mappings, setMappings] = useState({});
  const [proposed, setProposed] = useState({});
  const [overlapChoices, setOverlapChoices] = useState({});
  const [goalTargets, setGoalTargets] = useState({});
  const [actualHub, setActualHub] = useState('');

  const groupNames = useMemo(() => [...new Set(state.envelopes.map((env) => env.group))], [state.envelopes]);

  function handleFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    const reader = new FileReader();
    reader.onerror = () => setErrors(['Could not read that file.']);
    reader.onload = () => {
      let parsed;
      try {
        parsed = JSON.parse(String(reader.result));
      } catch (err) {
        setPlan(null);
        setErrors([`That file is not valid JSON — ${err.message}`]);
        return;
      }

      const result = validatePlanFile(parsed);
      if (!result.ok) {
        setPlan(null);
        setErrors(result.errors);
        return;
      }

      // Seed the mappings with suggestions; every one is confirmable and
      // changeable on the next step, and a label with no confident match is
      // left blank rather than guessed at.
      const seeded = {};
      for (const target of parsed.household_targets) {
        const suggestion = suggestMapping(target.label, groupNames, state.envelopes);
        if (suggestion) seeded[target.label] = { kind: suggestion.kind, id: suggestion.id };
      }
      setMappings(seeded);
      setProposed(buildEnvelopeProposal(parsed.household_targets, seeded, envelopeStats));
      setGoalTargets(
        Object.fromEntries(matchGoals(parsed.goals, state.goals).map((m) => [m.fileGoal.name, m.proposedTarget]))
      );
      setActualHub(String(parsed.pay.hub));
      setErrors([]);
      setPlan(parsed);
      setStep('envelopes');
    };
    reader.readAsText(file);
  }

  // Remapping rebuilds the proposal, but anything already edited by hand is
  // kept: losing a typed figure because another row changed would be maddening.
  function handleMappingChange(label, mapping) {
    const next = { ...mappings };
    if (mapping) next[label] = mapping;
    else delete next[label];
    setMappings(next);
    setProposed({ ...buildEnvelopeProposal(plan.household_targets, next, envelopeStats) });
  }

  const stepIndex = STEPS.indexOf(step);
  const canGoBack = stepIndex > 0;
  const canGoNext = stepIndex < STEPS.length - 1 && plan;

  return (
    <BottomSheet title="Plan prefill" onClose={closeModal}>
      {plan && (
        <nav className="prefill-steps" aria-label="Prefill steps">
          {STEPS.map((s, i) => (
            <button
              key={s}
              type="button"
              className={`prefill-steps__item${s === step ? ' prefill-steps__item--active' : ''}`}
              disabled={i > 0 && !plan}
              onClick={() => setStep(s)}
            >
              {STEP_LABELS[s]}
            </button>
          ))}
        </nav>
      )}

      {step === 'load' && (
        <div className="prefill-load">
          <p className="prefill-note">
            Choose your local plan file. It is read in this browser only — never uploaded, never saved anywhere, and
            never sent to the app&apos;s database. <code>plan.example.json</code> in the repository shows the shape.
          </p>
          <label className="form__field">
            <span className="form__label">Plan file (JSON)</span>
            <input type="file" accept="application/json,.json" className="form__input" onChange={handleFile} />
          </label>
          {fileName && !errors.length && <p className="prefill-note">Loaded {fileName}</p>}
          {errors.length > 0 && (
            <div className="prefill-errors">
              <p className="form__error">That file could not be used:</p>
              <ul>
                {errors.map((error) => (
                  <li key={error} className="form__error">
                    {error}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {plan && step === 'envelopes' && (
        <EnvelopesStep
          plan={plan}
          envelopes={envelopeStats}
          groupNames={groupNames}
          mappings={mappings}
          onMappingChange={handleMappingChange}
          proposed={proposed}
          onProposedChange={(id, amount) => setProposed((prev) => ({ ...prev, [id]: amount }))}
          overlapChoices={overlapChoices}
          onOverlapChange={(id, choice) => setOverlapChoices((prev) => ({ ...prev, [id]: choice }))}
          targetMonth={targetMonth}
          targetMonthLabel={targetMonthLabel}
          onTargetMonthChange={setTargetMonth}
        />
      )}

      {plan && step === 'goals' && (
        <GoalsStep
          plan={plan}
          goals={state.goals}
          goalTargets={goalTargets}
          onTargetChange={(name, target) => setGoalTargets((prev) => ({ ...prev, [name]: target }))}
        />
      )}

      {plan && step === 'split' && (
        <SplitStep plan={plan} actualHub={actualHub} onActualHubChange={setActualHub} />
      )}

      {plan && step === 'summary' && (
        <SummaryStep
          plan={plan}
          envelopes={envelopeStats}
          proposed={proposed}
          overlapChoices={overlapChoices}
          goals={state.goals}
          goalTargets={goalTargets}
          targetMonthKey={targetMonthKey}
          targetMonthLabel={targetMonthLabel}
        />
      )}

      {plan && (
        <div className="prefill-nav">
          <button type="button" className="btn-secondary" disabled={!canGoBack} onClick={() => setStep(STEPS[stepIndex - 1])}>
            Back
          </button>
          <button type="button" className="btn-block" disabled={!canGoNext} onClick={() => setStep(STEPS[stepIndex + 1])}>
            Next
          </button>
        </div>
      )}
    </BottomSheet>
  );
}
