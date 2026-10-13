// Android-shaped React Native Web preview with synthetic, rejecting native adapters.
// This checks the real UI and draft/storage logic, not device camera or SQLCipher.
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const get = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const out = path.resolve(root, get("--out") || "output/food-phone-preview");
const browserTools = get("--browser-tools");
if (!browserTools)
  throw Error("Pass --browser-tools with a local Playwright package path.");
const { chromium } = createRequire(
  path.join(path.resolve(browserTools), "package.json"),
)("playwright");
const mocks = {
  "react-native": `import * as native from 'react-native-web';export * from 'react-native-web';export const Platform={...native.Platform,OS:'android',select:c=>c.android??c.default};`,
  "react-native-safe-area-context": `export {View as SafeAreaView} from 'react-native';`,
  "expo-router": `export const useRouter=()=>({push(){throw Error('Preview rejects navigation');}});export const useFocusEffect=()=>{};`,
  "expo-crypto": `export const randomUUID=()=>crypto.randomUUID();`,
  "expo-symbols": `import React from 'react';import {Text} from 'react-native';export const SymbolView=({name})=>React.createElement(Text,{style:{fontSize:22}},name?.android==='close'?'×':'•');`,
  "expo-image-picker": `export const requestCameraPermissionsAsync=async()=>({granted:true});export const launchCameraAsync=()=>window.__foodPreview.picked();export const launchImageLibraryAsync=launchCameraAsync;export const getPendingResultAsync=async()=>null;`,
  "expo-secure-store": `export const WHEN_UNLOCKED_THIS_DEVICE_ONLY=0;export const getItemAsync=async()=>null;export const setItemAsync=async()=>{throw Error('Preview rejects real credentials');};export const deleteItemAsync=async()=>{};`,
  "expo/fetch": `export const fetch=(...args)=>window.fetch(...args);`,
  "@/hooks/use-theme": `import {Colors} from '@/constants/theme';export const useTheme=()=>Colors[new URLSearchParams(location.search).get('theme')||'light'];`,
  "@/state/app-context": `export const useApp=()=>({locked:false});`,
  "@/storage/database": `export const getDatabase=async()=>window.__foodPreview.db;`,
  "@/storage/vault-transaction": `export const withVaultTransaction=task=>window.__foodPreview.transaction(task);`,
  "@/storage/local-preferences": `export const readLocalPreference=(...args)=>window.__foodPreview.readLocal(...args);export const writeLocalPreference=(...args)=>window.__foodPreview.writeLocal(...args);`,
  "@/services/device-sync": `export const deviceSyncStatus=()=>({enabled:false});export const syncDevices=async()=>{throw Error('Preview rejects device sync');};`,
  "react-native-webview": `import React,{useEffect,useRef} from 'react';export function WebView({source,onMessage,onError}){const ref=useRef(null);useEffect(()=>{const on=e=>{if(e.source===ref.current?.contentWindow)onMessage({nativeEvent:{data:e.data}});};window.addEventListener('message',on);return()=>window.removeEventListener('message',on);},[onMessage]);return React.createElement('iframe',{ref,sandbox:'allow-scripts',srcDoc:source.html.replace('<script>','<script>window.ReactNativeWebView={postMessage:value=>parent.postMessage(value,"*")};'),onError,style:{width:1,height:1,border:0}});}`,
};
const result = await build({
  entryPoints: [path.join(root, "scripts/food-preview/runtime.tsx")],
  bundle: true,
  write: false,
  format: "iife",
  platform: "browser",
  target: ["chrome110"],
  jsx: "automatic",
  loader: { ".css": "empty" },
  define: { "process.env.NODE_ENV": '"development"' },
  plugins: [
    {
      name: "safe-food-preview",
      setup(b) {
        b.onResolve({ filter: /.*/ }, (a) => {
          let key = a.path;
          if (
            a.path.startsWith(".") &&
            a.importer &&
            !a.importer.startsWith("food-preview:")
          ) {
            const file = path.resolve(path.dirname(a.importer), a.path);
            const source = path.join(root, "src");
            if (file.startsWith(source + path.sep))
              key =
                "@/" +
                file.slice(source.length + 1).replace(/\.(tsx?|jsx?)$/, "");
          }
          return key in mocks
            ? { path: key, namespace: "food-preview" }
            : undefined;
        });
        b.onLoad({ filter: /.*/, namespace: "food-preview" }, (a) => ({
          contents: mocks[a.path],
          loader: "js",
          resolveDir: root,
        }));
      },
    },
  ],
});
fs.mkdirSync(out, { recursive: true });
const fontCss = [400, 500, 600, 700, 800, 900]
  .map((weight) => {
    const suffix = {
      400: "Regular",
      500: "Medium",
      600: "SemiBold",
      700: "Bold",
      800: "ExtraBold",
      900: "Black",
    }[weight];
    return `@font-face{font-family:Chivo_${weight}${suffix};src:url(/font-${weight}.ttf)}`;
  })
  .join("");
const html =
  "<!doctype html><style>" +
  fontCss +
  '</style><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body,#root{height:100%;margin:0}body{font-family:Arial,sans-serif}*{box-sizing:border-box}</style><div id="root"></div><script src="/fixture.js"></script>';
const server = http.createServer((request, response) => {
  const url = new URL(request.url, "http://localhost");
  if (url.pathname === "/fixture.js") {
    response.setHeader("Content-Type", "application/javascript");
    response.end(result.outputFiles[0].text);
  } else if (/^\/font-(400|500|600|700|800|900)\.ttf$/.test(url.pathname)) {
    const weight = Number(url.pathname.match(/\d+/)[0]),
      suffix = {
        400: "Regular",
        500: "Medium",
        600: "SemiBold",
        700: "Bold",
        800: "ExtraBold",
        900: "Black",
      }[weight];
    response.setHeader("Content-Type", "font/ttf");
    response.end(
      fs.readFileSync(
        path.join(
          root,
          "node_modules/@expo-google-fonts/chivo",
          weight + suffix,
          "Chivo_" + weight + suffix + ".ttf",
        ),
      ),
    );
  } else if (url.pathname === "/") {
    response.setHeader("Content-Type", "text/html");
    response.end(html);
  } else {
    response.statusCode = 404;
    response.end();
  }
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const origin = "http://127.0.0.1:" + server.address().port;
const browser = await chromium.launch({
  headless: true,
  ...(get("--browser-executable")
    ? { executablePath: path.resolve(get("--browser-executable")) }
    : {}),
});
const context = await browser.newContext({
  viewport: { width: 412, height: 915 },
  deviceScaleFactor: 2,
});
const page = await context.newPage(),
  errors = [],
  requests = [];
page.on("pageerror", (e) => errors.push(e.message));
await context.route("**/*", (route) => {
  const url = new URL(route.request().url());
  if (url.origin === origin || ["data:", "blob:"].includes(url.protocol))
    return route.continue();
  requests.push(url.href);
  if (
    url.hostname === "world.openfoodfacts.org" &&
    url.pathname === "/api/v2/product/3017620422003.json"
  )
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        status: 1,
        product: {
          code: "3017620422003",
          product_name: "Synthetic snack fixture",
          brands: "Fixture only",
          nutrition_data_per: "100g",
          nutriments: {
            "energy-kcal_100g": 500,
            proteins_100g: 8,
            carbohydrates_100g: 60,
            fat_100g: 25,
          },
        },
      }),
    });
  return route.abort();
});
const assert = (value, message) => {
  if (!value) throw Error(message);
};
const rows = () => page.evaluate(() => window.__foodPreview.rows());
const shot = async (name) => {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(350); // Let the real Modal's 300 ms slide complete.
  return page.screenshot({
    path: path.join(out, name + ".png"),
    fullPage: false,
  });
};
const checks = [];
try {
  await page.goto(origin);
  await page.getByRole("button", { name: "Add food", exact: true }).waitFor();
  await shot("diary-light");
  await page.getByRole("button", { name: "Add food", exact: true }).click();
  await page.getByRole("button", { name: "Manual", exact: true }).click();
  await page
    .getByRole("button", { name: "Enter food manually", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Food name", exact: true })
    .fill("Synthetic oats");
  await page
    .getByRole("textbox", { name: "Energy (kcal)", exact: true })
    .fill("380");
  await page
    .getByRole("textbox", { name: "Protein (g)", exact: true })
    .fill("12");
  await page
    .getByRole("textbox", { name: "Amount of Synthetic oats", exact: true })
    .fill("50");
  await shot("manual-review");
  await page.getByRole("button", { name: "Save food", exact: true }).click();
  await page.getByText("Food saved.", { exact: true }).waitFor();
  let foods = (await rows()).filter((r) => r.value.kind === "food");
  assert(
    foods.length === 1 &&
      foods[0].value.nutrition.calories === 190 &&
      foods[0].value.nutrition.fibre === null,
    "Manual amount/source/unknown snapshot",
  );
  checks.push("Manual 50g / 190kcal saved; unknown fibre remains null.");
  await page.reload();
  await page
    .getByRole("button", { name: "Edit Synthetic oats", exact: true })
    .waitFor();
  assert(
    (await rows()).filter((r) => r.value.kind === "food").length === 1,
    "Reload retained food",
  );
  checks.push("Full browser reload retained synthetic food snapshot.");
  await page.evaluate(() => {
    window.__foodPreview.pickMode = "barcode";
  });
  await page.getByRole("button", { name: "Scan barcode", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Food name", exact: true })
    .waitFor({ timeout: 20000 });
  assert(
    (await page
      .getByRole("textbox", { name: "Food name", exact: true })
      .inputValue()) === "Synthetic snack fixture",
    "Isolated optical barcode decode and fixed-host lookup",
  );
  await shot("barcode-review");
  await page.getByRole("button", { name: "Save food", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByText(
      "Check whether your pack declares nutrition per 100 g or 100 ml before saving.",
      { exact: true },
    )
    .waitFor();
  assert(
    (await rows()).filter((r) => r.value.kind === "food").length === 1,
    "Unconfirmed barcode unit must not log",
  );
  await page.getByRole("button", { name: "Per 100 g", exact: true }).click();
  await page
    .getByRole("textbox", {
      name: "Amount of Synthetic snack fixture",
      exact: true,
    })
    .fill("30");
  await page.getByRole("button", { name: "Save food", exact: true }).click();
  await page.getByText("Food saved.", { exact: true }).waitFor();
  foods = (await rows()).filter((r) => r.value.kind === "food");
  assert(
    foods.length === 2 && foods.some((r) => r.value.nutrition.calories === 150),
    "Barcode corrected amount snapshot",
  );
  checks.push(
    "Synthetic EAN-13 optical image decoded; review blocked logging until basis confirmed; 30g / 150kcal saved.",
  );
  await page.evaluate(() => {
    window.__foodPreview.pickMode = "photo";
  });
  await page
    .getByRole("button", { name: "Take food photo", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Meal description", exact: true })
    .waitFor({ timeout: 20000 });
  await page
    .getByRole("textbox", { name: "Meal description", exact: true })
    .fill("Synthetic meal fixture; amounts unmeasured");
  await shot("photo-review");
  await page.evaluate(() => {
    window.__foodPreview.failClearOnce = true;
  });
  await page
    .getByRole("button", { name: "Save for Mac review", exact: true })
    .click();
  await page
    .getByText("Synthetic interrupted acknowledgement; retry the same photo.", {
      exact: true,
    })
    .waitFor();
  assert(
    (await rows()).filter((r) => r.id.startsWith("diet-capture:")).length === 1,
    "Queue committed one packet before failed acknowledgement",
  );
  await page.reload();
  await page
    .getByRole("button", { name: "Save for Mac review", exact: true })
    .waitFor();
  await page
    .getByRole("button", { name: "Save for Mac review", exact: true })
    .click();
  await page
    .getByText(
      "Photo saved privately. Review it in Food diary on your Mac after sync.",
      { exact: true },
    )
    .waitFor();
  assert(
    (await rows()).filter((r) => r.id.startsWith("diet-capture:")).length === 1,
    "Retry must not duplicate packet",
  );
  assert(
    (await rows()).filter((r) => r.value.kind === "food").length === 2,
    "Photo queue must not count as logged food",
  );
  checks.push(
    "Compressed JPEG queue persisted before simulated draft-clear interruption; full reload/retry acknowledged same capture ID with one packet and no food log.",
  );
  await page.goto(origin + "?theme=dark");
  await page.getByRole("button", { name: "Add food", exact: true }).waitFor();
  await shot("diary-dark");
  assert(errors.length === 0, "Browser runtime errors: " + errors.join(";"));
  fs.writeFileSync(
    path.join(out, "preview.json"),
    JSON.stringify(
      {
        status: "passed",
        surface: "React Native Web / Android-shaped synthetic preview",
        nativeCameraVerified: false,
        nativeSQLCipherVerified: false,
        physicalDeviceVerified: false,
        providerRequestVerified: false,
        viewport: { width: 412, height: 915 },
        dpr: 2,
        hidden: true,
        disposable: true,
        checks,
        errors,
        requests,
      },
      null,
      2,
    ),
  );
  console.log(JSON.stringify({ status: "passed", checks, out }));
} finally {
  await context.close();
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
