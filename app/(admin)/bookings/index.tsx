import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { mockApi, BookingData } from '../../../services/mockApi';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function BookingsList() {
    const [bookings, setBookings] = useState<BookingData[]>([]);
    const router = useRouter();

    useEffect(() => {
        mockApi.getBookings().then(setBookings);
    }, []);

    const renderItem = ({ item }: { item: BookingData }) => (
        <TouchableOpacity style={styles.card} onPress={() => router.push(`/(admin)/bookings/${item.id}` as any)}>
            <View style={styles.header}>
                <Text style={styles.playerName}>{item.playerName}</Text>
                <View style={[styles.statusBadge, { backgroundColor: item.status === 'confirmed' ? '#e1f7ec' : '#fef4e5' }]}>
                    <Text style={[styles.statusText, { color: item.status === 'confirmed' ? '#1cc88a' : '#f6c23e' }]}>
                        {item.status.toUpperCase()}
                    </Text>
                </View>
            </View>
            <View style={styles.details}>
                <View style={styles.detailRow}>
                    <Ionicons name="business-outline" size={16} color="#666" />
                    <Text style={styles.detailText}>{item.providerName}</Text>
                </View>
                <View style={styles.detailRow}>
                    <Ionicons name="fitness-outline" size={16} color="#666" />
                    <Text style={styles.detailText}>{item.service}</Text>
                </View>
                <View style={styles.detailRow}>
                    <Ionicons name="calendar-outline" size={16} color="#666" />
                    <Text style={styles.detailText}>{item.date}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <FlatList
                data={bookings}
                keyExtractor={item => item.id}
                renderItem={renderItem}
                contentContainerStyle={styles.list}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f4f6f9' },
    list: { padding: 16 },
    card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, elevation: 2 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    playerName: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    statusText: { fontSize: 10, fontWeight: 'bold' },
    details: {},
    detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
    detailText: { marginLeft: 8, color: '#666', fontSize: 14 }
});
