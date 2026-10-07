import { useRef, useState } from 'react';
import { TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { ApiError, getErrorMessage } from '../../services/api';
import { AuthLayout } from '../../components/auth/AuthLayout';
import { FormField } from '../../components/auth/FormField';
import { Consent, ConsentCheckboxes, consentComplete } from '../../components/legal/ConsentCheckboxes';

type Field = 'name' | 'email' | 'password' | 'password_confirmation';
type FieldErrors = Partial<Record<Field, string>>;

/** Mirrors the backend rule Password::min(8)->letters()->mixedCase()->numbers(). */
function validate(name: string, email: string, password: string, confirmation: string): FieldErrors {
    const errors: FieldErrors = {};
    if (!name.trim()) errors.name = 'Vyplň jméno.';
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) errors.email = 'Zadej platný e-mail.';
    if (password.length < 8 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
        errors.password = 'Heslo musí mít aspoň 8 znaků, malé i velké písmeno a číslici.';
    }
    if (password !== confirmation) errors.password_confirmation = 'Hesla se neshodují.';
    return errors;
}

export default function RegisterScreen() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirmation, setPasswordConfirmation] = useState('');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
    const [loading, setLoading] = useState(false);
    const [consent, setConsent] = useState<Consent>({ terms: false, age: false });
    const [consentError, setConsentError] = useState<string | null>(null);

    const emailRef = useRef<TextInput>(null);
    const passwordRef = useRef<TextInput>(null);
    const confirmRef = useRef<TextInput>(null);

    const { register, loginWithGoogle } = useAuth();
    const router = useRouter();

    const handleRegister = async () => {
        if (loading) return;
        const errors = validate(name, email, password, passwordConfirmation);
        setFieldErrors(errors);
        const consentMissing = !consentComplete(consent);
        setConsentError(consentMissing ? 'Bez obou souhlasů se zaregistrovat nejde.' : null);
        if (Object.keys(errors).length > 0 || consentMissing) {
            setErrorMsg(null);
            return;
        }

        setErrorMsg(null);
        setLoading(true);
        try {
            const verification = await register({ name, email, password, password_confirmation: passwordConfirmation, terms: true });
            setLoading(false);
            router.push({
                pathname: '/verify-email',
                params: { email: verification.email, resendIn: String(verification.resendIn) },
            });
        } catch (err) {
            if (err instanceof ApiError && err.errors) {
                const serverErrors: FieldErrors = {};
                for (const [key, messages] of Object.entries(err.errors)) {
                    serverErrors[key as Field] = messages[0];
                }
                setFieldErrors(serverErrors);
            }
            setErrorMsg(getErrorMessage(err, 'Registrace se nezdařila.'));
            setLoading(false);
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
            title="Vytvořit účet"
            subtitle="Začni sbírat body za návštěvy míst"
            error={errorMsg}
            submitLabel="Zaregistrovat se"
            loading={loading}
            onSubmit={handleRegister}
            footerPrompt="Už máš účet?"
            footerAction="Přihlas se"
            onGoogleIdToken={handleGoogle}
            onGoogleError={setErrorMsg}
            onFooterPress={() => router.replace('/login')}
        >
            <FormField
                label="Jméno"
                placeholder="Jméno / přezdívka"
                value={name}
                onChangeText={setName}
                error={fieldErrors.name}
                autoComplete="name"
                maxLength={255}
                returnKeyType="next"
                submitBehavior="submit"
                onSubmitEditing={() => emailRef.current?.focus()}
            />
            <FormField
                ref={emailRef}
                label="E-mail"
                placeholder="E-mail"
                value={email}
                onChangeText={setEmail}
                error={fieldErrors.email}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                textContentType="emailAddress"
                returnKeyType="next"
                submitBehavior="submit"
                onSubmitEditing={() => passwordRef.current?.focus()}
            />
            <FormField
                ref={passwordRef}
                label="Heslo"
                placeholder="Heslo"
                value={password}
                onChangeText={setPassword}
                error={fieldErrors.password}
                password
                autoComplete="new-password"
                textContentType="newPassword"
                returnKeyType="next"
                submitBehavior="submit"
                onSubmitEditing={() => confirmRef.current?.focus()}
            />
            <FormField
                ref={confirmRef}
                label="Potvrzení hesla"
                placeholder="Potvrzení hesla"
                value={passwordConfirmation}
                onChangeText={setPasswordConfirmation}
                error={fieldErrors.password_confirmation}
                password
                autoComplete="new-password"
                textContentType="newPassword"
                returnKeyType="go"
                onSubmitEditing={handleRegister}
            />
            <ConsentCheckboxes
                value={consent}
                onChange={(c) => {
                    setConsent(c);
                    if (consentComplete(c)) setConsentError(null);
                }}
                error={consentError}
            />
        </AuthLayout>
    );
}
