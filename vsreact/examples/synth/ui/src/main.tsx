// The synth showcase: PianoKeyboard playing through native calls, the
// four-corner ADSR editor, both wheels, a RingMeter riding native
// events — and full PostHog analytics (sessions, parameter usage,
// error tracking) through @vsreact/posthog.

import {
  render,
  configureTheme,
  native,
  View,
  Text,
  VERSION,
  ParamADSREnvelope,
  ParamHardwareKnob,
  ParamKnob,
  ParamPitchBend,
  ParamModWheel,
  PianoKeyboard,
  RingMeter,
  useNativeValue,
  formatPercent,
} from "@vsreact/core";
import {
  posthog,
  usePostHogParameters,
  useEditorSession,
  useScreen,
  PostHogErrorBoundary,
} from "@vsreact/posthog";

configureTheme({
  colors: {
    background: "#0A0812",
    panel: "#120F1E",
    well: "#0C0A16",
    line: "#2A2444",
    accent: "#A07DFF",
    text: "#EFEAFF",
    muted: "#8D85A8",
    faint: "#5C5675",
  },
});

posthog.init({
  defaultProperties: { plugin: "vsreact-synth-example", sdk_version: VERSION },
});

function OutputMeter() {
  const meter = useNativeValue("meter", { level: 0 });
  // No colour props anywhere in this panel: the built-ins paint with the
  // theme's accent (configureTheme above), so one token themes the whole UI.
  return (
    <RingMeter value={meter.level} size={72} trackColor="#FFFFFF12" format={formatPercent} label="OUT" />
  );
}

function App() {
  useEditorSession();
  usePostHogParameters();
  useScreen("Synth");

  return (
    <View className="w-full h-full bg-background items-center justify-center p-5">
      <View className="rounded-2xl border border-line bg-panel px-7 py-5 gap-4 items-center">
        <View className="flex-row items-center gap-2">
          <View className="w-[8] h-[8] rounded-full bg-accent" />
          <Text className="text-text text-[15] font-bold tracking-widest">VSREACT SYNTH</Text>
        </View>

        <View className="flex-row items-center gap-7">
          <ParamADSREnvelope
            attackId="attack"
            decayId="decay"
            sustainId="sustain"
            releaseId="release"
            width={230}
            height={100}
            label="ENVELOPE"
          />
          <View className="items-center gap-4">
            <ParamHardwareKnob paramId="cutoff" size={74} />
            <OutputMeter />
          </View>
        </View>

        <View className="flex-row items-end gap-6">
          <ParamPitchBend paramId="bend" height={104} label="PITCH" />
          <ParamModWheel paramId="mod" height={104} label="MOD" />
          <PianoKeyboard
            startNote={48}
            octaves={2}
            whiteKeyWidth={22}
            height={104}
            onNoteOn={(note) => native.call("synth:noteOn", { note })}
            onNoteOff={(note) => native.call("synth:noteOff", { note })}
          />
          <ParamKnob paramId="level" size={56} />
        </View>

        <Text className="text-faint text-[9] tracking-widest">
          PLAY THE KEYS · DRAG THE ENVELOPE · EVERY TWEAK REACHES POSTHOG
        </Text>
      </View>
    </View>
  );
}

render(
  <PostHogErrorBoundary fallback={<Text className="text-text p-6">The UI crashed — reopen the editor.</Text>}>
    <App />
  </PostHogErrorBoundary>,
);
