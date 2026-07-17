import { render, configureTheme, View, Text, ParamKnob } from "@vsreact/core";

configureTheme({
  colors: {
    background: "#060806",
    panel: "#0D100C",
    well: "#090B08",
    line: "#242B20",
    accent: "#C6F135",
    text: "#EDF1E4",
    muted: "#848D7B",
    faint: "#5A6253",
  },
});

function App() {
  return (
    <View className="w-full h-full bg-background items-center justify-center p-5">
      <View
        className="rounded-2xl border border-line bg-panel px-8 py-6 gap-5 items-center"
        style={{ shadowColor: "#00000088", shadowRadius: 24, shadowOffsetY: 8 }}
      >
        <View className="flex-row items-center gap-2">
          <View className="w-[8] h-[8] rounded-full bg-accent" />
          <Text className="text-text text-[15] font-bold tracking-widest">VSREACT GAIN</Text>
        </View>

        <View className="flex-row gap-10">
          <ParamKnob paramId="gain" size={88} />
          <ParamKnob paramId="pan" size={88} />
        </View>

        <Text className="text-faint text-[9] tracking-widest">
          REACT-RENDERED · APVTS-BOUND · AUTOMATION-SAFE
        </Text>
      </View>
    </View>
  );
}

render(<App />);
