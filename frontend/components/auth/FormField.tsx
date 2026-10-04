import React, { ComponentProps, forwardRef, useState } from 'react';
import { View, Text, TextInput, TextInputProps, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../../utils/theme';

interface FormFieldProps extends TextInputProps {
    label: string;
    icon?: ComponentProps<typeof Ionicons>['name'];
    error?: string | null;
    /** Renders an eye toggle and hides the value by default. */
    password?: boolean;
}

export const FormField = forwardRef<TextInput, FormFieldProps>(function FormField(
    { label, icon, error, password = false, style, ...inputProps },
    ref
) {
    const [visible, setVisible] = useState(false);
    const [focused, setFocused] = useState(false);

    return (
        <View style={styles.wrapper}>
            <Text style={styles.label}>{label}</Text>
            <View style={[styles.field, focused && styles.fieldFocus, !!error && styles.fieldError]}>
                {icon && <Ionicons name={icon} size={20} color={colors.muted} />}
                <TextInput
                    ref={ref}
                    placeholderTextColor={colors.inactive}
                    secureTextEntry={password && !visible}
                    autoCorrect={!password}
                    {...inputProps}
                    style={[styles.input, style]}
                    onFocus={(e) => {
                        setFocused(true);
                        inputProps.onFocus?.(e);
                    }}
                    onBlur={(e) => {
                        setFocused(false);
                        inputProps.onBlur?.(e);
                    }}
                />
                {password && (
                    <TouchableOpacity
                        onPress={() => setVisible((v) => !v)}
                        hitSlop={10}
                        accessibilityLabel={visible ? 'Skrýt heslo' : 'Zobrazit heslo'}
                    >
                        <Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.muted} />
                    </TouchableOpacity>
                )}
            </View>
            {!!error && <Text style={styles.errorText}>{error}</Text>}
        </View>
    );
});

const styles = StyleSheet.create({
    wrapper: { marginTop: 14 },
    label: { fontSize: 13, fontWeight: '800', color: colors.navy, marginBottom: 6 },
    field: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        borderWidth: 1.5,
        borderColor: colors.border,
        borderRadius: radius.md,
        paddingHorizontal: 14,
        height: 50,
        backgroundColor: colors.background,
    },
    fieldFocus: { borderColor: '#C3CDB9', backgroundColor: colors.white },
    fieldError: { borderColor: colors.danger },
    input: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.navy, height: '100%', outlineWidth: 0 },
    errorText: { color: colors.dangerText, fontSize: 12, fontWeight: '600', marginTop: 4, marginLeft: 4 },
});
