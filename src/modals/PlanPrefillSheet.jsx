import { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { useDerivedFinancials } from '../hooks/useDerivedFinancials.js';
import { addMonths, getCurrentMonth, getMonthKey, getMonthName } from '../utils/date.js';
import {
  validatePlanFile,
  suggestMapping,
  buildEnvelopeProposal,
  matchGoals,
  runSteps,
  describeJsonError,
} from '../utils/plan/prefill.js';
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
// Applying runs through the app's own actions (dispatch), so every change is
// validated and logged in the ledger exactly as a manual edit would be. It goes
// one step at a time and stops at the first failure — see runSteps.
export function PlanPrefillSheet() {
  const { state, dispatch, refetchAll, closeModal } = useApp();
  const { envelopeStats } = useDerivedFinancials();

  const [step, setStep] = useState('load');
  const [plan, setPlan] = useState(null);
  const [fileName, setFileName] = useState('');
  const [errors, setErrors] = useState([]);
  const [syntaxError, setSyntaxError] = useState(null);
  const errorRef = useRef(null);

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

  const [applying, setApplying] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [result, setResult] = useState(null);

  async function handleApply(steps) {
    setApplying(true);
    setProgress({ done: 0, total: steps.length });
    // dispatch returns the sync promise (see AppContext), which is what makes
    // awaiting each step and stopping on a failure possible at all.
    const outcome = await runSteps(steps, (action) => dispatch(action), setProgress);
    setResult(outcome);
    setApplying(false);
    // Always refetch, including after a failure: the optimistic reducer has
    // already moved on locally and only the server knows what actually landed.
    await refetchAll();
  }

  // The file input sits near the top of a long sheet, so on a phone an error
  // rendered under it can land below the fold and look like nothing happened.
  useEffect(() => {
    if (errors.length || syntaxError) errorRef.current?.scrollIntoView({ block: 'nearest' });
  }, [errors, syntaxError]);

  const groupNames = useMemo(() => [...new Set(state.envelopes.map((env) => env.group))], [state.envelopes]);

  function handleFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    const reader = new FileReader();
    reader.onerror = () => setErrors(['Could not read that file.']);
    reader.onload = () => {
      const raw = String(reader.result);
      let parsed;
      try {
        parsed = JSON.parse(raw);
      } catch (err) {
        setPlan(null);
        setSyntaxError(describeJsonError(raw, err));
        setErrors([]);
        return;
      }
      setSyntaxError(null);

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
  const locked = applying || Boolean(result);
  const canGoBack = stepIndex > 0 && !locked;
  const canGoNext = stepIndex < STEPS.length - 1 && plan && !locked;

  return (
    <BottomSheet title="Plan prefill" onClose={closeModal}>
      {plan && (
        <nav className="prefill-steps" aria-label="Prefill steps">
          {STEPS.map((s, i) => (
            <button
              key={s}
              type="button"
              className={`prefill-steps__item${s === step ? ' prefill-steps__item--active' : ''}`}
              disabled={(i > 0 && !plan) || locked}
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
          {fileName && !errors.length && !syntaxError && <p className="prefill-note">Loaded {fileName}</p>}

          {syntaxError && (
            <div className="prefill-errors" ref={errorRef}>
              <p className="form__error">
                {fileName} is not valid JSON
                {syntaxError.line ? `, at line ${syntaxError.line}` : ''}
                {syntaxError.column ? `, column ${syntaxError.column}` : ''}.
              </p>
              {syntaxError.snippet !== null && (
                <pre className="prefill-snippet">
                  <code>{`${syntaxError.line} | ${syntaxError.snippet}`}</code>
                </pre>
              )}
              <p className="prefill-note">
                Usually a stray character, a missing comma, or a trailing comma before a closing brace. Fix that line
                and choose the file again.
              </p>
            </div>
          )}

          {errors.length > 0 && (
            <div className="prefill-errors" ref={errorRef}>
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
          applying={applying}
          progress={progress}
          result={result}
          onApply={handleApply}
        />
      )}

      {plan && (
        <div className="prefill-nav">
          <button type="button" className="btn-secondary" disabled={!canGoBack} onClick={() => setStep(STEPS[stepIndex - 1])}>
            Back
          </button>
          {result ? (
            <button type="button" className="btn-block" onClick={closeModal}>
              Done
            </button>
          ) : (
            // Nothing on the last step: Apply lives in the summary itself, and
            // a disabled Next beside it reads as the flow being stuck.
            stepIndex < STEPS.length - 1 && (
              <button type="button" className="btn-block" disabled={!canGoNext} onClick={() => setStep(STEPS[stepIndex + 1])}>
                Next
              </button>
            )
          )}
        </div>
      )}
    </BottomSheet>
  );
}
