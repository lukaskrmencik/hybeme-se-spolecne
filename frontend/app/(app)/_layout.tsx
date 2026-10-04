import { Stack } from 'expo-router';
import { UserStatsProvider } from '../../context/UserStatsContext';

export default function AppLayout() {
    return (
        <UserStatsProvider>
            <Stack screenOptions={{ headerShown: false }} />
        </UserStatsProvider>
    );
}
