import { useEffect, useMemo, useRef } from "react";
import { View } from "react-native";
import { WebView } from "react-native-webview";
import { FOOD_IMAGE_CODEC } from "@/generated/food-image-codec";
export type FoodImageJob = {
  id: string;
  photo: string;
  mode: "photo" | "barcode";
};
export function FoodImageCodec({
  job,
  complete,
}: {
  job: FoodImageJob;
  complete: (result: { photo?: string; code?: string; error?: string }) => void;
}) {
  const finish = useRef(complete);
  finish.current = complete;
  const html = useMemo(() => {
    if (
      !/^[\w-]{1,100}$/.test(job.id) ||
      job.photo.length > 28 * 1024 * 1024 ||
      !/^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/.test(job.photo)
    )
      return "";
    return (
      '<!DOCTYPE html><html><head><meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; img-src data:; script-src &#39;unsafe-inline&#39;; connect-src &#39;none&#39;; frame-src &#39;none&#39;; base-uri &#39;none&#39;"></head><body><script>window.__foodImageJob=' +
      JSON.stringify(job) +
      ";" +
      FOOD_IMAGE_CODEC +
      "</script></body></html>"
    );
  }, [job]);
  useEffect(() => {
    if (!html) {
      finish.current({ error: "Choose a JPEG photo under 20 MB." });
      return;
    }
    const timer = setTimeout(
      () =>
        finish.current({
          error:
            "This photo took too long to read. Try a closer photo or type the barcode.",
        }),
      15000,
    );
    return () => clearTimeout(timer);
  }, [job.id, html]);
  return (
    <View
      pointerEvents="none"
      style={{ position: "absolute", width: 1, height: 1, opacity: 0 }}
    >
      <WebView
        source={{ html, baseUrl: "https://food-codec.local/" }}
        originWhitelist={["https://food-codec.local"]}
        javaScriptEnabled
        allowFileAccess={false}
        allowFileAccessFromFileURLs={false}
        allowUniversalAccessFromFileURLs={false}
        mixedContentMode="never"
        sharedCookiesEnabled={false}
        thirdPartyCookiesEnabled={false}
        setSupportMultipleWindows={false}
        onShouldStartLoadWithRequest={(r) =>
          r.url === "about:blank" || r.url === "https://food-codec.local/"
        }
        onMessage={(event) => {
          try {
            if (event.nativeEvent.data.length > 1000000) throw Error();
            const result = JSON.parse(event.nativeEvent.data);
            if (result.id !== job.id) throw Error();
            if (
              result.photo !== undefined &&
              (!/^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/.test(
                result.photo,
              ) ||
                result.photo.length > 900000)
            )
              throw Error();
            if (result.code !== undefined && typeof result.code !== "string")
              throw Error();
            complete(result);
          } catch {
            complete({
              error: "This photo returned an unreadable result. Try again.",
            });
          }
        }}
        onError={() =>
          complete({
            error: "The local photo reader did not start. Please try again.",
          })
        }
      />
    </View>
  );
}
