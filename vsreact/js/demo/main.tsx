// VSReacT demo app â€” recreates the StashTrack react-juce backdrop, plus an
// interactive button to prove events once Task 8 lands.

import { useState } from "react";
import { render, View, Text, TextInput, configureTheme } from "../src";

configureTheme({
  colors: {
    background: "#0A0B0A",
    panel: "#101210",
    panelLift: "#14170F",
    well: "#0C0E0C",
    line: "#2B3029",
    accent: "#C6F135",
    text: "#E8EAE6",
    muted: "#9AA097",
  },
});

function Bar({ className }: { className: string }) {
  return <View className={`absolute bg-accent ${className}`} />;
}

function Counter() {
  const [count, setCount] = useState(0);

  return (
    <View
      className="w-[124] items-center justify-center bg-accent rounded-md cursor-pointer hover:bg-lime-200 active:bg-lime-500"
      onClick={() => setCount((c) => c + 1)}
    >
      <Text className="text-background font-bold text-sm tracking-wide">
        {count === 0 ? "CLICK ME" : `CLICKS: ${count}`}
      </Text>
    </View>
  );
}

function EchoField() {
  const [value, setValue] = useState("");

  return (
    <View className="flex-1 flex-row gap-3 items-center">
      <TextInput
        className="flex-1 h-full bg-background border border-line focus:border-accent rounded-md px-3 text-accent text-sm"
        placeholder="type here..."
        value={value}
        onChange={setValue}
      />
      <Text className="text-muted text-xs w-[110]">
        {value === "" ? "(empty)" : `echo: ${value}`}
      </Text>
    </View>
  );
}

function App() {
  return (
    <View className="w-full h-full bg-background p-[14]">
      <View className="flex-1 bg-panel border border-line">
        <View className="h-[52] bg-well">
          <Bar className="w-[10] h-[14] left-[22] top-[19]" />
          <Bar className="w-[10] h-[10] left-[38] top-[23]" />
          <Bar className="w-[10] h-[18] left-[54] top-[15]" />
        </View>
        <View className="h-px bg-line" />

        <View className="flex-1 m-[18] bg-well border border-line">
          <View className="h-[42] flex-row m-[18] mb-3 gap-3">
            <EchoField />
            <Counter />
          </View>

          <View className="h-[42] flex-row mx-[18] mb-[14] gap-3">
            <View className="w-[78] bg-panelLift border border-line rounded-md" />
            <View className="w-[116] bg-background border border-line rounded-md mr-[42]" />
            <View className="w-[116] bg-background border border-line rounded-md" />
          </View>

          <View className="flex-1 bg-panelLift border border-line m-[18] p-[18]">
            <View className="flex-1 bg-background border border-line items-center justify-center">
              <Text className="text-muted text-sm">Rendered natively by VSReacT</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

render(<App />);


