// Presets, the JS half. Pairs with vsreact::PresetManager on the C++ side
// (chain its handleNativeCall in RootOptions::onNativeCall and attach() the
// RootView) — see that header for the preset:* protocol. usePresets is the
// headless hook; <PresetBrowser> is the strip every plugin header has:
// prev/next arrows, the current name (asterisk when edited) opening a menu,
// and save.

import { useCallback, useEffect, useState } from "react";
import { Text, TextInput, View } from "./primitives";
import { native } from "./native";
import { useNativeEvent, useLayoutRect } from "./hooks";
import { useOverlay } from "./overlay";
import { Modal } from "./popover";
import { Button } from "./button";
import { accentColor as themeAccent } from "./theme";

export interface PresetInfo {
  name: string;
  /** Compiled into the plugin; read-only from the UI. */
  factory: boolean;
}

export interface PresetState {
  presets: PresetInfo[];
  /** "" when nothing is loaded. */
  current: string;
  /** A parameter moved since the last load/save. */
  dirty: boolean;
  load: (name: string) => void;
  save: (name: string) => void;
  remove: (name: string) => void;
  next: () => void;
  prev: () => void;
}

const EMPTY: { presets: PresetInfo[]; current: string; dirty: boolean } = {
  presets: [],
  current: "",
  dirty: false,
};

/** Live preset state + actions. All state lives on the C++ side; the hook
    just mirrors the "preset" event, so any number of components agree. */
export function usePresets(): PresetState {
  const [state, setState] = useState(() => {
    const initial = native.call("preset:list");
    return initial && Array.isArray(initial.presets)
      ? { presets: initial.presets, current: String(initial.current ?? ""), dirty: !!initial.dirty }
      : EMPTY;
  });

  useNativeEvent("preset", (payload) => {
    if (payload && Array.isArray(payload.presets))
      setState({
        presets: payload.presets,
        current: String(payload.current ?? ""),
        dirty: !!payload.dirty,
      });
  });

  return {
    ...state,
    load: useCallback((name: string) => void native.call("preset:load", { name }), []),
    save: useCallback((name: string) => void native.call("preset:save", { name }), []),
    remove: useCallback((name: string) => void native.call("preset:delete", { name }), []),
    next: useCallback(() => void native.call("preset:next"), []),
    prev: useCallback(() => void native.call("preset:prev"), []),
  };
}

export interface PresetBrowserProps {
  width?: number;
  accentColor?: string;
  textColor?: string;
  backgroundColor?: string;
  borderColor?: string;
}

/** One row inside the dropdown menu. */
function MenuRow({
  name,
  active,
  accent,
  textColor,
  onPick,
}: {
  name: string;
  active: boolean;
  accent: string;
  textColor: string;
  onPick: () => void;
}) {
  return (
    <View className="px-3 py-1 cursor-pointer hover:bg-white/10" onClick={onPick}>
      <Text className="text-[12]" style={{ color: active ? accent : textColor }}>
        {name}
      </Text>
    </View>
  );
}

/** The header preset strip: ◀ [ name* ▾ ] ▶ [save]. Purely a view over
    usePresets — drop it anywhere; several instances stay in sync. */
export function PresetBrowser({
  width = 240,
  accentColor = themeAccent(),
  textColor = "#E6E6E0",
  backgroundColor = "#00000042",
  borderColor = "#FFFFFF1F",
}: PresetBrowserProps) {
  const presets = usePresets();
  const overlay = useOverlay();
  const [rect, onLayout] = useLayoutRect();
  const [menuOpen, setMenuOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState("");

  useEffect(() => {
    if (!menuOpen || rect === null) {
      overlay.hide();
      return;
    }

    const factory = presets.presets.filter((p) => p.factory);
    const user = presets.presets.filter((p) => !p.factory);
    const pick = (name: string) => {
      presets.load(name);
      setMenuOpen(false);
    };

    overlay.show(
      <View className="absolute inset-0" onClick={() => setMenuOpen(false)}>
        <View
          className="absolute rounded-[6] border py-1"
          style={{
            left: rect.x,
            top: rect.y + rect.height + 4,
            width: rect.width,
            borderColor,
            backgroundColor: "#141414F2",
            boxShadow: [{ color: "#000000A6", radius: 18, offsetY: 6 }],
          }}
        >
          {factory.map((p) => (
            <MenuRow key={p.name} name={p.name} active={p.name === presets.current} accent={accentColor} textColor={textColor} onPick={() => pick(p.name)} />
          ))}
          {factory.length > 0 && user.length > 0 ? <View className="h-[1] my-1" style={{ backgroundColor: borderColor }} /> : null}
          {user.map((p) => (
            <MenuRow key={p.name} name={p.name} active={p.name === presets.current} accent={accentColor} textColor={textColor} onPick={() => pick(p.name)} />
          ))}
          {presets.presets.length === 0 ? (
            <Text className="px-3 py-1 text-[11]" style={{ color: textColor + "88" }}>
              No presets yet — save one.
            </Text>
          ) : null}
        </View>
      </View>,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menuOpen, rect, presets.presets, presets.current]);

  const arrow = (glyph: string, onClick: () => void) => (
    <View
      className="w-[22] items-center justify-center cursor-pointer rounded-[4] hover:bg-white/10"
      onClick={onClick}
    >
      <Text className="text-[11]" style={{ color: textColor }}>
        {glyph}
      </Text>
    </View>
  );

  return (
    <View className="flex-row items-stretch rounded-[6] border overflow-hidden" style={{ borderColor, backgroundColor, height: 26 }}>
      {arrow("◀", presets.prev)}
      <View
        className="flex-row items-center justify-center gap-1 cursor-pointer border-l border-r px-2 hover:bg-white/5"
        style={{ width, borderColor }}
        onLayout={onLayout}
        onClick={() => setMenuOpen((open) => !open)}
      >
        <Text className="text-[12]" style={{ color: presets.current ? textColor : textColor + "77" }}>
          {(presets.current || "— no preset —") + (presets.dirty ? " *" : "")}
        </Text>
        <Text className="text-[8]" style={{ color: textColor + "99" }}>
          ▾
        </Text>
      </View>
      {arrow("▶", presets.next)}
      <View
        className="items-center justify-center px-2 cursor-pointer border-l hover:bg-white/10"
        style={{ borderColor }}
        onClick={() => {
          setSaveName(presets.current && !presets.presets.find((p) => p.name === presets.current)?.factory ? presets.current : "");
          setSaveOpen(true);
        }}
      >
        <Text className="text-[10] font-bold tracking-widest" style={{ color: accentColor }}>
          SAVE
        </Text>
      </View>

      <Modal open={saveOpen} onClose={() => setSaveOpen(false)} title="Save preset" width={280}>
        <View className="gap-3 p-1">
          <TextInput
            value={saveName}
            placeholder="Preset name"
            onChange={setSaveName}
            onSubmit={(value) => {
              if (value.trim()) presets.save(value.trim());
              setSaveOpen(false);
            }}
            className="rounded-[4] border px-2 py-1 text-[12]"
            style={{ borderColor, color: textColor, backgroundColor: "#00000055" }}
          />
          <View className="flex-row justify-end gap-2">
            <Button label="Cancel" size="sm" variant="ghost" onClick={() => setSaveOpen(false)} />
            <Button
              label="Save"
              size="sm"
              accentColor={accentColor}
              onClick={() => {
                if (saveName.trim()) presets.save(saveName.trim());
                setSaveOpen(false);
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}
