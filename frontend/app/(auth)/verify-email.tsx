import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { getErrorMessage } from '../../services/api';
import { AuthLayout } from '../../components/auth/AuthLayout';
import { FormField } from '../../components/auth/FormField';
import { showToast } from '../../utils/alert';
import { colors } from '../../utils/theme';

const CODE_LENGTH = 6;

export default function VerifyEmailScreen() {
    const params = useLocalSearchParams<{ email?: string; resendIn?: string }>();
    const email = params.email ?? '';
    const router = useRouter();
    const { verifyEmail, resendVerificationCode } = useAuth();

    const [code, setCode] = useState('');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [resendIn, setResendIn] = useState(() => Number(params.resendIn) || 60);
    const [resending, setResending] = useState(false);
    const inputRef = useRef<TextInput>(null);

    useEffect(() => {
        if (resendIn <= 0) return;
        const timer = setTimeout(() => setResendIn((s) => s - 1), 1000);
        return () => clearTimeout(timer);
    }, [resendIn]);

    // Without an e-mail (e.g. a reloaded page) there is nothing to verify.
    useEffect(() => {
        if (!email) router.replace('/login');
    }, [email, router]);

    const submit = async (value = code) => {
        if (loading) return;
        if (value.length !== CODE_LENGTH) {
            setErrorMsg(`Zadej ${CODE_LENGTH}místný kód z e-mailu.`);
            return;
        }
        setErrorMsg(null);
        setLoading(true);
        try {
            // The root layout moves to the map once the token is stored.
            await verifyEmail(email, value);
        } catch (err) {
            setErrorMsg(getErrorMessage(err, 'Ověření se nezdařilo.'));
            setCode('');
            setLoading(false);
            inputRef.current?.focus();
        }
    };

    const onChangeCode = (text: string) => {
        const digits = text.replace(/\D/g, '').slice(0, CODE_LENGTH);
        setCode(digits);
        // Pasted or autofilled codes go through right away.
        if (digits.length === CODE_LENGTH) void submit(digits);
    };

    const resend = async () => {
        if (resendIn > 0 || resending) return;
        setResending(true);
        setErrorMsg(null);
        try {
            setResendIn(await resendVerificationCode(email));
            setCode('');
            showToast('Nový kód je na cestě', `Poslali jsme ho na ${email}.`, 'success');
        } catch (err) {
            setErrorMsg(getErrorMessage(err, 'Kód se nepodařilo poslat.'));
        } finally {
            setResending(false);
        }
    };

    return (
        <AuthLayout
            title="Ověř svůj e-mail"
            subtitle={`Poslali jsme ${CODE_LENGTH}místný kód na ${email}`}
            error={errorMsg}
            submitLabel="Ověřit a pokračovat"
            loading={loading}
            onSubmit={() => void submit()}
            footerPrompt="Špatný e-mail?"
            footerAction="Zaregistrovat znovu"
            onFooterPress={() => router.replace('/register')}
        >
            <FormField
                ref={inputRef}
                label="Ověřovací kód"
                placeholder="000000"
                value={code}
                onChangeText={onChangeCode}
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                autoComplete="one-time-code"
                maxLength={CODE_LENGTH}
                autoFocus
                returnKeyType="go"
                onSubmitEditing={() => void submit()}
                style={styles.codeInput}
            />
            <Text style={styles.hint}>Nevidíš ho? Mrkni i do spamu. Kód platí 15 minut.</Text>
            <TouchableOpacity onPress={() => void resend()} disabled={resendIn > 0 || resending} style={styles.resend}>
                <Text style={[styles.resendText, (resendIn > 0 || resending) && styles.resendDisabled]}>
                    {resendIn > 0 ? `Poslat kód znovu za ${resendIn} s` : resending ? 'Posílám…' : 'Poslat kód znovu'}
                </Text>
            </TouchableOpacity>
        </AuthLayout>
    );
}

const styles = StyleSheet.create({
    codeInput: { fontSize: 24, fontWeight: '900', letterSpacing: 8, textAlign: 'center' },
    hint: { color: colors.muted, fontSize: 13, fontWeight: '600', marginTop: 8, textAlign: 'center' },
    resend: { alignSelf: 'center', marginTop: 6, paddingVertical: 6 },
    resendText: { color: colors.primary, fontSize: 14, fontWeight: '900' },
    resendDisabled: { color: colors.inactive },
});
