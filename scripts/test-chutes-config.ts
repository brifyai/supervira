import { CHUTES_CONFIG } from '../lib/chutes-config';

console.log('--- TEST CHUTES CONFIG ---');
console.log('API Key present:', !!CHUTES_CONFIG.apiKey);
console.log('API Key length:', CHUTES_CONFIG.apiKey.length);
console.log('API Key start:', CHUTES_CONFIG.apiKey.substring(0, 5) + '...');
console.log('Has leading whitespace:', /^\s/.test(CHUTES_CONFIG.apiKey));
console.log('Has trailing whitespace:', /\s$/.test(CHUTES_CONFIG.apiKey));
console.log('--------------------------');
