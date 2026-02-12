import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { mockApi, CheckInData } from '../../services/mockApi';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function CheckinsScreen() {
    const [checkins, setCheckins] = useState<CheckInData[]>([]);
    const router = useRouter();

    useEffect(() => {
        mockApi.getCheckIns().then(setCheckins);
    }, []);

    const renderItem = ({ item }: { item: CheckInData }) => (
        <View style={styles.card}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.playerName}>{item.playerName}</Text>
                    <Text style={styles.providerName}>{item.providerName}</Text>
                </View>
                <TouchableOpacity onPress={() => router.push('/(admin)/qr-display')}>
                    <Ionicons name="qr-code" size={24} color="#4e73df" />
                </TouchableOpacity>
            </View>
            <View style={styles.footer}>
                <View style={styles.info}>
                    <Text style={styles.code}>Code: {item.userCode}</Text>
                    <Text style={styles.date}>{item.date}</Text>
                </View>
                <View style={styles.commission}>
                    <Text style={styles.commLabel}>Commission</Text>
                    <Text style={styles.commValue}>${item.commission}</Text>
                </View>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <FlatList
                data={checkins}
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
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
    playerName: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    providerName: { fontSize: 14, color: '#666' },
    footer: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 12 },
    info: {},
    code: { fontWeight: 'bold', color: '#4e73df' },
    date: { fontSize: 12, color: '#999' },
    commission: { alignItems: 'flex-end' },
    commLabel: { fontSize: 10, color: '#888' },
    commValue: { fontSize: 16, fontWeight: 'bold', color: '#1cc88a' }
});
