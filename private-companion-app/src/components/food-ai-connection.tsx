import { useState } from "react";
import { Text, TextInput, View } from "react-native";
import { Button } from "@/components/ui";
import { FoodSheet } from "@/components/food-sheet";
import { useTheme } from "@/hooks/use-theme";
import {
  configureFoodAI,
  disconnectFoodAI,
  type FoodAIStatus,
} from "@/services/food-ai";
export function FoodAIConnection({
  visible,
  status,
  close,
  changed,
}: {
  visible: boolean;
  status: FoodAIStatus;
  close: () => void;
  changed: (status: FoodAIStatus) => void;
}) {
  const c = useTheme(),
    [key, setKey] = useState(""),
    [model, setModel] = useState(status.model),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <FoodSheet
      visible={visible}
      title="Food photo AI"
      subtitle="Optional · just this phone"
      onDismiss={() => {
        if (!busy) {
          setKey("");
          close();
        }
      }}
    >
      <Text style={{ color: c.text, fontSize: 16, lineHeight: 24 }}>
        Use your OpenRouter account for food-photo estimates wherever you have
        internet. Offline photos can still wait for Mac review.
      </Text>
      <Text style={{ color: c.textSecondary, fontSize: 14, lineHeight: 22 }}>
        The key stays in secure storage on this phone. It is never synced to
        your Mac or sent to the photo reader. Analysis uses your OpenRouter
        credits and requests private provider routing.
      </Text>
      <View style={{ gap: 8 }}>
        <Text style={{ color: c.text }}>OpenRouter API key</Text>
        <TextInput
          accessibilityLabel="OpenRouter food-photo API key"
          value={key}
          onChangeText={setKey}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="none"
          placeholder={
            status.connected
              ? "Paste a key to replace this connection"
              : "sk-or-…"
          }
          placeholderTextColor={c.textSecondary}
          style={{
            color: c.text,
            padding: 14,
            borderWidth: 1,
            borderColor: c.line,
            borderRadius: 12,
          }}
        />
      </View>
      <View style={{ gap: 8 }}>
        <Text style={{ color: c.text }}>Vision model</Text>
        <TextInput
          accessibilityLabel="Food vision model"
          value={model}
          onChangeText={setModel}
          autoCapitalize="none"
          autoCorrect={false}
          style={{
            color: c.text,
            padding: 14,
            borderWidth: 1,
            borderColor: c.line,
            borderRadius: 12,
          }}
        />
      </View>
      <Text style={{ color: c.textSecondary, fontSize: 13, lineHeight: 20 }}>
        GPT4.1 is a supported starting choice. Trident checks the live
        image-input model catalogue before saving. Model availability and
        credits can change; a connection does not guarantee a usable endpoint.
      </Text>
      {error ? (
        <Text accessibilityRole="alert" style={{ color: c.danger }}>
          {error}
        </Text>
      ) : null}
      <Button
        label="Connect food photo AI"
        disabled={busy}
        busy={busy}
        onPress={() => {
          setBusy(true);
          setError("");
          void configureFoodAI(key, model)
            .then((next) => {
              setKey("");
              changed(next);
              close();
            })
            .catch((e) => setError(e.message))
            .finally(() => setBusy(false));
        }}
      />
      {status.connected ? (
        <Button
          label="Disconnect food photo AI"
          variant="quiet"
          disabled={busy}
          onPress={() => {
            setBusy(true);
            void disconnectFoodAI()
              .then(() => {
                setKey("");
                changed({
                  connected: false,
                  model: "openai/gpt-4.1",
                  modelName: "GPT4.1",
                });
                close();
              })
              .catch((e) => setError(e.message))
              .finally(() => setBusy(false));
          }}
        />
      ) : null}
    </FoodSheet>
  );
}
