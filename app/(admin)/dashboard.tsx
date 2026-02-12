import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { mockApi } from '../../services/mockApi';
import { useAuth } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function AdminDashboard() {
    const [stats, setStats] = useState<any>(null);
    const { logout } = useAuth();
    const router = useRouter();

    useEffect(() => {
        mockApi.getStats().then(setStats);
    }, []);

    const StatCard = ({ title, value, icon, color }: any) => (
        <View style={[styles.card, { borderLeftColor: color, borderLeftWidth: 5 }]}>
            <View style={styles.cardInfo}>
                <Text style={styles.cardTitle}>{title}</Text>
                <Text style={styles.cardValue}>{value || '...'}</Text>
            </View>
            <Ionicons name={icon} size={32} color={color} />
        </View>
    );

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.welcome}>Welcome, Admin</Text>
                <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
                    <Text style={styles.logoutText}>Logout</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.statsGrid}>
                <StatCard title="Total Users" value={stats?.totalUsers} icon="people" color="#4e73df" />
                <StatCard title="Total Bookings" value={stats?.totalBookings} icon="calendar" color="#1cc88a" />
                <StatCard title="Check-ins" value={stats?.totalCheckIns} icon="checkmark-circle" color="#36b9cc" />
                <StatCard title="Commission" value={`$${stats?.totalCommission}`} icon="cash" color="#f6c23e" />
            </View>

            <View style={styles.menuGrid}>
                <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/(admin)/users')}>
                    <Ionicons name="people-outline" size={24} color="#333" />
                    <Text style={styles.menuText}>Users</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/(admin)/bookings')}>
                    <Ionicons name="calendar-outline" size={24} color="#333" />
                    <Text style={styles.menuText}>Bookings</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/(admin)/checkins')}>
                    <Ionicons name="qr-code-outline" size={24} color="#333" />
                    <Text style={styles.menuText}>Check-ins</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/(admin)/notifications')}>
                    <Ionicons name="notifications-outline" size={24} color="#333" />
                    <Text style={styles.menuText}>Notifications</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f4f6f9', padding: 16 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    welcome: { fontSize: 20, fontWeight: 'bold', color: '#333' },
    logoutBtn: { backgroundColor: '#e74a3b', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
    logoutText: { color: '#fff', fontWeight: '600' },
    statsGrid: { marginBottom: 24 },
    card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
    cardInfo: { flex: 1 },
    cardTitle: { fontSize: 14, color: '#858796', marginBottom: 4, textTransform: 'uppercase', fontWeight: 'bold' },
    cardValue: { fontSize: 24, fontWeight: 'bold', color: '#5a5c69' },
    menuGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    menuItem: { backgroundColor: '#fff', width: '48%', padding: 20, borderRadius: 12, alignItems: 'center', marginBottom: 16, elevation: 2 },
    menuText: { marginTop: 8, fontWeight: '600', color: '#333' }
});
