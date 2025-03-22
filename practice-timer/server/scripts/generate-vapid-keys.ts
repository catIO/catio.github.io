import webpush from 'web-push';
import fs from 'fs';
import path from 'path';

const vapidKeys = webpush.generateVAPIDKeys();

console.log('Generated VAPID keys:');
console.log('Public Key:', vapidKeys.publicKey);
console.log('Private Key:', vapidKeys.privateKey);

// Save keys to a file
const keysPath = path.join(__dirname, '../vapid-keys.json');
fs.writeFileSync(keysPath, JSON.stringify(vapidKeys, null, 2));
console.log('\nKeys saved to:', keysPath); 