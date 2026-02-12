import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { collection, getDocs, query, orderBy, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function CheckinsScreen() {
    const [checkins, setCheckins] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    const fetchCheckins = async () => {
        try {
            const q = query(collection(db, 'checkins'), orderBy('createdAt', 'desc'));
            const querySnapshot = await getDocs(q);
            const list = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setCheckins(list);
        } catch (error) {
            console.error("Error fetching checkins:", error);
            Alert.alert("Error", "Failed to load checkins");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCheckins();
    }, []);

    const markAsPaid = async (id: string) => {
        try {
            await updateDoc(doc(db, 'checkins', id), { isPaid: true });
            setCheckins(prev => prev.map(c => c.id === id ? { ...c, isPaid: true } : c));
        } catch (error) {
            console.error("Error marking as paid:", error);
            Alert.alert("Error", "Failed to update payment status");
        }
    };

    const renderItem = ({ item }: { item: any }) => (
        <View style={styles.card}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.playerName}>{item.playerName || 'Unknown Player'}</Text>
                    <Text style={styles.providerName}>{item.providerName || 'Unknown Provider'}</Text>
                </View>
                {item.isPaid ? (
                    <View style={styles.paidBadge}>
                        <Text style={styles.paidText}>PAID</Text>
                    </View>
                ) : (
                    <TouchableOpacity style={styles.payBtn} onPress={() => markAsPaid(item.id)}>
                        <Text style={styles.payText}>Mark Paid</Text>
                    </TouchableOpacity>
                )}
            </View>
            <View style={styles.footer}>
                <View style={styles.info}>
                    <Text style={styles.code}>Code: {item.userCode || 'N/A'}</Text>
                    <Text style={styles.date}>{item.formattedDate || (item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'N/A')}</Text>
                </View>
                <View style={styles.commission}>
                    <Text style={styles.commLabel}>Commission</Text>
                    <Text style={styles.commValue}>{item.commission || 0} EGP</Text>
                </View>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            {loading ? (
                <View style={styles.center}><ActivityIndicator size="large" color="#000" /></View>
            ) : (
                <FlatList
                    data={checkins}
                    keyExtractor={item => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.list}
                    ListEmptyComponent={<View style={styles.center}><Text>No check-ins found.</Text></View>}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f4f6f9' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50 },
    list: { padding: 16 },
    card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, elevation: 2 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
    playerName: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    providerName: { fontSize: 14, color: '#666' },
    paidBadge: { backgroundColor: '#e1f7ec', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
    paidText: { color: '#1cc88a', fontWeight: 'bold', fontSize: 10 },
    payBtn: { backgroundColor: '#4e73df', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
    payText: { color: '#fff', fontWeight: 'bold', fontSize: 10 },
    footer: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 12 },
    info: {},
    code: { fontWeight: 'bold', color: '#4e73df' },
    date: { fontSize: 12, color: '#999' },
    commission: { alignItems: 'flex-end' },
    commLabel: { fontSize: 10, color: '#888' },
    commValue: { fontSize: 16, fontWeight: 'bold', color: '#1cc88a' }
});
