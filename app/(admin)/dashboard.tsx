import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, TextInput } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { collection, getCountFromServer, query, where, getDocs, limit, orderBy, doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

export default function AdminDashboard() {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [commission, setCommission] = useState('15');
    const [savingCommission, setSavingCommission] = useState(false);
    const { logout } = useAuth();
    const router = useRouter();

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            // 1. Basic Counts
            const usersCount = await getCountFromServer(collection(db, 'users'));
            const bookingsCount = await getCountFromServer(collection(db, 'bookings'));
            const checkinsSnapshot = await getCountFromServer(collection(db, 'checkins'));

            // 2. Role Breakdown
            // Important: Check if roles are stored in uppercase or lowercase in DB
            const playersCount = await getCountFromServer(query(collection(db, 'users'), where('role', 'in', ['player', 'PLAYER'])));
            const academiesCount = await getCountFromServer(query(collection(db, 'users'), where('role', 'in', ['academy', 'ACADEMY'])));
            const clinicsCount = await getCountFromServer(query(collection(db, 'users'), where('role', 'in', ['clinic', 'CLINIC'])));
            const agentsCount = await getCountFromServer(query(collection(db, 'users'), where('role', 'in', ['agent', 'AGENT'])));
            const parentsCount = await getCountFromServer(query(collection(db, 'users'), where('role', 'in', ['parent', 'PARENT'])));

            // 3. Pending Approvals
            const pendingCount = await getCountFromServer(query(collection(db, 'users'), where('status', 'in', ['pending', 'PENDING'])));

            // 4. Revenue & Provider Ranking
            const bookingsSnap = await getDocs(query(collection(db, 'bookings'), where('status', 'in', ['completed', 'COMPLETED'])));
            let totalRevenue = 0;
            const providerRevenue: { [key: string]: number } = {};

            bookingsSnap.forEach(doc => {
                const data = doc.data();
                const price = Number(data.price) || 0;
                totalRevenue += price;
                const pName = data.providerName || 'Unknown Provider';
                providerRevenue[pName] = (providerRevenue[pName] || 0) + price;
            });

            const topProviders = Object.entries(providerRevenue)
                .map(([name, revenue]) => ({ name, revenue }))
                .sort((a, b) => b.revenue - a.revenue)
                .slice(0, 5);

            // 5. Performance
            const totalBookingsNum = bookingsCount.data().count;
            const totalCheckinsNum = checkinsSnapshot.data().count;
            const conversionRate = totalBookingsNum > 0 ? ((totalCheckinsNum / totalBookingsNum) * 100).toFixed(1) : '0';
            const activeProvidersCount = await getCountFromServer(query(collection(db, 'users'), where('role', 'in', ['academy', 'clinic', 'ACADEMY', 'CLINIC']), where('status', 'in', ['active', 'ACTIVE'])));

            // 6. Recent Activity
            const activitySnap = await getDocs(query(collection(db, 'bookings'), orderBy('createdAt', 'desc'), limit(5)));
            const activities = activitySnap.docs.map(doc => ({
                id: doc.id,
                title: 'New Booking',
                message: `${doc.data().playerName || 'A user'} booked ${doc.data().service || 'a service'}`,
                time: 'Recent'
            }));

            // 7. Settings
            const settingsDoc = await getDoc(doc(db, 'settings', 'admin'));
            if (settingsDoc.exists()) {
                setCommission(settingsDoc.data().commissionRate || '15');
            }

            setStats({
                totalUsers: usersCount.data().count,
                totalBookings: totalBookingsNum,
                pendingApprovals: pendingCount.data().count,
                totalRevenue,
                totalCheckIns: totalCheckinsNum,
                conversionRate,
                activeProviders: activeProvidersCount.data().count,
                topProviders,
                roles: {
                    player: playersCount.data().count,
                    academy: academiesCount.data().count,
                    clinic: clinicsCount.data().count,
                    agent: agentsCount.data().count,
                    parent: parentsCount.data().count
                },
                activities: activities.length > 0 ? activities : []
            });
        } catch (error) {
            console.error("Error fetching admin stats:", error);
        } finally {
            setLoading(false);
        }
    };

    const updateCommission = async () => {
        setSavingCommission(true);
        try {
            await setDoc(doc(db, 'settings', 'admin'), { commissionRate: commission }, { merge: true });
            Alert.alert("Success", "Commission rate updated");
        } catch (error) {
            Alert.alert("Error", "Failed to update commission");
        } finally {
            setSavingCommission(false);
        }
    };

    const StatCard = ({ title, value, icon, color }: any) => (
        <View style={[styles.card, { borderLeftColor: color, borderLeftWidth: 5 }]}>
            <View style={styles.cardInfo}>
                <Text style={styles.cardTitle}>{title}</Text>
                <Text style={styles.cardValue}>{value ?? '0'}</Text>
            </View>
            <Ionicons name={icon} size={28} color={color} />
        </View>
    );

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#000" /></View>;

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
                <Text style={styles.welcome}>Admin Panel</Text>
                <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
                    <Text style={styles.logoutText}>Logout</Text>
                </TouchableOpacity>
            </View>

            {/* Core Metrics */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Key Performance Indicators</Text>
                <View style={styles.statsGrid}>
                    <StatCard title="Total Users" value={stats?.totalUsers} icon="people" color="#4e73df" />
                    <StatCard title="Total Bookings" value={stats?.totalBookings} icon="calendar" color="#1cc88a" />
                    <StatCard title="Total Check-ins" value={stats?.totalCheckIns} icon="qr-code" color="#36b9cc" />
                    <StatCard title="Total Revenue" value={`${stats?.totalRevenue} EGP`} icon="cash" color="#e74a3b" />
                </View>
            </View>

            {/* Performance */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Operations Control</Text>
                <View style={styles.statsGrid}>
                    <StatCard title="Pending Approvals" value={stats?.pendingApprovals} icon="time" color="#f6c23e" />
                    <StatCard title="Conv. Rate" value={`${stats?.conversionRate}%`} icon="trending-up" color="#4e73df" />
                    <StatCard title="Active Prov." value={stats?.activeProviders} icon="business" color="#20c9a6" />
                </View>
            </View>

            {/* User Breakdown */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Users by Role</Text>
                <View style={styles.breakdownCard}>
                    <View style={styles.breakdownRow}>
                        <View style={styles.breakdownItem}><Text style={styles.bLabel}>Players</Text><Text style={styles.bValue}>{stats?.roles.player}</Text></View>
                        <View style={styles.breakdownItem}><Text style={styles.bLabel}>Academies</Text><Text style={styles.bValue}>{stats?.roles.academy}</Text></View>
                        <View style={styles.breakdownItem}><Text style={styles.bLabel}>Clinics</Text><Text style={styles.bValue}>{stats?.roles.clinic}</Text></View>
                    </View>
                    <View style={[styles.breakdownRow, { marginTop: 15 }]}>
                        <View style={styles.breakdownItem}><Text style={styles.bLabel}>Agents</Text><Text style={styles.bValue}>{stats?.roles.agent}</Text></View>
                        <View style={styles.breakdownItem}><Text style={styles.bLabel}>Parents</Text><Text style={styles.bValue}>{stats?.roles.parent}</Text></View>
                        <View style={styles.breakdownItem} />
                    </View>
                </View>
            </View>

            {/* Top Providers */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Revenue per Provider</Text>
                <View style={styles.listCard}>
                    {(stats?.topProviders || []).map((p: any, idx: number) => (
                        <View key={idx} style={styles.listItem}>
                            <Text style={styles.itemText}>{p.name}</Text>
                            <Text style={styles.itemValue}>{p.revenue} EGP</Text>
                        </View>
                    ))}
                    {(!stats?.topProviders || stats.topProviders.length === 0) && <Text style={styles.emptyText}>No revenue data available</Text>}
                </View>
            </View>

            {/* Commission Settings */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Platform Settings</Text>
                <View style={styles.settingsCard}>
                    <Text style={styles.label}>Global Commission Rate (%)</Text>
                    <View style={styles.inputRow}>
                        <TextInput
                            style={styles.input}
                            value={commission}
                            onChangeText={setCommission}
                            keyboardType="numeric"
                        />
                        <TouchableOpacity style={styles.saveBtn} onPress={updateCommission} disabled={savingCommission}>
                            {savingCommission ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Update</Text>}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            {/* Recent Activity */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Recent Activity</Text>
                {(stats?.activities || []).map((act: any) => (
                    <View key={act.id} style={styles.activityCard}>
                        <Ionicons name="notifications" size={18} color="#4e73df" />
                        <View style={styles.activityContent}>
                            <Text style={styles.activityTitle}>{act.title}</Text>
                            <Text style={styles.activityMsg}>{act.message}</Text>
                        </View>
                    </View>
                ))}
                {(!stats?.activities || stats.activities.length === 0) && <Text style={styles.emptyText}>No recent activity</Text>}
            </View>

            <View style={styles.navigation}>
                <TouchableOpacity style={styles.navBtn} onPress={() => router.push('/(admin)/users')}>
                    <Ionicons name="people" size={20} color="#fff" />
                    <Text style={styles.navText}>Users</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.navBtn} onPress={() => router.push('/(admin)/bookings')}>
                    <Ionicons name="calendar" size={20} color="#fff" />
                    <Text style={styles.navText}>Bookings</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.navBtn} onPress={() => router.push('/(admin)/checkins')}>
                    <Ionicons name="qr-code" size={20} color="#fff" />
                    <Text style={styles.navText}>Check-ins</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f4f6f9', padding: 16 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    welcome: { fontSize: 24, fontWeight: 'bold', color: '#333' },
    logoutBtn: { backgroundColor: '#e74a3b', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
    logoutText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
    section: { marginBottom: 24 },
    sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#555', marginBottom: 12, textTransform: 'uppercase' },
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    card: { backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 10, width: '48%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', elevation: 2 },
    cardInfo: { flex: 1 },
    cardTitle: { fontSize: 10, color: '#888', marginBottom: 2, fontWeight: '600' },
    cardValue: { fontSize: 16, fontWeight: 'bold', color: '#333' },
    breakdownCard: { backgroundColor: '#fff', borderRadius: 10, padding: 16, elevation: 2 },
    breakdownRow: { flexDirection: 'row', justifyContent: 'space-between' },
    breakdownItem: { flex: 1, alignItems: 'center' },
    bLabel: { fontSize: 11, color: '#888', marginBottom: 2 },
    bValue: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    listCard: { backgroundColor: '#fff', borderRadius: 10, padding: 8, elevation: 2 },
    listItem: { flexDirection: 'row', justifyContent: 'space-between', padding: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
    itemText: { fontSize: 14, color: '#333' },
    itemValue: { fontSize: 14, fontWeight: 'bold', color: '#1cc88a' },
    settingsCard: { backgroundColor: '#fff', borderRadius: 10, padding: 16, elevation: 2 },
    label: { fontSize: 12, color: '#666', marginBottom: 10 },
    inputRow: { flexDirection: 'row', gap: 10 },
    input: { flex: 1, backgroundColor: '#f8f9fc', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: '#ddd' },
    saveBtn: { backgroundColor: '#4e73df', borderRadius: 8, paddingHorizontal: 15, justifyContent: 'center' },
    saveBtnText: { color: '#fff', fontWeight: 'bold' },
    activityCard: { flexDirection: 'row', backgroundColor: '#fff', padding: 12, borderRadius: 8, marginBottom: 8, alignItems: 'center', elevation: 1 },
    activityContent: { marginLeft: 12 },
    activityTitle: { fontSize: 13, fontWeight: 'bold', color: '#333' },
    activityMsg: { fontSize: 12, color: '#777' },
    emptyText: { textAlign: 'center', color: '#999', padding: 20, fontSize: 13 },
    navigation: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, marginBottom: 40 },
    navBtn: { backgroundColor: '#2e59d9', width: '31%', padding: 15, borderRadius: 10, alignItems: 'center', flexDirection: 'column', gap: 5 },
    navText: { color: '#fff', fontWeight: 'bold', fontSize: 11 }
});
