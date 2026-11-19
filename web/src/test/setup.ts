/**
 * Persiapan lingkungan uji.
 *
 * `fake-indexeddb` dipasang global supaya Dexie bisa membuka database di
 * lingkungan Node tanpa browser sungguhan.
 */
import 'fake-indexeddb/auto';

// `navigator.onLine` dipakai useSync/useOnline; sediakan default online agar
// uji tidak bergantung pada lingkungan Node.
if (typeof globalThis.navigator === 'undefined') {
  Object.defineProperty(globalThis, 'navigator', {
    value: { onLine: true },
    configurable: true,
    writable: true,
  });
}
