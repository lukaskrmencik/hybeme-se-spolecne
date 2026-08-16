import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  
  const [errorMsg, setErrorMsg] = useState('');
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const router = useRouter();

  const handleRegister = async () => {
    setErrorMsg('');
    setValidationErrors({});
    setLoading(true);

    try {
      await register({
        name,
        email,
        password,
        password_confirmation: passwordConfirmation,
      });
    } catch (err: any) {
      if (err.error_message) setErrorMsg(err.error_message);
      if (err.errors) setValidationErrors(err.errors);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Vytvořit účet</Text>
      
      {!!errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}

      <TextInput
        style={styles.input}
        placeholder="Jméno / Přezdívka"
        value={name}
        onChangeText={setName}
      />
      {validationErrors.name && <Text style={styles.fieldError}>{validationErrors.name[0]}</Text>}

      <TextInput
        style={styles.input}
        placeholder="E-mail"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      {validationErrors.email && <Text style={styles.fieldError}>{validationErrors.email[0]}</Text>}

      <TextInput
        style={styles.input}
        placeholder="Heslo"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      {validationErrors.password && <Text style={styles.fieldError}>{validationErrors.password[0]}</Text>}

      <TextInput
        style={styles.input}
        placeholder="Potvrzení hesla"
        value={passwordConfirmation}
        onChangeText={setPasswordConfirmation}
        secureTextEntry
      />

      <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Zaregistrovat se</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.back()}>
        <Text style={styles.linkText}>Už máš účet? Přihlas se</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', color: '#4a90e2', marginBottom: 20 },
  errorText: { color: 'red', textAlign: 'center', marginBottom: 15 },
  fieldError: { color: 'red', fontSize: 12, marginTop: -10, marginBottom: 10, marginLeft: 5 },
  input: { height: 50, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 15, marginBottom: 15, fontSize: 16 },
  button: { height: 50, backgroundColor: '#4a90e2', borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginTop: 10, marginBottom: 20 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  linkText: { color: '#4a90e2', textAlign: 'center', fontSize: 14 }
});