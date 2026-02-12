import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { mockApi } from '../../services/mockApi';
import { Ionicons } from '@expo/vector-icons';

export default function NotificationsScreen() {
    const [notifications, setNotifications] = useState<any[]>([]);

    useEffect(() => {
        mockApi.getNotifications().then(setNotifications);
    }, []);

    const renderItem = ({ item }: { item: any }) => (
        <View style={styles.item}>
            <View style={[styles.iconContainer, { backgroundColor: item.type === 'booking' ? '#e1f7ec' : '#e8f0fe' }]}>
                <Ionicons
                    name={item.type === 'booking' ? 'calendar' : 'qr-code'}
                    size={24}
                    color={item.type === 'booking' ? '#1cc88a' : '#4e73df'}
                />
            </View>
            <View style={styles.content}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.message}>{item.message}</Text>
                <Text style={styles.time}>{item.time}</Text>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <FlatList
                data={notifications}
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
    item: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center' },
    iconContainer: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    content: { flex: 1 },
    title: { fontSize: 16, fontWeight: 'bold', color: '#333' },
    message: { fontSize: 14, color: '#666', marginVertical: 2 },
    time: { fontSize: 12, color: '#999' }
});
