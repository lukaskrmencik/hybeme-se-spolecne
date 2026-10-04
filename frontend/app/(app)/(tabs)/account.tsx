import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useUserStats } from '../../../context/UserStatsContext';
import { useAuth } from '../../../context/AuthContext';
import { apiFetch, getErrorMessage } from '../../../services/api';
import { Avatar } from '../../../components/Avatar';
import { confirmAction, showToast } from '../../../utils/alert';
import { plural } from '../../../utils/plural';
import { formatNumber } from '../../../utils/format';
import { PartnerLogos } from '../../../components/PartnerLogos';
import { colors, radius } from '../../../utils/theme';

async function buildAvatarForm(asset: ImagePicker.ImagePickerAsset): Promise<FormData> {
    const ext = /\.(\w+)$/.exec(asset.uri)?.[1]?.toLowerCase() || 'jpg';
    const fileName = asset.fileName || asset.file?.name || `avatar.${ext}`;
    const mimeType = asset.mimeType ?? `image/${ext === 'jpg' ? 'jpeg' : ext}`;

    const form = new FormData();
    if (Platform.OS === 'web') {
        const blob = asset.file ?? (await (await fetch(asset.uri)).blob());
        form.append('avatar', blob, fileName);
    } else {
        // React Native's FormData accepts a { uri, name, type } descriptor instead of a Blob.
        form.append('avatar', { uri: asset.uri, name: fileName, type: mimeType } as unknown as Blob);
    }
    return form;
}

export default function AccountScreen() {
    const { profile, visits, totalPoints, refreshStats, loading } = useUserStats();
    const { logout } = useAuth();

    const [editing, setEditing] = useState(false);
    const [name, setName] = useState('');
    const [saving, setSaving] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [deleting, setDeleting] = useState(false);

    if (loading && !profile) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if (!profile) {
        return (
            <View style={styles.center}>
                <Text style={styles.email}>Profil se nepodařilo načíst.</Text>
                <TouchableOpacity style={styles.retryButton} onPress={() => void refreshStats()}>
                    <Text style={styles.retryText}>Zkusit znovu</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const comboCount = visits.filter((v) => v.is_combination).length;

    const startEdit = () => {
        setName(profile.name);
        setEditing(true);
    };

    const saveName = async () => {
        const trimmed = name.trim();
        if (!trimmed || saving) return;
        if (trimmed === profile.name) {
            setEditing(false);
            return;
        }
        setSaving(true);
        try {
            await apiFetch(`users/${profile.id}`, {
                method: 'PATCH',
                body: JSON.stringify({ name: trimmed }),
            });
            await refreshStats();
            setEditing(false);
        } catch (err) {
            showToast('Nepovedlo se', getErrorMessage(err, 'Jméno se nepodařilo uložit.'), 'danger');
        } finally {
            setSaving(false);
        }
    };

    const pickAvatar = async () => {
        if (Platform.OS !== 'web') {
            const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permission.granted) {
                showToast('Chybí oprávnění', 'Bez přístupu k fotkám nelze avatar změnit.', 'danger');
                return;
            }
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
        });
        if (result.canceled || !result.assets?.length) return;

        setUploadingAvatar(true);
        try {
            const form = await buildAvatarForm(result.assets[0]);
            await apiFetch(`users/${profile.id}/avatar`, { method: 'POST', body: form });
            await refreshStats();
        } catch (err) {
            showToast('Nepovedlo se', getErrorMessage(err, 'Avatar se nepodařilo nahrát.'), 'danger');
        } finally {
            setUploadingAvatar(false);
        }
    };

    const confirmDelete = async () => {
        const confirmed = await confirmAction(
            'Smazat účet?',
            'Tvé body, návštěvy i účet budou nenávratně smazány. Tuto akci nelze vrátit zpět.',
            'Smazat',
            true
        );
        if (!confirmed) return;

        setDeleting(true);
        try {
            await apiFetch(`users/${profile.id}`, { method: 'DELETE' });
            // The server already invalidated the token.
            await logout({ localOnly: true });
        } catch (err) {
            showToast('Nepovedlo se', getErrorMessage(err, 'Účet se nepodařilo smazat.'), 'danger');
            setDeleting(false);
        }
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <View style={styles.profileCard}>
                {uploadingAvatar ? (
                    <View style={styles.avatarLoading}>
                        <ActivityIndicator color={colors.skyText} />
                    </View>
                ) : (
                    <Avatar name={profile.name} url={profile.avatar_url} size={60} />
                )}
                <View style={styles.profileBody}>
                    <Text style={styles.name}>{profile.name}</Text>
                    <Text style={styles.email}>{profile.email}</Text>
                </View>
            </View>

            <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                    <Text style={styles.statValue}>{formatNumber(totalPoints)}</Text>
                    <Text style={styles.statLabel}>{plural(totalPoints, ['bod', 'body', 'bodů'])}</Text>
                </View>
                <View style={styles.statCard}>
                    <Text style={styles.statValue}>{formatNumber(visits.length)}</Text>
                    <Text style={styles.statLabel}>{plural(visits.length, ['návštěva', 'návštěvy', 'návštěv'])}</Text>
                </View>
                <View style={styles.statCard}>
                    <Text style={styles.statValue}>{comboCount}</Text>
                    <Text style={styles.statLabel}>{plural(comboCount, ['kombinace', 'kombinace', 'kombinací'])}</Text>
                </View>
            </View>

            <View style={styles.list}>
                {editing ? (
                    <View style={styles.li}>
                        <Ionicons name="create-outline" size={20} color={colors.muted} />
                        <TextInput
                            style={styles.nameInput}
                            value={name}
                            onChangeText={setName}
                            autoFocus
                            returnKeyType="done"
                            onSubmitEditing={saveName}
                            maxLength={255}
                        />
                        <TouchableOpacity onPress={saveName} disabled={saving} hitSlop={8}>
                            {saving ? (
                                <ActivityIndicator size="small" color={colors.primary} />
                            ) : (
                                <Text style={styles.saveLink}>Uložit</Text>
                            )}
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setEditing(false)} disabled={saving} hitSlop={8}>
                            <Ionicons name="close" size={18} color={colors.inactive} />
                        </TouchableOpacity>
                    </View>
                ) : (
                    <TouchableOpacity style={styles.li} onPress={startEdit}>
                        <Ionicons name="create-outline" size={20} color={colors.muted} />
                        <Text style={styles.liText}>Upravit jméno</Text>
                        <Ionicons name="chevron-forward" size={18} color={colors.inactive} />
                    </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.li} onPress={() => void pickAvatar()} disabled={uploadingAvatar}>
                    <Ionicons name="image-outline" size={20} color={colors.muted} />
                    <Text style={styles.liText}>Změnit fotku</Text>
                    <Ionicons name="chevron-forward" size={18} color={colors.inactive} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.li} onPress={() => void logout()} disabled={deleting}>
                    <Ionicons name="log-out-outline" size={20} color={colors.muted} />
                    <Text style={styles.liText}>Odhlásit se</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.li, styles.liLast]} onPress={confirmDelete} disabled={deleting}>
                    {deleting ? (
                        <ActivityIndicator size="small" color={colors.danger} />
                    ) : (
                        <Ionicons name="trash-outline" size={20} color={colors.danger} />
                    )}
                    <Text style={styles.liDanger}>Smazat účet</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.infoCard}>
                <Text style={styles.infoText}>
                    Aplikaci provozuje ZŠ Benátky nad Jizerou za podpory hlavního partnera ŠKOENERGO.
                </Text>
                <View style={styles.partners}>
                    <PartnerLogos />
                </View>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { paddingVertical: 16, paddingHorizontal: 14, paddingBottom: 40 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
    profileCard: {
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        padding: 18,
        borderWidth: 1,
        borderColor: colors.border,
    },
    profileBody: { flex: 1 },
    avatarLoading: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: colors.skyBg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    name: { fontSize: 19, fontWeight: '900', color: colors.navy },
    email: { fontSize: 13, color: colors.muted, fontWeight: '600' },
    retryButton: {
        marginTop: 12,
        backgroundColor: colors.navy,
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: radius.md,
    },
    retryText: { color: colors.white, fontWeight: '800' },
    statsGrid: { flexDirection: 'row', gap: 8, marginTop: 10, marginBottom: 16 },
    statCard: {
        flex: 1,
        backgroundColor: colors.surface,
        borderRadius: radius.md,
        paddingVertical: 12,
        paddingHorizontal: 10,
        borderWidth: 1,
        borderColor: colors.border,
    },
    statValue: { fontSize: 21, fontWeight: '900', color: colors.navy },
    // The mock puts this label on a 22 px line, 4 px below the number.
    statLabel: { fontSize: 12, lineHeight: 16, color: colors.muted, fontWeight: '700', marginTop: 4, marginBottom: 2 },
    list: {
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: 'hidden',
    },
    li: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    liLast: { borderBottomWidth: 0 },
    liText: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.navy },
    liDanger: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.danger },
    nameInput: {
        flex: 1,
        fontSize: 15,
        fontWeight: '700',
        color: colors.navy,
        padding: 0,
        borderWidth: 0,
        outlineWidth: 0,
    },
    saveLink: { color: colors.primary, fontWeight: '800', fontSize: 14 },
    infoCard: {
        marginTop: 16,
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.border,
    },
    infoText: { fontSize: 13, lineHeight: 18.85, color: colors.muted, fontWeight: '600', marginBottom: 12 },
    partners: { paddingTop: 4 },
});
