import { useApp } from '../context/AppContext.jsx';
import { AppearanceSection } from '../components/settings/AppearanceSection.jsx';
import { SecuritySection } from '../components/settings/SecuritySection.jsx';
import { ExportSection } from '../components/settings/ExportSection.jsx';
import { BottomSheet } from './BottomSheet.jsx';

export function SettingsSheet() {
  const { closeModal } = useApp();

  return (
    <BottomSheet title="Settings" onClose={closeModal}>
      <AppearanceSection />
      <SecuritySection />
      <ExportSection />
    </BottomSheet>
  );
}
