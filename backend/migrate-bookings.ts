import { db } from './src/config/firebase';

async function migrate() {
    console.log('--- Starting Bookings Migration ---');
    try {
        const bookingsSnapshot = await db.collection('bookings').get();
        console.log(`Found ${bookingsSnapshot.size} bookings to process.`);

        let updatedCount = 0;
        let skippedCount = 0;
        let errorCount = 0;

        for (const bookingDoc of bookingsSnapshot.docs) {
            const data = bookingDoc.data();

            // Skip if customerName already exists and is not 'Unknown Player'
            if (data.customerName && data.customerName !== 'Unknown Player') {
                skippedCount++;
                continue;
            }

            const userId = data.userId || data.playerId || data.parentId || data.uid;

            if (!userId) {
                console.log(`[SKIP] Booking ${bookingDoc.id} has no associated user ID.`);
                skippedCount++;
                continue;
            }

            try {
                const userDoc = await db.collection('users').doc(userId).get();
                if (userDoc.exists) {
                    const userData = userDoc.data();
                    const name = userData?.name || `${userData?.firstName || ''} ${userData?.lastName || ''}`.trim() || 'Unknown Player';

                    await bookingDoc.ref.update({
                        customerName: name,
                        updatedAt: new Date().toISOString()
                    });

                    console.log(`[OK] Updated Booking ${bookingDoc.id} with name: ${name}`);
                    updatedCount++;
                } else {
                    console.log(`[WARN] User ${userId} not found for Booking ${bookingDoc.id}. Setting to Unknown Player.`);
                    await bookingDoc.ref.update({
                        customerName: 'Unknown Player',
                        updatedAt: new Date().toISOString()
                    });
                    updatedCount++;
                }
            } catch (err) {
                console.error(`[ERROR] Failed to update Booking ${bookingDoc.id}:`, err);
                errorCount++;
            }
        }

        console.log('\n--- Migration Finished ---');
        console.log(`Updated: ${updatedCount}`);
        console.log(`Skipped: ${skippedCount}`);
        console.log(`Errors:  ${errorCount}`);

    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        process.exit(0);
    }
}

migrate();
