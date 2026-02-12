import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { mockApi, UserData } from '../../../services/mockApi';
import { Ionicons } from '@expo/vector-icons';

export default function UserDetails() {
    const { id } = useLocalSearchParams();
    const [user, setUser] = useState<UserData | null>(null);
    const router = useRouter();

    useEffect(() => {
        mockApi.getUsers().then(users => {
            const found = users.find(u => u.id === id);
            setUser(found || null);
        });
    }, [id]);

    const handleStatusChange = (newStatus: string) => {
        Alert.alert("Update Status", `Change user status to ${newStatus}?`, [
            { text: "Cancel", style: "cancel" },
            { text: "Update", onPress: () => setUser(prev => prev ? { ...prev, status: newStatus as any } : null) }
        ]);
    };

    if (!user) return <View style={styles.center}><Text>User not found</Text></View>;

    return (
        <ScrollView style={styles.container}>
            <View style={styles.profileHeader}>
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{user.name[0]}</Text>
                </View>
                <Text style={styles.name}>{user.name}</Text>
                <Text style={styles.role}>{user.role}</Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Contact Information</Text>
                <View style={styles.infoRow}>
                    <Ionicons name="mail-outline" size={20} color="#666" />
                    <Text style={styles.infoText}>{user.email}</Text>
                </View>
                <View style={styles.infoRow}>
                    <Ionicons name="call-outline" size={20} color="#666" />
                    <Text style={styles.infoText}>+1 (555) 000-0000</Text>
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Account Status</Text>
                <View style={styles.statusContainer}>
                    <Text style={[styles.statusText, { color: user.status === 'active' ? '#1cc88a' : user.status === 'pending' ? '#f6c23e' : '#e74a3b' }]}>
                        {user.status.toUpperCase()}
                    </Text>
                </View>
                <View style={styles.buttonRow}>
                    <TouchableOpacity style={[styles.btn, styles.approveBtn]} onPress={() => handleStatusChange('active')}>
                        <Text style={styles.btnText}>Approve</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.btn, styles.suspendBtn]} onPress={() => handleStatusChange('suspended')}>
                        <Text style={styles.btnText}>Suspend</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.btn, styles.rejectBtn]} onPress={() => handleStatusChange('pending')}>
                        <Text style={styles.btnText}>Reject</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f4f6f9' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    profileHeader: { alignItems: 'center', backgroundColor: '#fff', padding: 24, marginBottom: 16 },
    avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#4e73df', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
    avatarText: { color: '#fff', fontSize: 32, fontWeight: 'bold' },
    name: { fontSize: 24, fontWeight: 'bold', color: '#333' },
    role: { fontSize: 16, color: '#888', textTransform: 'capitalize' },
    section: { backgroundColor: '#fff', padding: 16, marginBottom: 16 },
    sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 12 },
    infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    infoText: { marginLeft: 12, fontSize: 16, color: '#555' },
    statusContainer: { marginBottom: 16 },
    statusText: { fontSize: 18, fontWeight: 'bold' },
    buttonRow: { flexDirection: 'row', justifyContent: 'space-between' },
    btn: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center', marginHorizontal: 4 },
    approveBtn: { backgroundColor: '#1cc88a' },
    suspendBtn: { backgroundColor: '#f6c23e' },
    rejectBtn: { backgroundColor: '#e74a3b' },
    btnText: { color: '#fff', fontWeight: 'bold' }
});
