import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { mockApi, BookingData } from '../../../services/mockApi';
import { Ionicons } from '@expo/vector-icons';

export default function BookingDetails() {
    const { id } = useLocalSearchParams();
    const [booking, setBooking] = useState<BookingData | null>(null);

    useEffect(() => {
        mockApi.getBookings().then(bookings => {
            const found = bookings.find(b => b.id === id);
            setBooking(found || null);
        });
    }, [id]);

    const updateStatus = (status: string) => {
        Alert.alert("Update Status", `Change booking status to ${status}?`, [
            { text: "Cancel", style: "cancel" },
            { text: "Confirm", onPress: () => setBooking(prev => prev ? { ...prev, status: status as any } : null) }
        ]);
    };

    if (!booking) return <View style={styles.center}><Text>Booking not found</Text></View>;

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Ionicons name="calendar" size={48} color="#4e73df" />
                <Text style={styles.title}>Booking #{booking.id}</Text>
                <View style={[styles.badge, { backgroundColor: booking.status === 'confirmed' ? '#1cc88a' : '#f6c23e' }]}>
                    <Text style={styles.badgeText}>{booking.status.toUpperCase()}</Text>
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Details</Text>
                <DetailRow label="Player" value={booking.playerName} />
                <DetailRow label="Provider" value={booking.providerName} />
                <DetailRow label="Service" value={booking.service} />
                <DetailRow label="Date" value={booking.date} />
            </View>

            <View style={styles.actionSection}>
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#1cc88a' }]} onPress={() => updateStatus('confirmed')}>
                    <Text style={styles.actionBtnText}>Confirm Booking</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#e74a3b' }]} onPress={() => updateStatus('cancelled')}>
                    <Text style={styles.actionBtnText}>Cancel Booking</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}

const DetailRow = ({ label, value }: any) => (
    <View style={styles.detailRow}>
        <Text style={styles.label}>{label}:</Text>
        <Text style={styles.value}>{value}</Text>
    </View>
);

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f4f6f9' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { alignItems: 'center', backgroundColor: '#fff', padding: 32, marginBottom: 16 },
    title: { fontSize: 24, fontWeight: 'bold', marginVertical: 8 },
    badge: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20 },
    badgeText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
    section: { backgroundColor: '#fff', padding: 16, marginBottom: 16 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16, borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 8 },
    detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    label: { fontSize: 16, color: '#666' },
    value: { fontSize: 16, fontWeight: '600', color: '#333' },
    actionSection: { padding: 16 },
    actionBtn: { padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 12 },
    actionBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});
