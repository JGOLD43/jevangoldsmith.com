// Disposable visual/workflow fixture. It has no native database, credentials or user files.
import React from "react";
import { createRoot } from "react-dom/client";
import FoodDiary from "../../src/app/food";

const STORE = "trident.synthetic.food-preview.v1";
const initial = { rows: {}, local: {}, secure: {} };
let state = JSON.parse(localStorage.getItem(STORE) || JSON.stringify(initial));
const persist = () => localStorage.setItem(STORE, JSON.stringify(state));
const allowedId = (id: string) => /^(health:|diet-|view:food\.)/.test(id);
const preview: any = {
  pickMode: "photo",
  failClearOnce: false,
  db: {
    async getAllAsync(sql: string, length: number, prefix: string) {
      if (!sql.includes("FROM knowledge_preferences") || !allowedId(prefix))
        throw Error("Preview rejected database read");
      return Object.values(state.rows).filter((r: any) =>
        r.id.startsWith(prefix),
      );
    },
    async getFirstAsync(sql: string, id: string) {
      if (!sql.includes("FROM knowledge_preferences") || !allowedId(id))
        throw Error("Preview rejected database read");
      return state.rows[id] || null;
    },
    async runAsync(sql: string, id: string, value: string, updated_at: string) {
      if (
        !sql.startsWith("INSERT INTO knowledge_preferences") ||
        !allowedId(id)
      )
        throw Error("Preview rejected database write");
      state.rows[id] = { id, value, updated_at };
      persist();
    },
  },
  async transaction(task: (db: unknown) => Promise<unknown>) {
    const before = JSON.stringify(state);
    try {
      return await task(preview.db);
    } catch (error) {
      state = JSON.parse(before);
      persist();
      throw error;
    }
  },
  async readLocal(key: string, fallback: unknown) {
    if (!key.startsWith("view:food."))
      throw Error("Preview rejected preference read");
    return key in state.local ? state.local[key] : fallback;
  },
  async writeLocal(key: string, value: unknown) {
    if (!key.startsWith("view:food."))
      throw Error("Preview rejected preference write");
    if (
      preview.failClearOnce &&
      key === "view:food.phone-photo" &&
      value === null
    ) {
      preview.failClearOnce = false;
      throw Error(
        "Synthetic interrupted acknowledgement; retry the same photo.",
      );
    }
    state.local[key] = value;
    persist();
  },
  rows: () =>
    Object.values(state.rows).map((r: any) => ({
      id: r.id,
      value: JSON.parse(r.value),
    })),
  photo() {
    const canvas = document.createElement("canvas");
    canvas.width = 1600;
    canvas.height = 1200;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#eee6d6";
    ctx.fillRect(0, 0, 1600, 1200);
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(800, 600, 400, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#d8af52";
    ctx.fillRect(540, 400, 280, 260);
    ctx.fillStyle = "#4e9362";
    ctx.fillRect(860, 500, 220, 200);
    return canvas.toDataURL("image/jpeg", 0.9);
  },
  barcode() {
    // Synthetic EAN-13 optical fixture, not a photographed manufacturer label.
    const L = [
      "0001101",
      "0011001",
      "0010011",
      "0111101",
      "0100011",
      "0110001",
      "0101111",
      "0111011",
      "0110111",
      "0001011",
    ];
    const G = [
      "0100111",
      "0110011",
      "0011011",
      "0100001",
      "0011101",
      "0111001",
      "0000101",
      "0010001",
      "0001001",
      "0010111",
    ];
    const R = L.map((v) =>
      v
        .split("")
        .map((x) => (x === "0" ? "1" : "0"))
        .join(""),
    );
    const digits = "3017620422003",
      parity = "LLGGGL";
    let bits = "101";
    for (let i = 1; i < 7; i++)
      bits += (parity[i - 1] === "L" ? L : G)[Number(digits[i])];
    bits += "01010";
    for (let i = 7; i < 13; i++) bits += R[Number(digits[i])];
    bits += "101";
    const canvas = document.createElement("canvas");
    canvas.width = 1000;
    canvas.height = 450;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, 1000, 450);
    ctx.fillStyle = "#000";
    bits.split("").forEach((bit, i) => {
      if (bit === "1") ctx.fillRect(100 + i * 8, 30, 8, 350);
    });
    return Promise.resolve(canvas.toDataURL("image/jpeg", 0.95));
  },
  async picked() {
    const data =
      preview.pickMode === "barcode"
        ? await preview.barcode()
        : preview.photo();
    return {
      canceled: false,
      assets: [
        {
          base64: data.split(",")[1],
          uri: "synthetic:fixture",
          width: 1600,
          height: 1200,
        },
      ],
    };
  },
};
(window as any).__foodPreview = preview;
createRoot(document.getElementById("root")!).render(<FoodDiary />);
