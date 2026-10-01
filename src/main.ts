import { mount } from "svelte";
import "./styles/app.css";
import App from "./App.svelte";
import { debugEnabled } from "./debug/stats";

mount(App, { target: document.getElementById("app")! });

// A separate chunk, loaded only with ?debug.
if (debugEnabled) void import("./debug/overlay").then((m) => m.startOverlay());
