const dataStore = require('../dataStore');

let scheduled = false;

function scheduleReminders(client) {
  if (scheduled) return;
  scheduled = true;

  const check = async () => {
    const now = Date.now();
    try {
      const reminders = await dataStore.getReminders();
      for (const [id, reminder] of Object.entries(reminders)) {
        if (reminder.when <= now) {
          try {
            const user = await client.users.fetch(reminder.userId).catch(() => null);
            if (user) {
              await user.send(
                `⏰ **PLIM!** Germinó tu recordatorio, \`${reminder.message}\`\n` +
                  `Recordá que las plantas esperamos con paciencia... pero no tanto. 🌿`
              );
            }
          } catch (err) {
            console.error(`[reminders] Error sending reminder ${id}:`, err);
          }
          await dataStore.removeReminder(id);
        }
      }
    } catch (err) {
      console.error('[reminders] Error checking reminders:', err);
    }
  };

  // Check every 30 seconds
  setInterval(check, 30_000);
  // Run once at startup to catch reminders that fired while offline
  check();
}

module.exports = { scheduleReminders };