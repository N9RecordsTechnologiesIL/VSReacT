// A real stereo delay, UI entirely in React (the DirtyDelay reference art),
// parameters bound through vsreact::ParameterBridge — the same wiring as the
// gain example, but the processor is a circular-buffer delay line with a
// tone-controlled one-pole lowpass in the feedback path.
//
// Signal path per channel:
//   wet   = delayLine.read(time)
//   lp   += toneCoeff * (wet - lp)          // one-pole LP on the fed-back tail
//   write  = input + lp * (feedback/100)    // regenerate
//   out    = input * (1 - mix) + wet * mix  // dry/wet blend

#include <juce_audio_utils/juce_audio_utils.h>
#include <vsreact/vsreact.h>

class DelayProcessor final : public juce::AudioProcessor
{
public:
    DelayProcessor()
        : AudioProcessor (BusesProperties()
                              .withInput ("Input", juce::AudioChannelSet::stereo(), true)
                              .withOutput ("Output", juce::AudioChannelSet::stereo(), true)),
          state (*this, nullptr, "PARAMS", createLayout())
    {}

    static juce::AudioProcessorValueTreeState::ParameterLayout createLayout()
    {
        juce::AudioProcessorValueTreeState::ParameterLayout layout;

        layout.add (std::make_unique<juce::AudioParameterFloat> (
            "time", "Time",
            juce::NormalisableRange<float> (1.0f, 1000.0f, 1.0f), 347.0f,
            juce::AudioParameterFloatAttributes().withLabel ("ms")));

        layout.add (std::make_unique<juce::AudioParameterFloat> (
            "feedback", "Feedback",
            juce::NormalisableRange<float> (0.0f, 95.0f, 0.1f), 55.0f,
            juce::AudioParameterFloatAttributes().withLabel ("%")));

        layout.add (std::make_unique<juce::AudioParameterFloat> (
            "tone", "Tone",
            juce::NormalisableRange<float> (0.0f, 100.0f, 0.1f), 42.0f));

        layout.add (std::make_unique<juce::AudioParameterFloat> (
            "mix", "Mix",
            juce::NormalisableRange<float> (0.0f, 100.0f, 0.1f), 30.0f,
            juce::AudioParameterFloatAttributes().withLabel ("%")));

        layout.add (std::make_unique<juce::AudioParameterBool> (
            "bypass", "Bypass", true));

        return layout;
    }

    void prepareToPlay (double sr, int) override
    {
        sampleRate = sr;

        // Circular buffer big enough for the full 1000 ms sweep, plus a guard.
        const auto maxSamples = (int) std::ceil (sr * (kMaxDelayMs / 1000.0)) + 4;

        for (auto& line : delayLines)
            line.assign ((size_t) juce::jmax (4, maxSamples), 0.0f);

        writePos = 0;
        lowpassState[0] = lowpassState[1] = 0.0f;
        smoothedDelaySamples = float (sr * (347.0 / 1000.0));
    }

    void releaseResources() override {}

    bool isBusesLayoutSupported (const BusesLayout& layouts) const override
    {
        return layouts.getMainOutputChannelSet() == juce::AudioChannelSet::stereo()
            && layouts.getMainInputChannelSet() == juce::AudioChannelSet::stereo();
    }

    void processBlock (juce::AudioBuffer<float>& buffer, juce::MidiBuffer&) override
    {
        juce::ScopedNoDenormals noDenormals;

        const auto numSamples = buffer.getNumSamples();
        const auto numChannels = juce::jmin (2, buffer.getNumChannels());

        if (state.getRawParameterValue ("bypass")->load() >= 0.5f || delayLines[0].empty())
            return; // bypassed: input passes straight through

        const auto timeMs   = state.getRawParameterValue ("time")->load();
        const auto feedback = state.getRawParameterValue ("feedback")->load() / 100.0f;
        const auto tone     = state.getRawParameterValue ("tone")->load() / 100.0f;
        const auto mix      = state.getRawParameterValue ("mix")->load() / 100.0f;

        // Tone → one-pole LP coefficient. Map 0..1 to a cutoff of ~320 Hz
        // (dark) up to ~18 kHz (bright), exponentially, then to the standard
        // one-pole coefficient a = 1 - exp(-2*pi*fc/fs).
        const auto cutoffHz = 320.0 * std::pow (18000.0 / 320.0, (double) tone);
        const auto toneCoeff = (float) juce::jlimit (
            0.0, 1.0, 1.0 - std::exp (-2.0 * juce::MathConstants<double>::pi * cutoffHz / sampleRate));

        const auto targetSamples = (float) juce::jlimit (
            1.0, (double) (delayLines[0].size() - 2), sampleRate * (timeMs / 1000.0));

        const auto size = (int) delayLines[0].size();
        auto localWrite = writePos;

        for (int n = 0; n < numSamples; ++n)
        {
            // Smooth the read distance so TIME sweeps don't click (a slow glide).
            smoothedDelaySamples += 0.0004f * (targetSamples - smoothedDelaySamples);

            const auto readPosF = (float) localWrite - smoothedDelaySamples;
            int r0 = (int) std::floor (readPosF);
            const auto frac = readPosF - (float) r0;
            r0 = ((r0 % size) + size) % size;
            const auto r1 = (r0 + 1) % size;

            for (int ch = 0; ch < numChannels; ++ch)
            {
                auto& line = delayLines[(size_t) ch];
                auto* data = buffer.getWritePointer (ch);
                const auto dry = data[n];

                // Linear-interpolated tap.
                const auto wet = line[(size_t) r0] + frac * (line[(size_t) r1] - line[(size_t) r0]);

                // One-pole LP in the feedback path (darkens the tail).
                auto& lp = lowpassState[ch];
                lp += toneCoeff * (wet - lp);

                line[(size_t) localWrite] = dry + lp * feedback;

                data[n] = dry * (1.0f - mix) + wet * mix;
            }

            // Mono-safe: if only one channel is live, still advance its write.
            if (numChannels == 1)
                delayLines[1][(size_t) localWrite] = 0.0f;

            localWrite = (localWrite + 1) % size;
        }

        writePos = localWrite;
    }

    juce::AudioProcessorEditor* createEditor() override;
    bool hasEditor() const override { return true; }

    const juce::String getName() const override { return "VSReacT Delay"; }
    bool acceptsMidi() const override { return false; }
    bool producesMidi() const override { return false; }
    bool isMidiEffect() const override { return false; }
    double getTailLengthSeconds() const override { return kMaxDelayMs / 1000.0; }
    int getNumPrograms() override { return 1; }
    int getCurrentProgram() override { return 0; }
    void setCurrentProgram (int) override {}
    const juce::String getProgramName (int) override { return {}; }
    void changeProgramName (int, const juce::String&) override {}

    void getStateInformation (juce::MemoryBlock& destData) override
    {
        if (auto xml = state.copyState().createXml())
            copyXmlToBinary (*xml, destData);
    }

    void setStateInformation (const void* data, int sizeInBytes) override
    {
        if (auto xml = getXmlFromBinary (data, sizeInBytes))
            state.replaceState (juce::ValueTree::fromXml (*xml));
    }

    juce::AudioProcessorValueTreeState state;

private:
    static constexpr double kMaxDelayMs = 1000.0;

    std::array<std::vector<float>, 2> delayLines;
    std::array<float, 2> lowpassState { 0.0f, 0.0f };
    int writePos = 0;
    float smoothedDelaySamples = 0.0f;
    double sampleRate = 48000.0;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR (DelayProcessor)
};

//==============================================================================
class DelayEditor final : public juce::AudioProcessorEditor
{
public:
    explicit DelayEditor (DelayProcessor& p)
        : AudioProcessorEditor (&p),
          bridge (p.state)
    {
        vsreact::RootOptions options;
        options.bundleFile = juce::File (juce::String (DELAY_EXAMPLE_BUNDLE_PATH));
        options.watchForChanges = true;
        options.onNativeCall = [this] (const juce::String& name, const juce::var& args) -> juce::var
        {
            if (auto handled = bridge.handleNativeCall (name, args))
                return *handled;

            return {};
        };

        root = std::make_unique<vsreact::RootView> (std::move (options));
        bridge.attach (*root);
        addAndMakeVisible (*root);
        setSize (793, 496); // DirtyDelay plate 1586×992 ÷ 2
    }

    void resized() override
    {
        root->setBounds (getLocalBounds());
    }

private:
    vsreact::ParameterBridge bridge;
    std::unique_ptr<vsreact::RootView> root;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR (DelayEditor)
};

juce::AudioProcessorEditor* DelayProcessor::createEditor()
{
    return new DelayEditor (*this);
}

juce::AudioProcessor* JUCE_CALLTYPE createPluginFilter()
{
    return new DelayProcessor();
}
