import { useApp } from '../context/AppContext.jsx';
import { AddExpenseModal } from './AddExpenseModal.jsx';
import { EnvelopeFormModal } from './EnvelopeFormModal.jsx';
import { IncomeFormModal } from './IncomeFormModal.jsx';
import { AccountFormModal } from './AccountFormModal.jsx';
import { GoalFormModal } from './GoalFormModal.jsx';
import { AddContributionModal } from './AddContributionModal.jsx';
import { CategoryPickerModal } from './CategoryPickerModal.jsx';
import { AllocateBudgetSheet } from './AllocateBudgetSheet.jsx';

export function ModalRoot() {
  const { modal } = useApp();
  const { activeModal, modalProps } = modal;

  switch (activeModal) {
    case 'addExpense':
      return <AddExpenseModal />;
    case 'envelopeForm':
      return <EnvelopeFormModal {...modalProps} />;
    case 'incomeForm':
      return <IncomeFormModal {...modalProps} />;
    case 'accountForm':
      return <AccountFormModal {...modalProps} />;
    case 'goalForm':
      return <GoalFormModal />;
    case 'addContribution':
      return <AddContributionModal {...modalProps} />;
    case 'categoryPicker':
      return <CategoryPickerModal {...modalProps} />;
    case 'allocateBudget':
      return <AllocateBudgetSheet />;
    default:
      return null;
  }
}
