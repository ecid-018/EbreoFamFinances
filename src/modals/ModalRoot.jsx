import { useApp } from '../context/AppContext.jsx';
import { AddExpenseModal } from './AddExpenseModal.jsx';
import { EnvelopeFormModal } from './EnvelopeFormModal.jsx';
import { AddIncomeModal } from './AddIncomeModal.jsx';
import { AddAccountModal } from './AddAccountModal.jsx';
import { GoalFormModal } from './GoalFormModal.jsx';
import { AddContributionModal } from './AddContributionModal.jsx';
import { CategoryPickerModal } from './CategoryPickerModal.jsx';

export function ModalRoot() {
  const { modal } = useApp();
  const { activeModal, modalProps } = modal;

  switch (activeModal) {
    case 'addExpense':
      return <AddExpenseModal />;
    case 'envelopeForm':
      return <EnvelopeFormModal {...modalProps} />;
    case 'addIncome':
      return <AddIncomeModal />;
    case 'addAccount':
      return <AddAccountModal />;
    case 'goalForm':
      return <GoalFormModal />;
    case 'addContribution':
      return <AddContributionModal {...modalProps} />;
    case 'categoryPicker':
      return <CategoryPickerModal {...modalProps} />;
    default:
      return null;
  }
}
