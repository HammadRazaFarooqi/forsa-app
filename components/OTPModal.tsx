import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    Pressable,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Modal,
    Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSequence,
    withTiming,
    withSpring,
} from 'react-native-reanimated';
import i18n from '../locales/i18n'; // Adjust path as needed
import { BACKEND_URL } from '../lib/config'; // Adjust path as needed

const { width } = Dimensions.get('window');
const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 60;

interface OTPModalProps {
    visible: boolean;
    phone: string;
    docId: string; // The phone_ docId from send-phone
    onClose: () => void;
    onVerifySuccess: () => void;
}

const OTPModal = ({ visible, phone, docId, onClose, onVerifySuccess }: OTPModalProps) => {
    const [otp, setOtp] = useState<string[]>(new Array(OTP_LENGTH).fill(''));
    const [timer, setTimer] = useState(RESEND_COOLDOWN);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [otpSent, setOtpSent] = useState(false);

    // Animation refs
    const shakeTranslateX = useSharedValue(0);
    const inputRefs = useRef<Array<TextInput | null>>([...Array(OTP_LENGTH)].map(() => null));

    useEffect(() => {
        if (visible) {
            // Reset state when modal opens
            setOtp(new Array(OTP_LENGTH).fill(''));
            setError(null);
            setTimer(RESEND_COOLDOWN);
            // OTP was just sent before opening modal
            setOtpSent(true);

            // Focus first input after a short delay
            setTimeout(() => {
                inputRefs.current[0]?.focus();
            }, 500);
        }
    }, [visible]);

    // Timer countdown
    useEffect(() => {
        if (timer > 0 && otpSent) {
            const interval = setInterval(() => setTimer((t) => t - 1), 1000);
            return () => clearInterval(interval);
        }
    }, [timer, otpSent]);

    const handleOtpChange = (text: string, index: number) => {
        const newOtp = [...otp];
        newOtp[index] = text;
        setOtp(newOtp);

        // Clear error when typing
        if (error) setError(null);

        // Auto-focus next input
        if (text && index < OTP_LENGTH - 1) {
            inputRefs.current[index + 1]?.focus();
        }

        // Auto-verify if all filled
        if (index === OTP_LENGTH - 1 && text) {
            const fullOtp = newOtp.join('');
            if (fullOtp.length === OTP_LENGTH) {
                handleVerify(fullOtp);
            }
        }
    };

    const handleKeyPress = (e: any, index: number) => {
        if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const triggerShake = () => {
        shakeTranslateX.value = withSequence(
            withTiming(-10, { duration: 50 }),
            withTiming(10, { duration: 50 }),
            withTiming(-10, { duration: 50 }),
            withTiming(10, { duration: 50 }),
            withTiming(0, { duration: 50 })
        );
    };

    const shakeStyle = useAnimatedStyle(() => {
        return {
            transform: [{ translateX: shakeTranslateX.value }],
        };
    });

    const handleVerify = async (otpString: string) => {
        setLoading(true);
        setError(null);
        try {
            // We use the simpler verify endpoint logic here (or a new verify-check endpoint)
            // But since we are verifying BEFORE user creation, we can't update the user.
            // We just need to verify the OTP is correct.
            // However, verifyPhoneOTP currently tries to update user. 
            // We should use verifyOTPFromFirestore logic directly? No, backend needed.

            // NOTE: The backend's verifyPhoneOTP tries to update 'users/{uid}'.
            // But we don't have a UID yet!
            // We need to modify verifyPhoneOTP to handle cases where uid is not passed?
            // OR we pass 'skipUserUpdate: true'?
            // Let's rely on the plan: "Verify Only".

            // Actually, for this Refactor to work, we need to modify backend verifyPhoneOTP
            // to NOT require UID if we just want to check validity.
            // But verifyPhoneOTP logic: verify -> if valid -> update user -> delete otp doc.
            // If we verify now, the OTP doc is deleted.
            // Then when we create the user, we set phoneVerified: true.
            // That works! We just need to tell verifyPhoneOTP to NOT update user if UID is missing/dummy.

            const response = await fetch(`${BACKEND_URL}/api/otp/verify-phone`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    docId,
                    otp: otpString,
                    uid: 'SKIP_UPDATE' // Special flag or just handle error gracefully in backend 
                }),
            });
            const data = await response.json();

            if (!data.success) {
                setError(data.error || 'Invalid OTP');
                triggerShake();
                setOtp(new Array(OTP_LENGTH).fill(''));
                inputRefs.current[0]?.focus();
            } else {
                // Success!
                onVerifySuccess();
            }
        } catch (err: any) {
            setError('Network error. Please check your connection.');
            triggerShake();
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`${BACKEND_URL}/api/otp/send-phone`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone }),
            });
            const data = await response.json();

            if (data.success) {
                setTimer(RESEND_COOLDOWN);

                // Dev mode alert
                if (data.devOtp) {
                    Alert.alert('Dev OTP', `Your code is: ${data.devOtp}`);
                }
            } else {
                setError(data.error || 'Failed to resend');
            }
        } catch (err) {
            setError('Network error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.container}>
                <View style={styles.content}>
                    <LinearGradient
                        colors={['#1a1a1a', '#000000']}
                        style={styles.gradient}
                    >
                        <Text style={styles.title}>Verify Phone</Text>
                        <Text style={styles.subtitle}>
                            Code sent to {phone}
                        </Text>

                        <Animated.View style={[styles.otpContainer, shakeStyle]}>
                            {otp.map((digit, index) => (
                                <TextInput
                                    key={index}
                                    ref={(ref) => { inputRefs.current[index] = ref; }}
                                    style={styles.otpInput}
                                    value={digit}
                                    onChangeText={(text) => handleOtpChange(text, index)}
                                    onKeyPress={(e) => handleKeyPress(e, index)}
                                    keyboardType="number-pad"
                                    maxLength={1}
                                    selectTextOnFocus
                                    editable={!loading}
                                    placeholder="-"
                                    placeholderTextColor="#666"
                                />
                            ))}
                        </Animated.View>

                        {error && <Text style={styles.errorText}>{error}</Text>}

                        <View style={styles.resendContainer}>
                            {timer > 0 ? (
                                <Text style={styles.timerText}>
                                    Resend in {Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, '0')}
                                </Text>
                            ) : (
                                <Pressable onPress={handleResend} disabled={loading}>
                                    <Text style={styles.resendLink}>Resend Code</Text>
                                </Pressable>
                            )}
                        </View>

                        <View style={styles.buttonContainer}>
                            <Pressable
                                style={[styles.cancelButton]}
                                onPress={onClose}
                                disabled={loading}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </Pressable>

                            <Pressable
                                style={[styles.verifyButton, loading && styles.buttonDisabled]}
                                onPress={() => handleVerify(otp.join(''))}
                                disabled={loading}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.verifyButtonText}>Verify</Text>
                                )}
                            </Pressable>
                        </View>

                    </LinearGradient>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.8)',
    },
    content: {
        width: width * 0.9,
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#333',
    },
    gradient: {
        padding: 24,
        alignItems: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#ccc',
        marginBottom: 32,
        textAlign: 'center',
    },
    otpContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        marginBottom: 24,
    },
    otpInput: {
        width: 45,
        height: 55,
        borderWidth: 1,
        borderColor: '#333',
        borderRadius: 12,
        backgroundColor: '#1a1a1a',
        color: '#fff',
        fontSize: 24,
        textAlign: 'center',
        fontWeight: 'bold',
    },
    errorText: {
        color: '#ff4444',
        marginBottom: 16,
    },
    resendContainer: {
        marginBottom: 32,
    },
    timerText: {
        color: '#666',
    },
    resendLink: {
        color: '#ffd700',
        fontWeight: 'bold',
    },
    buttonContainer: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    cancelButton: {
        flex: 1,
        padding: 16,
        borderRadius: 12,
        backgroundColor: '#333',
        alignItems: 'center',
    },
    cancelButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    verifyButton: {
        flex: 1,
        padding: 16,
        borderRadius: 12,
        backgroundColor: '#ffd700',
        alignItems: 'center',
    },
    verifyButtonText: {
        color: '#000',
        fontWeight: 'bold',
        fontSize: 16,
    },
    buttonDisabled: {
        opacity: 0.7,
    },
});

export default OTPModal;
