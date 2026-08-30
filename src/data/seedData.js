export const seedData = {
  envelopes: [
    { id: 'env-groceries', name: 'Groceries', monthlyBudget: 12000, group: 'Groceries' },
    { id: 'env-fun', name: 'Fun Money', monthlyBudget: 3000, group: 'Fun Money' },

    { id: 'env-utilities-water', name: 'Water', monthlyBudget: 950, group: 'Utilities' },
    { id: 'env-utilities-electricity', name: 'Electricity', monthlyBudget: 2800, group: 'Utilities' },
    { id: 'env-utilities-internet', name: 'Internet', monthlyBudget: 1250, group: 'Utilities' },

    { id: 'env-transport-gas', name: 'Gas', monthlyBudget: 1500, group: 'Transport' },
    { id: 'env-transport-grab', name: 'Grab/Angkas', monthlyBudget: 1500, group: 'Transport' },
    { id: 'env-transport-jeep', name: 'Jeep/Tricycle', monthlyBudget: 1000, group: 'Transport' },

    { id: 'env-insurance-cid', name: 'Daddy Cid', monthlyBudget: 1200, group: 'Insurance' },
    { id: 'env-insurance-chelle', name: 'Mommy Chelle SSS', monthlyBudget: 800, group: 'Insurance' },
    { id: 'env-insurance-ysay', name: 'Ysay', monthlyBudget: 500, group: 'Insurance' },

    { id: 'env-mortgage-car', name: 'Car', monthlyBudget: 5000, group: 'Mortgage' },
    { id: 'env-mortgage-pagibig', name: 'Pag-IBIG', monthlyBudget: 1500, group: 'Mortgage' },
    { id: 'env-mortgage-condo', name: 'Condo', monthlyBudget: 8500, group: 'Mortgage' },

    { id: 'env-subscriptions', name: 'Subscriptions', monthlyBudget: 1200, group: 'Subscriptions' },
    { id: 'env-tithes', name: 'Tithes & Offerings', monthlyBudget: 5000, group: 'Tithes & Offerings' },
    { id: 'env-savings', name: 'Savings', monthlyBudget: 6000, group: 'Savings' },
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
    { id: 'goal-emergency-new', name: 'New Emergency Fund', target: 90000, saved: 0 },
  ],

  transactions: [
    { id: 'txn-001', date: '2026-08-03', amount: 2450, note: 'Puregold grocery run', categoryId: 'env-groceries' },
    { id: 'txn-002', date: '2026-08-10', amount: 3100, note: 'SM Supermarket', categoryId: 'env-groceries' },
    { id: 'txn-003', date: '2026-08-17', amount: 2800, note: 'Palengke (wet market)', categoryId: 'env-groceries' },
    { id: 'txn-004', date: '2026-08-24', amount: 3950, note: 'Grocery restock', categoryId: 'env-groceries' },

    { id: 'txn-005', date: '2026-08-05', amount: 800, note: 'Movie night', categoryId: 'env-fun' },
    { id: 'txn-006', date: '2026-08-14', amount: 1200, note: 'Dinner out', categoryId: 'env-fun' },
    { id: 'txn-007', date: '2026-08-22', amount: 900, note: 'Karaoke with friends', categoryId: 'env-fun' },

    { id: 'txn-008', date: '2026-08-07', amount: 1800, note: 'Meralco electric bill', categoryId: 'env-utilities-electricity' },
    { id: 'txn-009', date: '2026-08-09', amount: 950, note: 'Maynilad water bill', categoryId: 'env-utilities-water' },
    { id: 'txn-010', date: '2026-08-12', amount: 1500, note: 'PLDT internet', categoryId: 'env-utilities-internet' },

    { id: 'txn-011', date: '2026-08-04', amount: 500, note: 'Grab rides', categoryId: 'env-transport-grab' },
    { id: 'txn-012', date: '2026-08-11', amount: 620, note: 'Gas', categoryId: 'env-transport-gas' },
    { id: 'txn-013', date: '2026-08-18', amount: 480, note: 'Jeepney/tricycle fares', categoryId: 'env-transport-jeep' },
    { id: 'txn-014', date: '2026-08-25', amount: 700, note: 'Grab rides', categoryId: 'env-transport-grab' },

    { id: 'txn-015', date: '2026-08-05', amount: 1200, note: "Daddy Cid's premium", categoryId: 'env-insurance-cid' },
    { id: 'txn-016', date: '2026-08-05', amount: 800, note: 'Mommy Chelle SSS contribution', categoryId: 'env-insurance-chelle' },
    { id: 'txn-017', date: '2026-08-05', amount: 500, note: "Ysay's insurance", categoryId: 'env-insurance-ysay' },

    { id: 'txn-018', date: '2026-08-01', amount: 5000, note: 'Car payment', categoryId: 'env-mortgage-car' },
    { id: 'txn-019', date: '2026-08-01', amount: 1500, note: 'Pag-IBIG contribution', categoryId: 'env-mortgage-pagibig' },
    { id: 'txn-020', date: '2026-08-01', amount: 8500, note: 'Condo dues', categoryId: 'env-mortgage-condo' },

    { id: 'txn-021', date: '2026-08-02', amount: 549, note: 'Netflix + Spotify + iCloud', categoryId: 'env-subscriptions' },
    { id: 'txn-022', date: '2026-08-20', amount: 900, note: 'Disney+ annual top-up', categoryId: 'env-subscriptions' },

    { id: 'txn-023', date: '2026-08-02', amount: 2000, note: 'Sunday Offering', categoryId: 'env-tithes' },
    { id: 'txn-024', date: '2026-08-16', amount: 1500, note: 'Building Fund', categoryId: 'env-tithes' },

    { id: 'txn-025', date: '2026-08-13', amount: 650, note: 'Cash withdrawal - unsure what for', categoryId: null },
    { id: 'txn-026', date: '2026-08-21', amount: 1200, note: 'Shopee order', categoryId: null },
  ],

  ledger: [],
};
