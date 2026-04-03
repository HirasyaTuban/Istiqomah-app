const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc } = require('firebase/firestore');
const { getAuth, signInAnonymously } = require('firebase/auth');

const firebaseConfig = {
    apiKey: 'AIzaSyD7MObj-nTpeVldIZfR1E3DJ6XeFXNDL7Q',
    authDomain: 'sakinahplaybook.firebaseapp.com',
    projectId: 'sakinahplaybook',
    storageBucket: 'sakinahplaybook.firebasestorage.app',
    messagingSenderId: '326135659733',
    appId: '1:326135659733:web:23cd01bf2f76c22745b65c'
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

async function checkData() {
    try {
        await signInAnonymously(auth);

        const appIds = ['ramadhan-reset-app', 'ramadhan-reset', 'ramadhan'];
        const testUserId = 'pompy'; // Since the user likely tested with this or their own

        for (const appId of appIds) {
            console.log(`Checking appId: ${appId}`);
            const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'ramadhan_goals', testUserId);
            const snap = await getDoc(docRef);
            if (snap.exists()) {
                console.log(`FOUND DATA in ${appId}:`, snap.data());
            } else {
                console.log(`No data in ${appId}`);
            }
        }
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkData();
