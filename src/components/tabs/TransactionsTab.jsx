import { useState } from 'react';
import { SegmentedControl } from '../shared/SegmentedControl.jsx';
import { NeedsCategoryList } from '../uncategorized/NeedsCategoryList.jsx';
import { TransactionList } from '../transactions/TransactionList.jsx';
import { IncomeList } from '../income/IncomeList.jsx';
import { TransferList } from '../transfers/TransferList.jsx';
import { LedgerSection } from '../activity/LedgerSection.jsx';

export function TransactionsTab() {
  const [view, setView] = useState('expenses');

  return (
    <>
      <div className="ios-group">
        <SegmentedControl
          value={view}
          onChange={setView}
          options={[
            { value: 'expenses', label: 'Expenses' },
            { value: 'income', label: 'Income' },
            { value: 'transfers', label: 'Transfers' },
            { value: 'ledger', label: 'Ledger' },
          ]}
        />
      </div>
      {view === 'expenses' && (
        <>
          <NeedsCategoryList />
          <TransactionList />
        </>
      )}
      {view === 'income' && <IncomeList />}
      {view === 'transfers' && <TransferList />}
      {view === 'ledger' && <LedgerSection />}
    </>
  );
}
