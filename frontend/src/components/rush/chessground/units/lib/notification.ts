import { storage } from './storage';

let notifications: Array<Notification> = [];
let listening = false;

function listenToFocus() {
  if (!listening) {
    listening = true;
    window.addEventListener('focus', () => {
      notifications.forEach(n => n.close());
      notifications = [];
    });
  }
}

function notify(msg: string | (() => string)) {
  const store = storage.make('just-notified');
  if (document.hasFocus() || Date.now() - parseInt(store.get()!, 10) < 1000) return;
  store.set('' + Date.now());
  if ($.isFunction(msg)) msg = msg();
  const notification = new Notification('lichess.org', {
    icon: site.asset.url('logo/lichess-favicon-256.png'),
    body: msg,
  });
  notification.onclick = () => window.focus();
  notifications.push(notification);
  listenToFocus();
}

export default function (msg: string | (() => string)): void {
  if (document.hasFocus() || !('Notification' in window)) return;
  if (Notification.permission === 'granted') setTimeout(notify, 10 + Math.random() * 500, msg);
  // increases chances that the first tab can put a local storage lock
}
