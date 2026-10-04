import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { colors } from '../utils/theme';

interface AvatarProps {
    name: string;
    url?: string | null;
    size?: number;
    /** Overrides the pale blue initials background. */
    background?: string;
}

/** Mock sizes: 15 px in the 38 px list avatar, 22 px in the 60 px profile avatar. */
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