import { describe, it, expect } from 'vitest';
import {
  compareGoals, splitGoals, getGoalsProgressPct, rollUpGoalGroups,
  getAccountReconciliation, isGoalAchieved,
} from './goals.js';

const goal = (over) => ({
  id: over.id ?? Math.random().toString(36).slice(2),
  name: 'G', target: 100, saved: 0,
  priority: null, targetDate: null, heldInAccountId: null,
  isSinkingFund: false, goalGroup: null, archivedAt: null,
  createdAt: '2026-01-01T00:00:00Z',
  ...over,
});

describe('compareGoals', () => {
  it('sorts by priority with unprioritised goals last', () => {
    const list = [goal({id:'none'}), goal({id:'p2',priority:2}), goal({id:'p1',priority:1})];
    expect([...list].sort(compareGoals).map((g)=>g.id)).toEqual(['p1','p2','none']);
  });

  it('breaks ties on creation order so the list does not reshuffle', () => {
    const list = [
      goal({id:'b',priority:1,createdAt:'2026-05-01T00:00:00Z'}),
      goal({id:'a',priority:1,createdAt:'2026-01-01T00:00:00Z'}),
    ];
    expect([...list].sort(compareGoals).map((g)=>g.id)).toEqual(['a','b']);
  });

  it('treats priority 0 as higher than an unset priority', () => {
    const list = [goal({id:'none'}), goal({id:'zero',priority:0})];
    expect([...list].sort(compareGoals).map((g)=>g.id)).toEqual(['zero','none']);
  });
});

describe('splitGoals', () => {
  const goals = [
    goal({id:'trip',priority:1}),
    goal({id:'insurance',isSinkingFund:true,priority:2}),
    goal({id:'done',saved:100,target:100}),
    goal({id:'old',archivedAt:'2026-09-01T00:00:00Z'}),
  ];
  const split = splitGoals(goals);

  it('separates goals, sinking funds, achieved and archived', () => {
    expect(split.goals.map((g)=>g.id)).toEqual(['trip']);
    expect(split.sinkingFunds.map((g)=>g.id)).toEqual(['insurance']);
    expect(split.achieved.map((g)=>g.id)).toEqual(['done']);
    expect(split.archived.map((g)=>g.id)).toEqual(['old']);
  });

  it('keeps a fully funded sinking fund with the sinking funds', () => {
    // A sinking fund at 100% is ready to pay its bill, not "achieved".
    const s = splitGoals([goal({id:'ins',isSinkingFund:true,saved:100,target:100})]);
    expect(s.sinkingFunds.map((g)=>g.id)).toEqual(['ins']);
    expect(s.achieved).toEqual([]);
  });
});

describe('isGoalAchieved', () => {
  it('needs a real target', () => {
    expect(isGoalAchieved(goal({target:0,saved:0}))).toBe(false);
    expect(isGoalAchieved(goal({target:100,saved:100}))).toBe(true);
    expect(isGoalAchieved(goal({target:100,saved:120}))).toBe(true);
    expect(isGoalAchieved(goal({target:100,saved:99}))).toBe(false);
  });
});

describe('getGoalsProgressPct', () => {
  it('counts only goals still being saved for', () => {
    expect(getGoalsProgressPct([goal({target:100,saved:25})])).toBe(25);
  });

  it('excludes sinking funds, which cycle up and down as bills are paid', () => {
    const goals = [goal({target:100,saved:25}), goal({target:900,saved:900,isSinkingFund:true})];
    expect(getGoalsProgressPct(goals)).toBe(25);
  });

  it('excludes archived goals', () => {
    const goals = [goal({target:100,saved:25}), goal({target:900,saved:0,archivedAt:'2026-09-01T00:00:00Z'})];
    expect(getGoalsProgressPct(goals)).toBe(25);
  });

  it('is zero rather than NaN when nothing is targeted', () => {
    expect(getGoalsProgressPct([])).toBe(0);
    expect(getGoalsProgressPct([goal({target:0,saved:0})])).toBe(0);
  });
});

describe('rollUpGoalGroups', () => {
  it('combines one fund split across accounts into a single row', () => {
    const rows = rollUpGoalGroups([
      goal({id:'ef1',name:'EF (BPI)',goalGroup:'Emergency Fund',saved:100,target:500}),
      goal({id:'ef2',name:'EF (Maya)',goalGroup:'Emergency Fund',saved:150,target:500}),
      goal({id:'trip',name:'Trip',saved:20,target:200}),
    ]);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ label:'Emergency Fund', saved:250, target:1000, isGroup:true });
    expect(rows[0].goals.map((g)=>g.id)).toEqual(['ef1','ef2']);
    expect(rows[1]).toMatchObject({ label:'Trip', saved:20, target:200, isGroup:false });
  });
});

describe('getAccountReconciliation', () => {
  const accounts = [
    { id:'a1', name:'BPI', balance:1000, type:'bank', currency:'PHP' },
    { id:'a2', name:'Maya', balance:100, type:'ewallet', currency:'PHP' },
    { id:'a3', name:'Unused', balance:50, type:'cash', currency:'PHP' },
  ];

  it('reports only accounts that goals claim to be held in', () => {
    const rows = getAccountReconciliation(accounts, [goal({heldInAccountId:'a1',saved:400})]);
    expect(rows.map((r)=>r.account.id)).toEqual(['a1']);
  });

  it('flags an account whose goals claim more than it holds', () => {
    const rows = getAccountReconciliation(accounts, [
      goal({heldInAccountId:'a2',saved:80}),
      goal({heldInAccountId:'a2',saved:70}),
    ]);
    expect(rows[0]).toMatchObject({ claimed:150, balance:100, gap:-50, isShort:true });
  });

  it('does not flag an account holding more than its goals claim', () => {
    const rows = getAccountReconciliation(accounts, [goal({heldInAccountId:'a1',saved:400})]);
    expect(rows[0]).toMatchObject({ gap:600, isShort:false });
  });

  it('ignores archived goals when reconciling', () => {
    const rows = getAccountReconciliation(accounts, [
      goal({heldInAccountId:'a2',saved:500,archivedAt:'2026-09-01T00:00:00Z'}),
    ]);
    expect(rows).toEqual([]);
  });
});
