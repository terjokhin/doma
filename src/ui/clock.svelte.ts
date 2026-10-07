import { language } from "../i18n/index.svelte";

/** The time, for the clock in the header or the sidebar: one timer for the app, every 10 s. */
let now = $state(new Date());
setInterval(() => (now = new Date()), 10_000);

export const clock = {
  get now() {
    return now;
  },
};

export function greetingKey(hour: number) {
  if (hour < 5) return "home.greeting_night";
  if (hour < 12) return "home.greeting_morning";
  if (hour < 18) return "home.greeting_afternoon";
  if (hour < 23) return "home.greeting_evening";
  return "home.greeting_night";
}

let formats: { lang: string; time: Intl.DateTimeFormat; date: Intl.DateTimeFormat } | undefined;
function formatsOf(lang: string) {
  if (formats?.lang !== lang) {
    formats = {
      lang,
      time: new Intl.DateTimeFormat(lang, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }),
      date: new Intl.DateTimeFormat(lang, { weekday: "long", day: "numeric", month: "long" }),
    };
  }
  return formats;
}

export const formatTime = (d: Date) => formatsOf(language()).time.format(d);
export const formatDate = (d: Date) => formatsOf(language()).date.format(d);
