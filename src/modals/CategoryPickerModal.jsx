import { useApp } from '../context/AppContext.jsx';
import { Modal } from './Modal.jsx';

export function CategoryPickerModal({ transactionId }) {
  const { state, dispatch, closeModal } = useApp();

  function handlePick(categoryId) {
    dispatch({ type: 'transaction/assignCategory', payload: { id: transactionId, categoryId } });
    closeModal();
  }

  return (
    <Modal title="File this transaction" onClose={closeModal}>
      <div className="list">
        {state.envelopes.map((envelope) => (
          <button
            key={envelope.id}
            type="button"
            className="list-row list-row--button"
            onClick={() => handlePick(envelope.id)}
          >
            <span className="list-row__title">{envelope.name}</span>
          </button>
        ))}
        {state.envelopes.length === 0 && (
          <p className="hero__summary">No envelopes yet — add one first.</p>
        )}
      </div>
    </Modal>
  );
}
