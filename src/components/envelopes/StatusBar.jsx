export function StatusBar({ isOver }) {
  return <div className={`status-bar ${isOver ? 'status-bar--over' : 'status-bar--ok'}`} />;
}
