import { useRef, useState } from 'react';
import { TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { getVerificationRequired, useAuth } from '../../context/AuthContext';
import { getErrorMessage } from '../../services/api';
import { AuthLayout } from '../../components/auth/AuthLayout';
import { FormField } from '../../components/auth/FormField';

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const passwordRef = useRef<TextInput>(null);

    const { login, loginWithGoogle } = useAuth();
    const router = useRouter();

    const handleLogin = async () => {
        if (loading) return;
        if (!email.trim() || !password) {
            setErrorMsg('Vyplň e-mail i heslo.');
            return;
        }
        setErrorMsg(null);
        setLoading(true);
        try {
            await login({ email, password });
        } catch (err) {
            setLoading(false);
            const verification = getVerificationRequired(err);
            if (verification) {
                router.push({
                    pathname: '/verify-email',
                    params: { email: verification.email, resendIn: String(verification.resendIn) },
                });
                return;
            }
            setErrorMsg(getErrorMessage(err, 'Přihlášení se nezdařilo.'));
        }
    };

    const handleGoogle = async (idToken: string) => {
        setErrorMsg(null);
        setLoading(true);
        try {
            // The root layout moves to the map once the token is stored.
            await loginWithGoogle(idToken);
        } catch (err) {
            setErrorMsg(getErrorMessage(err, 'Přihlášení přes Google se nezdařilo.'));
            setLoading(false);
        }
    };

    return (
        <AuthLayout
            title="Hýbeme se společně"
            subtitle="Objevuj Benátecko pěšky i na kole"
            error={errorMsg}
            submitLabel="Přihlásit se"
            loading={loading}
            onSubmit={handleLogin}
            footerPrompt="Nemáš účet?"
            footerAction="Zaregistruj se"
            onGoogleIdToken={handleGoogle}
            onGoogleError={setErrorMsg}
            onFooterPress={() => router.push('/register')}
        >
            <FormField
                label="E-mail"
                placeholder="E-mail"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                textContentType="emailAddress"
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
                submitBehavior="submit"
            />
            <FormField
                ref={passwordRef}
                label="Heslo"
                placeholder="Heslo"
                value={password}
                onChangeText={setPassword}
                password
                autoComplete="current-password"
                textContentType="password"
                returnKeyType="go"
                onSubmitEditing={handleLogin}
            />
        </AuthLayout>
    );
}
