import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Alert,
  AppState,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { FOOD_CODEC_NOTICES } from "@/generated/food-image-codec";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter, type Href } from "expo-router";
import * as Crypto from "expo-crypto";
import * as ImagePicker from "expo-image-picker";
import { Fonts, type AppColors } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useKnowledgePreferences } from "@/hooks/use-knowledge-preferences";
import { useViewState } from "@/hooks/use-view-state";
import { Button, Card, Chip } from "@/components/ui";
import { PeopleSheet } from "@/components/people-ui";
import {
  FoodImageCodec,
  type FoodImageJob,
} from "@/components/food-image-codec";
import {
  localHealthDay,
  healthDayOffset,
  newHealthRecord,
  type FoodEntry,
  type HealthRecord,
} from "@/domain/health";
import {
  DIET_NUTRIENTS,
  DIET_LABELS,
  DIET_SETTINGS_PREFIX,
  DIET_TEMPLATE_PREFIX,
  componentNutrition,
  detailNutrition,
  dietUnit,
  emptyDietNutrition,
  formatNutrition,
  sumComponents,
  type DietNutrient,
  type DietSettings,
  type DietTemplate,
  type FoodComponent,
} from "@/domain/diet";
import { FOOD_CAPTURE_PREFIX, type FoodCapture } from "@/domain/food-capture";
import { saveHealth } from "@/storage/health";
import { saveDietRecord } from "@/storage/diet";
import { saveFoodCapture } from "@/storage/food-capture";
import {
  findReferenceFoods,
  lookupFoodBarcode,
  manualFood,
  validFoodBarcode,
} from "@/services/food-nutrition";
import { flushPendingSaves } from "@/services/save-queue";
import { deviceSyncStatus, syncDevices } from "@/services/device-sync";
import { useApp } from "@/state/app-context";
import { FoodAIConnection } from "@/components/food-ai-connection";
import {
  analyseFoodPhoto,
  cancelFoodAI,
  foodAIStatus,
  type FoodAIStatus,
} from "@/services/food-ai";

const MEALS: FoodEntry["meal"][] = [
  "Breakfast",
  "Lunch",
  "Dinner",
  "Snack",
  "Other",
];
const uid = () => Crypto.randomUUID();
const InputLock = createContext(false);
const componentsOf = (entry: FoodEntry): FoodComponent[] =>
  entry.diet?.components || [
    {
      id: entry.id,
      name: entry.title,
      brand: "",
      amount: 1,
      unit: "serving",
      servingName: "logged portion",
      basisAmount: 1,
      nutrition: { ...emptyDietNutrition(), ...entry.nutrition },
      source: {
        kind: entry.recipeId ? "recipe" : "manual",
        provider: "Earlier log · nutrition for the recorded portion",
      },
    },
  ];
type PhotoDraft = {
  captureId: string;
  createdAt: string;
  photo: string;
  description: string;
  mode: "meal" | "label";
  day: string;
  meal: FoodEntry["meal"];
};
export default function FoodDiary() {
  const colors = useTheme(),
    s = useMemo(() => styles(colors), [colors]),
    router = useRouter();
  const query = useKnowledgePreferences<HealthRecord>("health:"),
    captures = useKnowledgePreferences<FoodCapture>(FOOD_CAPTURE_PREFIX),
    templates = useKnowledgePreferences<DietTemplate>(DIET_TEMPLATE_PREFIX),
    settings = useKnowledgePreferences<DietSettings>(DIET_SETTINGS_PREFIX);
  const { locked } = useApp(),
    lockedRef = useRef(locked);
  lockedRef.current = locked;
  const [aiStatus, setAiStatus] = useState<FoodAIStatus>({
      connected: false,
      model: "openai/gpt-4.1",
      modelName: "GPT4.1",
    }),
    [aiOpen, setAiOpen] = useState(false),
    [analysing, setAnalysing] = useState(false);
  useEffect(() => {
    void foodAIStatus()
      .then(setAiStatus)
      .catch((e) => setError(e.message));
    return () => cancelFoodAI();
  }, []);
  useEffect(() => {
    if (locked) cancelFoodAI();
  }, [locked]);
  const [day, setDay] = useState(localHealthDay()),
    [open, setOpen] = useState(false),
    [photoOpen, setPhotoOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [draft, setDraft, draftReady] = useViewState<FoodEntry | null>(
    "food.phone-draft",
    null,
  );
  const [photoDraft, setPhotoDraft, photoReady] =
    useViewState<PhotoDraft | null>("food.phone-photo", null);
  const [pickIntent, setPickIntent, pickReady] = useViewState<
    "photo" | "barcode"
  >("food.phone-pick-intent", "photo");
  const [job, setJob] = useState<FoodImageJob | null>(null),
    [tab, setTab] = useState<"search" | "barcode" | "manual">("search"),
    [search, setSearch] = useState(""),
    [code, setCode] = useState(""),
    [expanded, setExpanded] = useState<string[]>([]),
    [savedOpen, setSavedOpen] = useState(false),
    [archivedOpen, setArchivedOpen] = useState(false),
    [dataOpen, setDataOpen] = useState(false),
    [licencesOpen, setLicencesOpen] = useState(false);
  const controller = useRef<AbortController | null>(null),
    original = useRef<FoodEntry | null>(null),
    restored = useRef(false);
  useEffect(() => {
    const listener = AppState.addEventListener("change", (state) => {
      if (state !== "active") controller.current?.abort();
    });
    return () => listener.remove();
  }, []);
  useEffect(() => {
    if (locked) controller.current?.abort();
  }, [locked]);
  const all = query.items
    .map((r) => r.value)
    .filter((r): r is FoodEntry => r.kind === "food");
  const logged = all.filter((r) => !r.archived && r.day === day),
    recent = [...all]
      .filter((r) => !r.archived)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .filter((r, i, rows) => rows.findIndex((x) => x.title === r.title) === i)
      .slice(0, 6);
  const total = sumComponents(logged.flatMap(componentsOf)),
    goal = settings.items.find((r) => r.value.id === "personal")?.value.goals
      .calories;
  const pending = captures.items
    .map((r) => r.value)
    .filter((r) => r.status === "pending");
  const results = useMemo(() => findReferenceFoods(search), [search]);
  useFocusEffect(
    useCallback(() => {
      void query.reload();
      void captures.reload();
      void templates.reload();
      return () => controller.current?.abort();
    }, [query.reload, captures.reload, templates.reload]),
  );
  useEffect(() => {
    if (draftReady && photoReady && !restored.current) {
      restored.current = true;
      if (photoDraft) setPhotoOpen(true);
      else if (draft) setOpen(true);
    }
  }, [draftReady, photoReady, draft, photoDraft]);
  function food(components: FoodComponent[], entry?: FoodEntry) {
    const next = entry || (newHealthRecord("food", uid(), day) as FoodEntry);
    return {
      ...next,
      title: components
        .map((c) => c.name)
        .join(" + ")
        .slice(0, 300),
      portion: components
        .map(
          (c) =>
            `${formatNutrition(c.amount)} ${c.unit === "serving" ? c.servingName || "serving" : c.unit}`,
        )
        .join(" · ")
        .slice(0, 300),
      diet: { version: 1 as const, components },
      nutrition: detailNutrition({ version: 1, components }),
    };
  }
  function begin(components: FoodComponent[] = []) {
    setError("");
    setTab("search");
    setSearch("");
    if (draft) {
      setOpen(true);
      setNotice("Your unfinished food is kept. Finish or discard it first.");
      return;
    }
    original.current = null;
    setDraft(food(components));
    setExpanded(
      components.filter((c) => c.source.kind !== "database").map((c) => c.id),
    );
    setOpen(true);
  }
  function edit(entry: FoodEntry) {
    if (draft && draft.id !== entry.id) {
      setError("Finish or discard the current food first.");
      setOpen(true);
      return;
    }
    const next = {
      ...entry,
      diet: { version: 1 as const, components: componentsOf(entry) },
    };
    original.current = next;
    setDraft(next);
    setTab("search");
    setOpen(true);
  }
  function close() {
    if (busy) return;
    if (
      draft?.updatedAt &&
      original.current &&
      JSON.stringify(original.current) === JSON.stringify(draft)
    )
      setDraft(null);
    setOpen(false);
    controller.current?.abort();
  }
  function patch(
    c: FoodComponent,
    values: Partial<FoodComponent>,
    changedNutrition = false,
  ) {
    if (!draft || busy) return;
    const items = (draft.diet?.components || componentsOf(draft)).map((x) =>
      x.id === c.id
        ? {
            ...x,
            ...values,
            ...(changedNutrition
              ? {
                  source: {
                    ...x.source,
                    kind:
                      x.source.kind === "estimate"
                        ? ("estimate" as const)
                        : ("manual" as const),
                    provider: (
                      "Edited · " +
                      x.source.provider.replace(/^(?:Edited · )+/, "")
                    ).slice(0, 300),
                  },
                }
              : {}),
          }
        : x,
    );
    const next = food(items, draft);
    setDraft({
      ...next,
      title:
        draft.title ===
          (draft.diet?.components || componentsOf(draft))
            .map((x) => x.name)
            .join(" + ")
            .slice(0, 300) || !draft.title
          ? next.title
          : draft.title,
    });
  }
  function append(c: FoodComponent) {
    if (!draft || busy) return;
    const items = draft.diet?.components || componentsOf(draft);
    if (items.length >= 40) {
      setError("A meal can contain up to 40 foods.");
      return;
    }
    const next = { ...c, id: uid() };
    setDraft(food([...items, next], draft));
    setSearch("");
    if (c.source.kind !== "database") setExpanded((old) => [...old, next.id]);
  }
  async function save() {
    if (!draft || busy) return;
    setBusy(true);
    setError("");
    try {
      await flushPendingSaves();
      await saveHealth(draft);
      setDraft(null);
      await flushPendingSaves();
      setOpen(false);
      await query.reload();
      setNotice("Food saved.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function barcode(value = code) {
    if (busy || lockedRef.current || AppState.currentState !== "active") return;
    controller.current?.abort();
    const next = new AbortController();
    controller.current = next;
    const timer = setTimeout(() => next.abort(), 15000);
    setBusy(true);
    setError("");
    try {
      const c = await lookupFoodBarcode(value, next.signal);
      if (
        next.signal.aborted ||
        lockedRef.current ||
        AppState.currentState !== "active"
      )
        return;
      if (draft) {
        const items = draft.diet?.components || componentsOf(draft);
        if (items.length >= 40)
          throw Error("A meal can contain up to 40 foods.");
        setDraft(food([...items, c], draft));
      } else {
        original.current = null;
        setDraft(food([c]));
      }
      setExpanded((old) => [...old, c.id]);
      setOpen(true);
      setTab("barcode");
      setCode(value);
    } catch (e) {
      if (!next.signal.aborted) setError((e as Error).message);
      else setError("The lookup stopped. Type the pack label or try again.");
    } finally {
      clearTimeout(timer);
      setBusy(false);
    }
  }
  async function consumePicked(
    result: ImagePicker.ImagePickerResult,
    mode: "photo" | "barcode",
  ) {
    if (result.canceled) return;
    const asset = result.assets[0];
    if (
      !asset.base64 ||
      asset.base64.length > 28 * 1024 * 1024 ||
      asset.width * asset.height > 60000000
    ) {
      setError("Choose a food photo under 20 MB.");
      return;
    }
    setJob({
      id: uid(),
      mode,
      photo: "data:image/jpeg;base64," + asset.base64,
    });
  }
  async function pick(mode: "photo" | "barcode", camera: boolean) {
    if (busy || analysing || job || !photoReady || !pickReady) return;
    if (mode === "photo" && photoDraft) {
      setPhotoOpen(true);
      return;
    }
    if (
      mode === "barcode" &&
      draft &&
      (draft.updatedAt || draft.diet?.components.length)
    ) {
      setOpen(true);
      setError(
        "Finish or discard your current food before scanning another pack.",
      );
      return;
    }
    setPickIntent(mode);
    setError("");
    await flushPendingSaves();
    try {
      if (camera) {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          setError(
            "Camera access is off. Allow it in Android settings, or choose a photo.",
          );
          return;
        }
      }
      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ["images"],
        base64: true,
        exif: false,
        quality: 0.85,
        allowsEditing: false,
      };
      await consumePicked(
        camera
          ? await ImagePicker.launchCameraAsync(options)
          : await ImagePicker.launchImageLibraryAsync(options),
        mode,
      );
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    if (!photoReady || !pickReady) return;
    void ImagePicker.getPendingResultAsync()
      .then((result) => {
        if (result && "canceled" in result)
          void consumePicked(result, pickIntent);
      })
      .catch(() => {});
  }, [photoReady, pickReady]);
  const codecComplete = useCallback(
    (result: { photo?: string; code?: string; error?: string }) => {
      setJob(null);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.photo) {
        setPhotoDraft({
          captureId: uid(),
          createdAt: new Date().toISOString(),
          photo: result.photo,
          description: "",
          mode: "meal",
          day,
          meal: "Snack",
        });
        setPhotoOpen(true);
      }
      if (result.code) {
        if (!validFoodBarcode(result.code)) {
          setError(
            "The printed barcode was not read completely. Please type it.",
          );
          return;
        }
        void barcode(result.code);
      }
    },
    [day, setPhotoDraft, draft, busy],
  );
  async function analysePhoto() {
    if (!photoDraft || analysing || busy) return;
    if (draft) {
      setError(
        "Finish or discard your unfinished food before analysing a new photo.",
      );
      return;
    }
    setAnalysing(true);
    setError("");
    try {
      const result = await analyseFoodPhoto(
        {
          approved: true,
          photo: photoDraft.photo,
          text: photoDraft.description,
          mode: photoDraft.mode,
        },
        () => !lockedRef.current,
      );
      const next = food(result.foods);
      next.day = photoDraft.day;
      next.meal = photoDraft.meal;
      next.notes = result.notes;
      original.current = null;
      setDraft(next);
      setExpanded(result.foods.map((c) => c.id));
      await flushPendingSaves();
      setPhotoDraft(null);
      await flushPendingSaves();
      setPhotoOpen(false);
      setOpen(true);
      setNotice(
        "Estimate ready. Check every amount, source and nutrient before saving.",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setAnalysing(false);
    }
  }
  async function queuePhoto() {
    if (!photoDraft || busy) return;
    setBusy(true);
    setError("");
    try {
      // A durable identity makes retry after an interrupted acknowledgement safe.
      const stable = photoDraft.captureId
        ? photoDraft
        : {
            ...photoDraft,
            captureId: uid(),
            createdAt: new Date().toISOString(),
          };
      setPhotoDraft(stable);
      await flushPendingSaves();
      await saveFoodCapture({
        version: 1,
        id: stable.captureId,
        createdAt: stable.createdAt,
        updatedAt: stable.createdAt,
        day: photoDraft.day,
        meal: photoDraft.meal,
        mode: photoDraft.mode,
        description: photoDraft.description,
        photo: photoDraft.photo,
        status: "pending",
      });
      setPhotoDraft(null);
      await flushPendingSaves();
      setPhotoOpen(false);
      await captures.reload();
      setNotice(
        "Photo saved privately. Review it in Food diary on your Mac after sync.",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function archive(entry: FoodEntry) {
    setBusy(true);
    setError("");
    try {
      await saveHealth({ ...entry, archived: !entry.archived });
      await query.reload();
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function repeat(entry: FoodEntry) {
    if (draft) {
      begin();
      return;
    }
    original.current = null;
    setDraft(food(componentsOf(entry).map((c) => ({ ...c, id: uid() }))));
    setOpen(true);
  }
  const bodyError = error || query.error || captures.error;
  return (
    <InputLock.Provider value={busy || analysing}>
      <SafeAreaView edges={["top"]} style={s.safe}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={s.content}
        >
          <View style={s.between}>
            <View>
              <Text style={s.eyebrow}>HEALTH</Text>
              <Text style={s.title}>Food diary</Text>
            </View>
            <Button
              label="Settings"
              variant="quiet"
              onPress={() => router.push("/settings")}
            />
          </View>
          <View style={s.between}>
            <Button
              label="Previous day"
              variant="quiet"
              onPress={() => setDay(healthDayOffset(day, -1))}
            />
            <Text style={s.day}>
              {day === localHealthDay() ? "Today" : day}
            </Text>
            <Button
              label="Next day"
              variant="quiet"
              disabled={day >= localHealthDay()}
              onPress={() => setDay(healthDayOffset(day, 1))}
            />
          </View>
          <View style={s.hero}>
            <Text style={s.eyebrow}>
              {logged.length ? "RECORDED ENERGY" : "YOUR DAY, AT A GLANCE"}
            </Text>
            <Text style={s.energy}>
              {formatNutrition(total.calories.total)}
              <Text style={s.energyUnit}> kcal</Text>
            </Text>
            <Text style={s.muted}>
              {goal
                ? `of ${formatNutrition(goal)} kcal goal`
                : "No target needed. Start with what you ate."}
              {total.calories.supplied < total.calories.entries
                ? " · partial total"
                : ""}
            </Text>
            <View style={s.macroRow}>
              {(["protein", "carbs", "fat"] as const).map((k) => (
                <View key={k} style={s.macro}>
                  <Text style={s.macroValue}>
                    {formatNutrition(total[k].total)}
                    <Text style={s.small}> g</Text>
                  </Text>
                  <Text style={s.small}>
                    {DIET_LABELS[k]}
                    {total[k].supplied < total[k].entries ? " · partial" : ""}
                  </Text>
                </View>
              ))}
            </View>
          </View>
          <View style={s.actions}>
            <Button
              label="Take food photo"
              onPress={() => void pick("photo", true)}
              disabled={busy || !!job}
            />
            <View style={s.two}>
              <Button
                label="Scan barcode"
                variant="secondary"
                onPress={() => void pick("barcode", true)}
                disabled={busy || !!job}
              />
              <Button
                label="Add food"
                variant="secondary"
                onPress={() => begin()}
                disabled={!draftReady || busy}
              />
            </View>
            <Text style={s.small}>
              Barcode lookup sends only the code to Open Food Facts. Food photos
              stay private until you choose review.
            </Text>
          </View>
          {job ? (
            <Text accessibilityRole="alert" style={s.muted}>
              Reading your photo on this phone…
            </Text>
          ) : null}
          {bodyError ? (
            <Card>
              <Text accessibilityRole="alert" style={s.error}>
                {bodyError}
              </Text>
            </Card>
          ) : null}
          {notice ? (
            <Text accessibilityRole="alert" style={s.muted}>
              {notice}
            </Text>
          ) : null}
          {photoDraft && !photoOpen ? (
            <Button
              label="Continue food photo"
              variant="secondary"
              onPress={() => setPhotoOpen(true)}
            />
          ) : null}
          {draft && !open ? (
            <Button
              label="Continue unfinished food"
              variant="secondary"
              onPress={() => setOpen(true)}
            />
          ) : null}
          <View style={s.between}>
            <Text style={s.section}>Your meals</Text>
            <Button
              label="Saved meals"
              variant="quiet"
              onPress={() => setSavedOpen(true)}
            />
          </View>
          {!logged.length ? (
            <Card>
              <Text style={s.section}>What did you eat today?</Text>
              <Text style={s.muted}>
                A photo, a pack barcode or a familiar food is enough to start.
                Check portions before saving.
              </Text>
              <Button
                label="Choose food photo"
                variant="quiet"
                onPress={() => void pick("photo", false)}
              />
            </Card>
          ) : (
            MEALS.filter((m) => logged.some((r) => r.meal === m)).map(
              (meal) => (
                <View key={meal} style={s.group}>
                  <Text style={s.meal}>{meal}</Text>
                  {logged
                    .filter((r) => r.meal === meal)
                    .map((entry) => (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Edit ${entry.title}`}
                        key={entry.id}
                        style={s.foodRow}
                        onPress={() => edit(entry)}
                      >
                        <View style={s.flex}>
                          <Text style={s.foodName}>{entry.title}</Text>
                          <Text style={s.small}>{entry.portion}</Text>
                          <Text style={s.small}>
                            {componentsOf(entry).some(
                              (c) => c.source.kind === "estimate",
                            )
                              ? "Estimate · review portions"
                              : componentsOf(entry)
                                  .map((c) => c.source.provider)
                                  .filter((v, i, a) => a.indexOf(v) === i)
                                  .join(" · ")}
                          </Text>
                        </View>
                        <Text style={s.foodEnergy}>
                          {formatNutrition(entry.nutrition.calories)}
                          <Text style={s.small}>
                            {" "}
                            kcal
                            {sumComponents(componentsOf(entry)).calories
                              .supplied < componentsOf(entry).length
                              ? " · partial"
                              : ""}
                          </Text>
                        </Text>
                      </Pressable>
                    ))}
                </View>
              ),
            )
          )}
          {!!recent.length && (
            <View style={s.group}>
              <Text style={s.section}>Again, with less effort</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.chips}
              >
                {recent.map((entry) => (
                  <Pressable
                    key={entry.id}
                    accessibilityRole="button"
                    accessibilityLabel={`Repeat ${entry.title}`}
                    style={s.repeat}
                    onPress={() => void repeat(entry)}
                  >
                    <Text style={s.foodName}>{entry.title}</Text>
                    <Text style={s.small}>{entry.portion} · add again</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}
          {!!pending.length && (
            <Card>
              <Text style={s.section}>
                {pending.length} photo{pending.length === 1 ? "" : "s"} waiting
                for review
              </Text>
              <Text style={s.muted}>
                Saved on this phone even offline. After Phone & Mac sync, open
                Food diary on your Mac to review amounts and save. These photos
                are not counted as food yet.
              </Text>
              {pending.map((c) => (
                <View key={c.id} style={s.between}>
                  <Image source={{ uri: c.photo! }} style={s.thumb} />
                  <View style={s.flex}>
                    <Text style={s.foodName}>
                      {c.mode === "label" ? "Pack label" : "Meal photo"}
                    </Text>
                    <Text style={s.small}>
                      {c.day} · {c.meal}
                    </Text>
                    <Text numberOfLines={2} style={s.small}>
                      {c.description || "No description"}
                    </Text>
                  </View>
                  <Button
                    label="Discard"
                    variant="quiet"
                    disabled={busy}
                    onPress={() =>
                      Alert.alert(
                        "Discard this photo?",
                        "It will be removed from the capture queue after sync. Your logged foods stay saved.",
                        [
                          { text: "Keep", style: "cancel" },
                          {
                            text: "Discard",
                            style: "destructive",
                            onPress: () =>
                              void saveFoodCapture({
                                ...c,
                                status: "discarded",
                                photo: null,
                              })
                                .then(captures.reload)
                                .catch((e) => setError(e.message)),
                          },
                        ],
                      )
                    }
                  />
                </View>
              ))}
              <Button
                label="Sync now"
                variant="secondary"
                onPress={() => {
                  if (!deviceSyncStatus().enabled) {
                    router.push("/settings");
                    return;
                  }
                  setBusy(true);
                  void flushPendingSaves()
                    .then(() => syncDevices())
                    .then(() =>
                      setNotice("Sync finished. Open Food diary on your Mac."),
                    )
                    .catch((e) => setError(e.message))
                    .finally(() => setBusy(false));
                }}
                disabled={busy}
              />
            </Card>
          )}
          <Button
            label="Food data and photo privacy"
            variant="quiet"
            onPress={() => setDataOpen(true)}
          />
          <Button
            label={archivedOpen ? "Hide archived foods" : "Show archived foods"}
            variant="quiet"
            onPress={() => setArchivedOpen(!archivedOpen)}
          />
          {archivedOpen &&
            all
              .filter((r) => r.archived)
              .map((entry) => (
                <View key={entry.id} style={s.between}>
                  <Text style={s.foodName}>{entry.title}</Text>
                  <Button
                    label="Restore"
                    variant="quiet"
                    disabled={busy}
                    onPress={() => void archive(entry)}
                  />
                </View>
              ))}
        </ScrollView>
      </SafeAreaView>
      <PeopleSheet
        visible={open && !!draft}
        title={draft?.updatedAt ? "Edit food" : "What did you eat?"}
        onDismiss={close}
        footer={
          <View style={s.footer}>
            <Button
              label="Discard draft"
              variant="quiet"
              disabled={busy}
              onPress={() => {
                setDraft(null);
                void flushPendingSaves()
                  .then(() => setOpen(false))
                  .catch((e) => setError(e.message));
              }}
            />
            <Button
              label="Save food"
              onPress={() => void save()}
              busy={busy}
              disabled={busy || !draft?.diet?.components.length}
            />
          </View>
        }
      >
        {draft && (
          <>
            {error ? (
              <Text accessibilityRole="alert" style={s.error}>
                {error}
              </Text>
            ) : null}
            <View style={s.chips}>
              {MEALS.map((m) => (
                <Chip
                  key={m}
                  label={m}
                  selected={draft.meal === m}
                  onPress={() => {
                    if (!busy) setDraft({ ...draft, meal: m });
                  }}
                />
              ))}
            </View>
            <Field
              label="Food date"
              value={draft.day}
              onChange={(value) => setDraft({ ...draft, day: value })}
            />
            <View style={s.chips}>
              {(["search", "barcode", "manual"] as const).map((t) => (
                <Chip
                  key={t}
                  label={
                    t === "search"
                      ? "Search"
                      : t === "barcode"
                        ? "Barcode"
                        : "Manual"
                  }
                  selected={tab === t}
                  onPress={() => setTab(t)}
                />
              ))}
            </View>
            {tab === "search" ? (
              <>
                <Field
                  label="Find a food"
                  value={search}
                  onChange={setSearch}
                  placeholder="Eggs, cooked rice, banana…"
                />
                {search.trim().length >= 2 ? (
                  <>
                    <Text style={s.small}>
                      USDA reference foods · choose the exact raw or cooked
                      version
                    </Text>
                    {results.map((c) => (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Add ${c.name}`}
                        key={c.source.recordId}
                        style={s.foodRow}
                        onPress={() => append(c)}
                      >
                        <View style={s.flex}>
                          <Text style={s.foodName}>{c.name}</Text>
                          <Text style={s.small}>
                            {formatNutrition(c.nutrition.calories)} kcal per 100
                            g
                          </Text>
                        </View>
                        <Text style={s.plus}>＋</Text>
                      </Pressable>
                    ))}
                    {!results.length ? (
                      <Text style={s.muted}>
                        Try another food name, barcode or manual entry.
                      </Text>
                    ) : null}
                  </>
                ) : null}
              </>
            ) : tab === "barcode" ? (
              <>
                <Field
                  label="Barcode number"
                  value={code}
                  onChange={setCode}
                  numeric
                />
                <Text style={s.small}>
                  Look up sends only this barcode to Open Food Facts. Match the
                  product and check your current label.
                </Text>
                <Button
                  label="Look up barcode"
                  variant="secondary"
                  busy={busy}
                  disabled={busy}
                  onPress={() => void barcode()}
                />
                <Button
                  label="Read barcode photo"
                  variant="quiet"
                  disabled={busy}
                  onPress={() => {
                    if (draft?.diet?.components.length) {
                      setError(
                        "Save or discard this food before scanning a different pack.",
                      );
                      return;
                    }
                    setDraft(null);
                    setOpen(false);
                    void pick("barcode", false);
                  }}
                />
              </>
            ) : (
              <Button
                label="Enter food manually"
                variant="secondary"
                disabled={busy}
                onPress={() => {
                  const c = manualFood();
                  setDraft(food([...(draft.diet?.components || []), c], draft));
                  setExpanded((old) => [...old, c.id]);
                }}
              />
            )}
            {(draft.diet?.components || []).map((c) => (
              <Card key={c.id}>
                <Field
                  label="Food name"
                  value={c.name}
                  onChange={(name) => patch(c, { name })}
                />
                <Text style={s.small}>
                  {c.brand ? c.brand + " · " : ""}
                  {c.source.kind === "estimate" ? "Estimate · " : ""}
                  {c.source.provider}
                </Text>
                <View style={s.two}>
                  <View style={s.flex}>
                    <Field
                      label={`Amount of ${c.name || "food"}`}
                      value={String(c.amount)}
                      numeric
                      onChange={(value) => patch(c, { amount: Number(value) })}
                    />
                  </View>
                  <View style={s.unit}>
                    <Text style={s.foodName}>
                      {c.unit === "serving"
                        ? c.servingName || "serving"
                        : c.unit}
                    </Text>
                  </View>
                </View>
                {c.unitNeedsReview ? (
                  <>
                    <Text accessibilityRole="alert" style={s.error}>
                      Check whether your pack declares nutrition per 100 g or
                      100 ml.
                    </Text>
                    <View style={s.two}>
                      <Button
                        label="Per 100 g"
                        variant="secondary"
                        onPress={() =>
                          patch(c, {
                            unit: "g",
                            basisAmount: 100,
                            unitNeedsReview: undefined,
                          })
                        }
                      />
                      <Button
                        label="Per 100 ml"
                        variant="secondary"
                        onPress={() =>
                          patch(c, {
                            unit: "ml",
                            basisAmount: 100,
                            unitNeedsReview: undefined,
                          })
                        }
                      />
                    </View>
                  </>
                ) : null}
                <Text style={s.foodEnergy}>
                  {formatNutrition(componentNutrition(c).calories)} kcal for
                  this amount
                </Text>
                <Button
                  label={
                    expanded.includes(c.id)
                      ? "Hide nutrient details"
                      : "Review nutrient details"
                  }
                  variant="quiet"
                  onPress={() =>
                    setExpanded((old) =>
                      old.includes(c.id)
                        ? old.filter((x) => x !== c.id)
                        : [...old, c.id],
                    )
                  }
                />
                {expanded.includes(c.id) && (
                  <>
                    <Field
                      label="Nutrition reference amount"
                      value={String(c.basisAmount)}
                      numeric
                      onChange={(value) =>
                        patch(c, { basisAmount: Number(value) }, true)
                      }
                    />
                    <View style={s.chips}>
                      {(["g", "ml", "serving"] as const).map((unit) => (
                        <Chip
                          key={unit}
                          label={unit}
                          selected={c.unit === unit}
                          onPress={() => {
                            if (unit === c.unit || busy) return;
                            patch(
                              c,
                              {
                                unit,
                                nutrition: emptyDietNutrition(),
                                basisAmount: unit === "serving" ? 1 : 100,
                                portions: undefined,
                                servingName:
                                  unit === "serving" ? "serving" : undefined,
                                unitNeedsReview: undefined,
                              },
                              true,
                            );
                            setNotice(
                              "Reference unit changed. Enter values from the new label or reference; no density conversion was assumed.",
                            );
                          }}
                        />
                      ))}
                    </View>
                    <Text style={s.small}>
                      Values below are for {c.basisAmount} {c.unit}. Blank means
                      unknown. Changing a unit clears the old values; enter the
                      matching new reference.
                    </Text>
                    <View style={s.nutrients}>
                      {DIET_NUTRIENTS.map((k) => (
                        <View key={k} style={s.nutrient}>
                          <Field
                            label={`${DIET_LABELS[k]} (${dietUnit(k)})`}
                            value={
                              c.nutrition[k] === null
                                ? ""
                                : String(c.nutrition[k])
                            }
                            numeric
                            onChange={(value) =>
                              patch(
                                c,
                                {
                                  nutrition: {
                                    ...c.nutrition,
                                    [k]: value.trim() ? Number(value) : null,
                                  },
                                },
                                true,
                              )
                            }
                          />
                        </View>
                      ))}
                    </View>
                  </>
                )}
                <Button
                  label={`Remove ${c.name || "food"}`}
                  variant="quiet"
                  disabled={busy}
                  onPress={() =>
                    setDraft(
                      food(
                        (draft.diet?.components || []).filter(
                          (x) => x.id !== c.id,
                        ),
                        draft,
                      ),
                    )
                  }
                />
              </Card>
            ))}
            <Field
              label="Food notes"
              value={draft.notes}
              onChange={(notes) => setDraft({ ...draft, notes })}
              multiline
            />
            {draft.updatedAt ? (
              <>
                <Button
                  label="Save meal for next time"
                  variant="secondary"
                  disabled={busy}
                  onPress={() => {
                    setBusy(true);
                    void saveDietRecord({
                      version: 1,
                      id: uid(),
                      updatedAt: "",
                      title: draft.title,
                      components: componentsOf(draft),
                      archived: false,
                    })
                      .then(templates.reload)
                      .then(() => setNotice("Meal saved for next time."))
                      .catch((e) => setError(e.message))
                      .finally(() => setBusy(false));
                  }}
                />
                <Button
                  label="Archive food"
                  variant="quiet"
                  disabled={busy}
                  onPress={() =>
                    void archive(draft).then((saved) => {
                      if (saved) {
                        setDraft(null);
                        void flushPendingSaves()
                          .then(() => setOpen(false))
                          .catch((e) => setError(e.message));
                      }
                    })
                  }
                />
              </>
            ) : null}
          </>
        )}
      </PeopleSheet>
      <PeopleSheet
        visible={photoOpen && !!photoDraft}
        title="Review your food photo"
        subtitle="Private on this phone"
        onDismiss={() => {
          if (!busy && !analysing) setPhotoOpen(false);
        }}
        footer={
          <View
            style={[
              s.footer,
              {
                flexDirection: "column",
                flexWrap: "nowrap",
                alignItems: "stretch",
              },
            ]}
          >
            <Button
              label="Discard photo"
              variant="quiet"
              disabled={busy || analysing}
              onPress={() => {
                setPhotoDraft(null);
                void flushPendingSaves()
                  .then(() => setPhotoOpen(false))
                  .catch((e) => setError(e.message));
              }}
            />
            <Button
              label="Save for Mac review"
              busy={busy}
              disabled={busy || analysing}
              onPress={() => void queuePhoto()}
            />
          </View>
        }
      >
        {photoDraft && (
          <>
            <Image source={{ uri: photoDraft.photo }} style={s.photo} />
            <View style={s.chips}>
              {(["meal", "label"] as const).map((mode) => (
                <Chip
                  key={mode}
                  label={mode === "meal" ? "Meal photo" : "Pack label"}
                  selected={photoDraft.mode === mode}
                  onPress={() => {
                    if (!busy && !analysing)
                      setPhotoDraft({ ...photoDraft, mode });
                  }}
                />
              ))}
            </View>
            <Field
              label="Meal description"
              value={photoDraft.description}
              onChange={(description) =>
                setPhotoDraft({
                  ...photoDraft,
                  description: description.slice(0, 8000),
                })
              }
              placeholder="Include portions, oil and sauces…"
              multiline
            />
            <View style={s.chips}>
              {MEALS.map((meal) => (
                <Chip
                  key={meal}
                  label={meal}
                  selected={photoDraft.meal === meal}
                  onPress={() => {
                    if (!busy && !analysing)
                      setPhotoDraft({ ...photoDraft, meal });
                  }}
                />
              ))}
            </View>
            <Card>
              <Text style={s.section}>
                {aiStatus.connected
                  ? aiStatus.modelName
                  : "Analyse on this phone"}
              </Text>
              <Text style={s.muted}>
                {aiStatus.connected
                  ? "Analyse sends this selected photo and description to OpenRouter and your chosen model. It identifies foods, then matches them to public USDA references in a second request. Pack labels are transcribed for review. Nothing is logged until you save."
                  : "Connect your own OpenRouter account for immediate food-photo estimates. No Mac key is copied to this phone."}
              </Text>
              <Button
                label={
                  aiStatus.connected
                    ? "Analyse with OpenRouter"
                    : "Connect food photo AI"
                }
                busy={analysing}
                disabled={busy || analysing}
                onPress={() => {
                  if (aiStatus.connected) void analysePhoto();
                  else {
                    setPhotoOpen(false);
                    setAiOpen(true);
                  }
                }}
              />
              {analysing ? (
                <Button
                  label="Stop analysis"
                  variant="quiet"
                  onPress={cancelFoodAI}
                />
              ) : null}
              {aiStatus.connected ? (
                <Button
                  label="Food photo AI settings"
                  variant="quiet"
                  disabled={analysing}
                  onPress={() => {
                    setPhotoOpen(false);
                    setAiOpen(true);
                  }}
                />
              ) : null}
            </Card>
            <Text style={s.muted}>
              This photo can also be saved in your encrypted capture queue, even
              offline. After sync, review it in Food diary on your Mac. Saving a
              photo does not count as logging a meal.
            </Text>
            <Text style={s.small}>
              Photos cannot reliably reveal hidden oil or exact weight. Weighed
              portions and your pack label are the best checks.
            </Text>
            {error ? (
              <Text accessibilityRole="alert" style={s.error}>
                {error}
              </Text>
            ) : null}
          </>
        )}
      </PeopleSheet>
      <PeopleSheet
        visible={dataOpen}
        title="Food data and photo privacy"
        onDismiss={() => setDataOpen(false)}
      >
        <Text style={s.muted}>
          Reference foods use USDA FoodData Central SR Legacy (2018),
          public-domain US government data. It provides average values for 7,793
          foods; your brand, recipe and portion may differ.
        </Text>
        <Text style={s.muted}>
          Pack lookups use Open Food Facts (Open Database Licence). Match the
          barcode, current product and whether the label is per 100 g or 100 ml
          before saving. A blank nutrient means unknown.
        </Text>
        <Text style={s.muted}>
          Selected photos are processed locally to remove metadata. Android's
          camera or picker may create a temporary app-cache image. Retained
          drafts and the review queue use your encrypted vault; your original
          gallery photos stay where they are. Only Analyse sends the selected
          image and description to OpenRouter and its model provider. Phone &
          Mac sync encrypts the queue.
        </Text>
        <Button
          label={
            licencesOpen ? "Hide barcode licences" : "Barcode reader licences"
          }
          variant="quiet"
          onPress={() => setLicencesOpen(!licencesOpen)}
        />
        {licencesOpen ? (
          <Text selectable style={s.small}>
            {FOOD_CODEC_NOTICES}
          </Text>
        ) : null}
      </PeopleSheet>
      <PeopleSheet
        visible={savedOpen}
        title="Saved meals"
        onDismiss={() => setSavedOpen(false)}
      >
        {templates.items
          .map((r) => r.value)
          .filter((t) => !t.archived)
          .map((t) => (
            <Card key={t.id}>
              <Text style={s.section}>{t.title}</Text>
              <Text style={s.small}>
                {t.components.length} food{t.components.length === 1 ? "" : "s"}
              </Text>
              <Button
                label={`Add ${t.title} to diary`}
                onPress={() => {
                  setSavedOpen(false);
                  begin(t.components.map((c) => ({ ...c, id: uid() })));
                }}
              />
            </Card>
          ))}
      </PeopleSheet>
      {aiOpen ? (
        <FoodAIConnection
          visible
          status={aiStatus}
          changed={setAiStatus}
          close={() => {
            setAiOpen(false);
            if (photoDraft) setPhotoOpen(true);
          }}
        />
      ) : null}
      {job ? <FoodImageCodec job={job} complete={codecComplete} /> : null}
    </InputLock.Provider>
  );
}
function Field({
  label,
  value,
  onChange,
  numeric,
  multiline,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  numeric?: boolean;
  multiline?: boolean;
  placeholder?: string;
}) {
  const c = useTheme(),
    s = useMemo(() => styles(c), [c]),
    locked = useContext(InputLock);
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        editable={!locked}
        accessibilityLabel={label}
        value={value}
        onChangeText={onChange}
        keyboardType={numeric ? "decimal-pad" : "default"}
        multiline={multiline}
        placeholder={placeholder}
        placeholderTextColor={c.textSecondary}
        style={[s.input, multiline && s.textarea]}
      />
    </View>
  );
}
const styles = (c: AppColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    content: {
      paddingHorizontal: 22,
      paddingTop: 12,
      paddingBottom: 110,
      gap: 22,
    },
    between: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
    },
    flex: { flex: 1, minWidth: 0 },
    eyebrow: {
      fontFamily: Fonts.bold,
      fontSize: 10,
      letterSpacing: 1.7,
      color: c.accent,
    },
    title: {
      fontFamily: Fonts.bold,
      fontSize: 32,
      color: c.text,
      letterSpacing: -1,
    },
    day: { fontFamily: Fonts.semibold, fontSize: 16, color: c.text },
    hero: {
      padding: 25,
      borderRadius: 26,
      backgroundColor: c.backgroundElement,
      gap: 9,
      borderWidth: 1,
      borderColor: c.line,
    },
    energy: {
      fontFamily: Fonts.bold,
      fontSize: 55,
      letterSpacing: -2,
      color: c.text,
    },
    energyUnit: {
      fontFamily: Fonts.sans,
      fontSize: 19,
      letterSpacing: 0,
      color: c.textSecondary,
    },
    muted: {
      fontFamily: Fonts.sans,
      fontSize: 14,
      lineHeight: 21,
      color: c.textSecondary,
    },
    small: {
      fontFamily: Fonts.sans,
      fontSize: 12,
      lineHeight: 18,
      color: c.textSecondary,
    },
    macroRow: {
      flexDirection: "row",
      gap: 8,
      paddingTop: 14,
      borderTopWidth: 1,
      borderColor: c.line,
      marginTop: 8,
    },
    macro: { flex: 1, gap: 3 },
    macroValue: { fontFamily: Fonts.semibold, fontSize: 19, color: c.text },
    actions: { gap: 10 },
    two: { flexDirection: "row", gap: 10, alignItems: "center" },
    section: { fontFamily: Fonts.semibold, fontSize: 20, color: c.text },
    group: { gap: 10 },
    meal: {
      fontFamily: Fonts.bold,
      fontSize: 11,
      letterSpacing: 1.5,
      color: c.textSecondary,
      textTransform: "uppercase",
    },
    foodRow: {
      flexDirection: "row",
      gap: 15,
      alignItems: "center",
      paddingVertical: 15,
      borderBottomWidth: 1,
      borderColor: c.line,
    },
    foodName: {
      fontFamily: Fonts.semibold,
      fontSize: 15,
      lineHeight: 22,
      color: c.text,
    },
    foodEnergy: { fontFamily: Fonts.bold, fontSize: 16, color: c.text },
    chips: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
    repeat: {
      backgroundColor: c.backgroundElement,
      padding: 15,
      borderRadius: 15,
      minWidth: 140,
      maxWidth: 220,
      gap: 5,
      borderWidth: 1,
      borderColor: c.line,
    },
    error: {
      fontFamily: Fonts.sans,
      fontSize: 14,
      lineHeight: 22,
      color: c.danger,
    },
    thumb: { width: 45, height: 45, borderRadius: 10 },
    photo: {
      width: "100%",
      height: 245,
      borderRadius: 20,
      resizeMode: "cover",
    },
    footer: {
      padding: 16,
      gap: 10,
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      backgroundColor: c.backgroundElement,
    },
    field: { gap: 6, marginVertical: 5 },
    label: { fontFamily: Fonts.semibold, fontSize: 12, color: c.textSecondary },
    input: {
      color: c.text,
      backgroundColor: c.backgroundElement,
      fontFamily: Fonts.sans,
      fontSize: 16,
      paddingHorizontal: 13,
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.line,
      minHeight: 48,
    },
    textarea: { minHeight: 90, textAlignVertical: "top" },
    unit: { paddingTop: 20, minWidth: 40 },
    nutrients: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
    nutrient: { width: "47%" },
    plus: { fontSize: 25, color: c.accent },
  });
