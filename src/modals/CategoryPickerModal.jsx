import { useApp } from '../context/AppContext.jsx';
import { BottomSheet } from './BottomSheet.jsx';

export function CategoryPickerModal({ transactionId }) {
  const { state, dispatch, closeModal } = useApp();

  function handlePick(categoryId) {
    dispatch({ type: 'transaction/assignCategory', payload: { id: transactionId, categoryId } });
    closeModal();
  }

  return (
    <BottomSheet title="File This Transaction" onClose={closeModal}>
      {state.envelopes.length === 0 ? (
        <p className="form__label">No envelopes yet — add one first.</p>
      ) : (
        <div className="chip-grid">
          {state.envelopes.map((envelope) => (
            <button key={envelope.id} type="button" className="chip" onClick={() => handlePick(envelope.id)}>
              {envelope.name}
            </button>
          ))}
        </div>
      )}
    </BottomSheet>
  );
}
