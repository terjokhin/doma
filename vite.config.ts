import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { defineConfig, type Plugin } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

/** Dev only: probe.html and the debug overlay POST their results here; they're saved to .probe/ (git-ignored). */
function deviceProbe(): Plugin {
  return {
    name: "device-probe",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use("/__probe", (req, res) => {
        if (req.method !== "POST") return void (res.statusCode = 405, res.end());
        let body = "";
        req.on("data", (chunk) => (body += chunk));
        req.on("end", () => {
          const result = JSON.parse(body);
          const env = result.environment ?? {};
          const file = `.probe/${result.takenAt.replace(/[:.]/g, "-")}-chrome${env.chromeVersion ?? "unknown"}.json`;
          mkdirSync(".probe", { recursive: true });
          writeFileSync(file, JSON.stringify(result, null, 2));
          const upd = result.render?.oneTileUpdate?.updateAndLayoutMs;
          server.config.logger.info(
            `[probe] ${env.userAgent}\n  ${env.screen} @${env.devicePixelRatio}x, ${env.cpuCores} cores; ` +
              `tile update p95 ${upd?.p95} ms, ${result.animation?.fps} fps → ${file}`,
          );
          res.setHeader("Content-Type", "application/json");
          res.end('{"ok":true}');
        });
      });
      // The debug overlay (?debug) posts performance reports here every few seconds.
      server.middlewares.use("/__perf", (req, res) => {
        if (req.method !== "POST") return void (res.statusCode = 405, res.end());
        let body = "";
        req.on("data", (chunk) => (body += chunk));
        req.on("end", () => {
          const r = JSON.parse(body);
          const chrome = /Chrome\/(\d+)/.exec(r.userAgent)?.[1] ?? "unknown";
          const file = `.probe/perf-${r.at.slice(0, 10)}-chrome${chrome}.jsonl`;
          mkdirSync(".probe", { recursive: true });
          appendFileSync(file, body.trim() + "\n");
          const ms = (s: { p50: number; p95: number } | null) => (s ? `${s.p50}/${s.p95}` : "–");
          server.config.logger.info(
            `[perf] chrome${chrome} ${r.route} ${r.mode} sub=${r.subscribed} msgs=${r.messages}/${r.seconds}s ` +
              `script=${ms(r.updateScriptMs)} frame=${ms(r.updateFrameMs)} ms (p50/p95) ` +
              `nav=${ms(r.navigationMs)} navFrame=${ms(r.navigationFrameMs)} ` +
              `slowFrames=${r.slowFrames} heap=${r.heapMB}MB` +
              (r.errors.length ? `\n  errors: ${r.errors.join("\n  ")}` : ""),
          );
          res.end();
        });
      });
    },
  };
}

/**
 * The version the app shows (in settings). The release's tag is the only place it's written: package.json says
 * 0.0.0-dev, and the Docker build sets the tag's version into it before building (see the Dockerfile).
 */
const version: string = JSON.parse(readFileSync("package.json", "utf8")).version;

export default defineConfig({
  plugins: [svelte(), deviceProbe()],
  define: { __APP_VERSION__: JSON.stringify(version) },
  // Relative base: the build can be served from any path (its own container, HA's /local/, …).
  base: "./",
  // The oldest browser we run on: Fire HD 10 (2017) with Fire OS 5, whose WebView is Chrome 108 (see probe.html).
  build: { target: ["chrome108", "edge108", "firefox115", "safari16"] },
  // Listen on the LAN too, so a tablet can open the dev server.
  server: { host: true, port: 5173 },
});
