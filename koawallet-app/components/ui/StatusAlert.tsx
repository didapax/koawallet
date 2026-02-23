import React, { useEffect } from 'react';
import {
    View, Text, StyleSheet, Modal, TouchableOpacity,
    Animated, Dimensions, Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing } from '../../constants/Colors';

const { width } = Dimensions.get('window');

interface StatusAlertProps {
    visible: boolean;
    type: 'success' | 'error' | 'warning';
    title: string;
    message: string;
    onClose: () => void;
    actionLabel?: string;
    onAction?: () => void;
}

export default function StatusAlert({
    visible, type, title, message, onClose, actionLabel, onAction
}: StatusAlertProps) {
    const scaleAnim = React.useRef(new Animated.Value(0.8)).current;
    const opacityAnim = React.useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    friction: 8,
                    useNativeDriver: true,
                }),
                Animated.timing(opacityAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            scaleAnim.setValue(0.8);
            opacityAnim.setValue(0);
        }
    }, [visible]);

    if (!visible) return null;

    const getConfig = () => {
        switch (type) {
            case 'success':
                return {
                    icon: 'checkmark-circle' as const,
                    colors: ['#4CAF50', '#2E7D32'] as [string, string],
                    shadowColor: '#4CAF50',
                };
            case 'error':
                return {
                    icon: 'close-circle' as const,
                    colors: ['#EF5350', '#C62828'] as [string, string],
                    shadowColor: '#EF5350',
                };
            case 'warning':
                return {
                    icon: 'warning' as const,
                    colors: ['#FFA726', '#EF6C00'] as [string, string],
                    shadowColor: '#FFA726',
                };
            default:
                return {
                    icon: 'information-circle' as const,
                    colors: [Colors.gold, Colors.goldDark] as [string, string],
                    shadowColor: Colors.gold,
                };
        }
    };

    const config = getConfig();

    return (
        <Modal transparent visible={visible} animationType="fade">
            <View style={styles.overlay}>
                <Animated.View style={[
                    styles.alertBox,
                    {
                        opacity: opacityAnim,
                        transform: [{ scale: scaleAnim }],
                        shadowColor: config.shadowColor,
                    }
                ]}>
                    <LinearGradient
                        colors={config.colors}
                        style={styles.iconContainer}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    >
                        <Ionicons name={config.icon} size={48} color="#FFF" />
                    </LinearGradient>

                    <Text style={styles.title}>{title}</Text>
                    <Text style={styles.message}>{message}</Text>

                    <View style={styles.footer}>
                        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                            <Text style={styles.closeBtnText}>Cerrar</Text>
                        </TouchableOpacity>

                        {actionLabel && onAction && (
                            <TouchableOpacity style={styles.actionBtn} onPress={onAction}>
                                <Text style={styles.actionBtnText}>{actionLabel}</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.lg,
    },
    alertBox: {
        width: '100%',
        maxWidth: 340,
        backgroundColor: Colors.surface,
        borderRadius: 24,
        padding: Spacing.lg,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.border,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.md,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    title: {
        fontSize: 22,
        fontWeight: '700',
        color: Colors.textPrimary,
        textAlign: 'center',
        marginBottom: Spacing.xs,
    },
    message: {
        fontSize: 16,
        color: Colors.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: Spacing.lg,
    },
    footer: {
        flexDirection: 'row',
        width: '100%',
        gap: Spacing.sm,
    },
    closeBtn: {
        flex: 1,
        height: 50,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.surfaceLight,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    closeBtnText: {
        color: Colors.textPrimary,
        fontWeight: '600',
        fontSize: 16,
    },
    actionBtn: {
        flex: 1.5,
        height: 50,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.gold,
    },
    actionBtnText: {
        color: Colors.background,
        fontWeight: '700',
        fontSize: 16,
    },
});
