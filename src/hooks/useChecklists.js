import { useMemo } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { classifyIncome, isChecklistFinished } from '../utils/plan/checklist.js';

// How far back to ask about money nobody has routed. Beyond this the question
// is archaeology, not a prompt.
const ASK_WINDOW_DAYS = 30;

// Open checklists with their items, plus income that arrived and has no
// checklist because the app could not tell what it was.
export function useChecklists() {
  const { state } = useApp();
  const { checklists, checklistItems, income, bills, planSettings, paydayAllocations } = state;

  return useMemo(() => {
    const itemsByList = new Map();
    for (const item of checklistItems) {
      if (!itemsByList.has(item.checklistId)) itemsByList.set(item.checklistId, []);
      itemsByList.get(item.checklistId).push(item);
    }

    const open = checklists
      .filter((c) => c.completedAt == null)
      .map((c) => ({ ...c, items: itemsByList.get(c.id) ?? [] }))
      .filter((c) => c.items.length > 0 && !isChecklistFinished(c.items))
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));

    // Income a payday created has already been routed by the payday itself.
    const paydayIncomeIds = new Set(
      paydayAllocations.filter((a) => a.kind === 'income' && a.incomeId).map((a) => a.incomeId)
    );
    const hasChecklist = new Set(checklists.map((c) => c.incomeId));
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - ASK_WINDOW_DAYS);
    const cutoffKey = cutoff.toISOString().slice(0, 10);

    const unclassified = income
      .filter((e) => !hasChecklist.has(e.id) && !paydayIncomeIds.has(e.id) && e.date >= cutoffKey)
      .filter((e) => classifyIncome(e, planSettings, bills) == null)
      .sort((a, b) => b.date.localeCompare(a.date));

    return { open, unclassified };
  }, [checklists, checklistItems, income, bills, planSettings, paydayAllocations]);
}
