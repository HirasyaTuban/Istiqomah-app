const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc, setDoc, deleteDoc } = require('firebase/firestore');
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

async function runVerification() {
    try {
        console.log('--- Firebase Verification Start ---');

        // 1. Authenticate
        console.log('Step 1: Authenticating anonymously...');
        const userCredential = await signInAnonymously(auth);
        console.log('Success! Anonymous User UID:', userCredential.user.uid);

        // 2. Prepare Test Data
        const testId = 'verification-test-' + Date.now();
        const docRef = doc(db, 'artifacts', 'ramadhan-reset-app', 'public', 'data', 'ramadhan_daily_logs', testId);

        // 3. Write Test
        console.log('Step 2: Testing Write to path artifacts/ramadhan-reset-app/public/data/ramadhan_daily_logs/' + testId);
        const testData = {
            test: true,
            timestamp: new Date().toISOString(),
            message: 'Testing data persistence verification'
        };
        await setDoc(docRef, testData);
        console.log('Write Success!');

        // 4. Read Test
        console.log('Step 3: Testing Read verification...');
        const snap = await getDoc(docRef);
        if (snap.exists() && snap.data().message === testData.message) {
            console.log('Read Success! Data matches:', snap.data());
        } else {
            throw new Error('Read failed: Document not found or data mismatch');
        }

        // 5. Cleanup (Optional but good practice)
        console.log('Step 4: Cleaning up test document...');
        await deleteDoc(docRef);
        console.log('Cleanup Success!');

        console.log('--- VERIFICATION COMPLETE: ALL SYSTEMS OK ---');
        process.exit(0);
    } catch (error) {
        console.error('\n--- VERIFICATION FAILED ---');
        console.error('Error Code:', error.code);
        console.error('Error Message:', error.message);
        process.exit(1);
    }
}

runVerification();
