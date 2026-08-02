const STORAGE_KEY = "daylist-planner-v1";
const DAY_NAMES = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];
const MEAL_LABELS = { breakfast: "아침", lunch: "점심", dinner: "저녁" };

const elements = {
  weekday: document.querySelector("#widgetWeekday"),
  date: document.querySelector("#widgetDate"),
  doneCount: document.querySelector("#widgetDoneCount"),
  taskCount: document.querySelector("#widgetTaskCount"),
  reminderCount: document.querySelector("#widgetReminderCount"),
  doneTotal: document.querySelector("#doneWidgetTotal"),
  doneList: document.querySelector("#widgetDoneList"),
  doneEmpty: document.querySelector("#widgetDoneEmpty"),
  taskTotal: document.querySelector("#taskWidgetTotal"),
  taskList: document.querySelector("#widgetTaskList"),
  taskEmpty: document.querySelector("#widgetTaskEmpty"),
  reminderTotal: document.querySelector("#reminderWidgetTotal"),
  reminderList: document.querySelector("#widgetReminderList"),
  reminderEmpty: document.querySelector("#widgetReminderEmpty"),
  meals: document.querySelector("#widgetMeals"),
};

function toISODate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(date) {
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
}

function escapeHTML(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function loadTodayEntry() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    const source = parsed.entries && typeof parsed.entries === "object" ? parsed.entries : parsed;
    const raw = source?.[toISODate(new Date())] || {};
    const oldDone = [raw.done, raw.note, raw.focus].find((value) => typeof value === "string") || "";
    const doneItems = Array.isArray(raw.doneItems)
      ? raw.doneItems
          .filter((item) => item && typeof item.text === "string" && item.text.trim())
          .map((item) => ({
            time: /^([01]\d|2[0-3]):[0-5]\d$/.test(item.time) ? item.time : "",
            text: item.text.trim().slice(0, 120),
          }))
      : [];
    if (!doneItems.length && oldDone.trim()) {
      oldDone
        .split(/\r?\n/)
        .map((text) => text.trim())
        .filter(Boolean)
        .forEach((text) => doneItems.push({ time: "", text: text.slice(0, 120) }));
    }
    return {
      doneItems,
      tasks: Array.isArray(raw.tasks) ? raw.tasks.filter((task) => task && typeof task.text === "string") : [],
      meals: raw.meals && typeof raw.meals === "object" ? raw.meals : {},
      reminders: Array.isArray(raw.reminders)
        ? raw.reminders.filter((reminder) => reminder && /^([01]\d|2[0-3]):[0-5]\d$/.test(reminder.time) && typeof reminder.text === "string")
        : [],
    };
  } catch {
    return { doneItems: [], tasks: [], meals: {}, reminders: [] };
  }
}

function renderList(element, items, emptyElement, renderer) {
  element.innerHTML = items.map(renderer).join("");
  emptyElement.hidden = items.length > 0;
}

function renderWidget() {
  const now = new Date();
  const entry = loadTodayEntry();
  const pendingTasks = entry.tasks.filter((task) => !task.done);
  const enabledReminders = entry.reminders.filter((reminder) => reminder.enabled !== false);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const upcomingReminders = enabledReminders
    .slice()
    .sort((a, b) => a.time.localeCompare(b.time))
    .filter((reminder) => {
      const [hours, minutes] = reminder.time.split(":").map(Number);
      return hours * 60 + minutes >= currentMinutes;
    });
  const remindersToShow = upcomingReminders.length ? upcomingReminders : enabledReminders.slice().sort((a, b) => a.time.localeCompare(b.time));

  elements.weekday.textContent = `TODAY · ${DAY_NAMES[now.getDay()]}`;
  elements.date.textContent = formatDate(now);
  elements.doneCount.textContent = entry.doneItems.length;
  elements.taskCount.textContent = pendingTasks.length;
  elements.reminderCount.textContent = enabledReminders.length;
  elements.doneTotal.textContent = `${entry.doneItems.length}개`;
  elements.taskTotal.textContent = `${pendingTasks.length}개`;
  elements.reminderTotal.textContent = `${enabledReminders.length}개`;

  renderList(
    elements.doneList,
    entry.doneItems.slice(0, 5),
    elements.doneEmpty,
    (item) => `<li class="widget-row"><span class="widget-check" aria-hidden="true">✓</span><time>${item.time || "기록"}</time><span>${escapeHTML(item.text)}</span></li>`,
  );
  renderList(
    elements.taskList,
    pendingTasks.slice(0, 4),
    elements.taskEmpty,
    (task) => `<li class="widget-row"><span class="widget-open-dot" aria-hidden="true"></span><span class="widget-row-text">${escapeHTML(task.text)}</span></li>`,
  );
  renderList(
    elements.reminderList,
    remindersToShow.slice(0, 3),
    elements.reminderEmpty,
    (reminder) => `<li class="widget-row"><time>${escapeHTML(reminder.time)}</time><span class="widget-row-text">${escapeHTML(reminder.text)}</span></li>`,
  );

  elements.meals.innerHTML = ["breakfast", "lunch", "dinner"]
    .map((meal) => `<div><span>${MEAL_LABELS[meal]}</span><strong>${escapeHTML(String(entry.meals[meal] || "—"))}</strong></div>`)
    .join("");
}

window.addEventListener("storage", renderWidget);
window.addEventListener("pageshow", renderWidget);
window.setInterval(renderWidget, 30000);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js?v=5").catch(() => {}));
}

renderWidget();
