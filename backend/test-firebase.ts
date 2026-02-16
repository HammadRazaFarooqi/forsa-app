import { db } from './src/config/firebase';

async function test() {
    try {
        console.log('--- Firebase Test ---');
        console.log('Fetching bookings...');
        const snapshot = await db.collection('bookings').limit(3).get();
        console.log('Bookings found:', snapshot.size);
        snapshot.docs.forEach(doc => {
            const data = doc.data();
            console.log(`Booking ID: ${doc.id}`);
            console.log(`  Keys: ${Object.keys(data).join(', ')}`);
            console.log(`  playerName: ${data.playerName}`);
            console.log(`  playerId: ${data.playerId}`);
            console.log(`  userId: ${data.userId}`);
            console.log(`  parentId: ${data.parentId}`);
            console.log(`  uid: ${data.uid}`);
        });

        console.log('\nFetching users...');
        const usersSnapshot = await db.collection('users').limit(3).get();
        console.log('Users found:', usersSnapshot.size);
        usersSnapshot.docs.forEach(doc => {
            const data = doc.data();
            console.log(`User ID: ${doc.id}`);
            console.log(`  Keys: ${Object.keys(data).join(', ')}`);
            console.log(`  name: ${data.name}`);
            console.log(`  firstName: ${data.firstName}`);
            console.log(`  lastName: ${data.lastName}`);
        });
    } catch (err) {
        console.error('Test failed:', err);
    } finally {
        process.exit(0);
    }
}

test();
