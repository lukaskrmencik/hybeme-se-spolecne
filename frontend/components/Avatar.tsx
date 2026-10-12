import { View, Text, Image, StyleSheet, Platform } from 'react-native';
import { colors } from '../utils/theme';

interface AvatarProps {
    name: string;
    url?: string | null;
    size?: number;
    background?: string;
}

const initialsSize = (size: number) => (size <= 40 ? 15 : size >= 60 ? 22 : Math.round(size * 0.37));

export const Avatar = ({ name, url, size = 44, background }: AvatarProps) => {
    const initials = name
        .split(/\s+/)
        .map((p) => p[0])
        .filter(Boolean)
        .slice(0, 2)
        .join('')
        .toUpperCase();

    const radius = size / 2;

    if (url && Platform.OS === 'web') {
        return (
            <img
                src={url}
                alt=""
                loading="lazy"
                decoding="async"
                width={size}
                height={size}
                style={{ width: size, height: size, borderRadius: radius, objectFit: 'cover', backgroundColor: colors.primaryBg, flexShrink: 0 }}
            />
        );
    }

    if (url) {
        return (
            <Image
                source={{ uri: url }}
                style={{ width: size, height: size, borderRadius: radius, backgroundColor: colors.primaryBg }}
            />
        );
    }

    return (
        <View
            style={[
                styles.fallback,
                {
                    width: size,
                    height: size,
                    borderRadius: radius,
                    ...(background ? { backgroundColor: background } : null),
                },
            ]}
        >
            <Text style={[styles.initials, { fontSize: initialsSize(size) }]}>{initials || '?'}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    fallback: {
        backgroundColor: colors.skyBg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    initials: {
        color: colors.skyText,
        fontWeight: '900',
    },
});
