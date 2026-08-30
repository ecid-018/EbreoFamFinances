export const seedData = {
  envelopes: [
    { id: 'env-groceries', name: 'Groceries', monthlyBudget: 12000 },
    { id: 'env-fun', name: 'Fun money', monthlyBudget: 3000 },
    { id: 'env-utilities', name: 'Utilities', monthlyBudget: 5000 },
    { id: 'env-transport', name: 'Transport', monthlyBudget: 4000 },
    { id: 'env-insurance', name: 'Insurance', monthlyBudget: 2500 },
    { id: 'env-rent', name: 'Rent', monthlyBudget: 15000 },
    { id: 'env-subscriptions', name: 'Subscriptions', monthlyBudget: 1200 },
  ],

  income: [
    { id: 'inc-001', date: '2026-08-01', source: 'Allotment - OFW remittance', amount: 45000 },
    { id: 'inc-002', date: '2026-08-15', source: 'Freelance design gig', amount: 8000 },
  ],

  accounts: [
    { id: 'acct-bpi', name: 'BPI Savings', type: 'bank', balance: 68500 },
    { id: 'acct-gcash', name: 'GCash', type: 'ewallet', balance: 4250 },
    { id: 'acct-maya', name: 'Maya', type: 'ewallet', balance: 1800 },
  ],

  goals: [
    { id: 'goal-emergency', name: 'Emergency Fund', target: 100000, saved: 42000 },
    { id: 'goal-boracay', name: 'Boracay Trip', target: 30000, saved: 12500 },
  ],

  transactions: [
    { id: 'txn-001', date: '2026-08-03', amount: 2450, note: 'Puregold grocery run', categoryId: 'env-groceries' },
    { id: 'txn-002', date: '2026-08-10', amount: 3100, note: 'SM Supermarket', categoryId: 'env-groceries' },
    { id: 'txn-003', date: '2026-08-17', amount: 2800, note: 'Palengke (wet market)', categoryId: 'env-groceries' },
    { id: 'txn-004', date: '2026-08-24', amount: 3950, note: 'Grocery restock', categoryId: 'env-groceries' },

    { id: 'txn-005', date: '2026-08-05', amount: 800, note: 'Movie night', categoryId: 'env-fun' },
    { id: 'txn-006', date: '2026-08-14', amount: 1200, note: 'Dinner out', categoryId: 'env-fun' },
    { id: 'txn-007', date: '2026-08-22', amount: 900, note: 'Karaoke with friends', categoryId: 'env-fun' },

    { id: 'txn-008', date: '2026-08-07', amount: 1800, note: 'Meralco electric bill', categoryId: 'env-utilities' },
    { id: 'txn-009', date: '2026-08-09', amount: 950, note: 'Maynilad water bill', categoryId: 'env-utilities' },
    { id: 'txn-010', date: '2026-08-12', amount: 1500, note: 'PLDT internet', categoryId: 'env-utilities' },

    { id: 'txn-011', date: '2026-08-04', amount: 500, note: 'Grab rides', categoryId: 'env-transport' },
    { id: 'txn-012', date: '2026-08-11', amount: 620, note: 'Gas', categoryId: 'env-transport' },
    { id: 'txn-013', date: '2026-08-18', amount: 480, note: 'Jeepney/tricycle fares', categoryId: 'env-transport' },
    { id: 'txn-014', date: '2026-08-25', amount: 700, note: 'Grab rides', categoryId: 'env-transport' },

    { id: 'txn-015', date: '2026-08-05', amount: 2500, note: 'Pru Life UK premium', categoryId: 'env-insurance' },

    { id: 'txn-016', date: '2026-08-01', amount: 15000, note: 'Monthly rent', categoryId: 'env-rent' },

    { id: 'txn-017', date: '2026-08-02', amount: 549, note: 'Netflix + Spotify + iCloud', categoryId: 'env-subscriptions' },
    { id: 'txn-018', date: '2026-08-20', amount: 900, note: 'Disney+ annual top-up', categoryId: 'env-subscriptions' },

    { id: 'txn-019', date: '2026-08-13', amount: 650, note: 'Cash withdrawal - unsure what for', categoryId: null },
    { id: 'txn-020', date: '2026-08-21', amount: 1200, note: 'Shopee order', categoryId: null },
  ],
};
