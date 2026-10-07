import { Stack } from 'expo-router';
import { UserStatsProvider } from '../../context/UserStatsContext';
import { TermsGate } from '../../components/legal/TermsGate';

export default function AppLayout() {
    return (
        <UserStatsProvider>
            <TermsGate>
                <Stack screenOptions={{ headerShown: false }} />
            </TermsGate>
        </UserStatsProvider>
    );
}
