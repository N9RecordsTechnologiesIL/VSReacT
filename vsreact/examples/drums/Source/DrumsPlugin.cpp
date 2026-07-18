// VSReacT example drum machine: three synthesized voices (kick, snare,
// hat) on a 16-step internal clock. The React StepSequencer sends the
// pattern over native.call; the playhead comes back as native events.

#include <juce_audio_utils/juce_audio_utils.h>
#include <vsreact/vsreact.h>

class DrumsProcessor final : public juce::AudioProcessor
{
public:
    static constexpr int rows = 3;
    static constexpr int steps = 16;

    DrumsProcessor()
        : AudioProcessor (BusesProperties().withOutput ("Output", juce::AudioChannelSet::stereo(), true)),
          state (*this, nullptr, "PARAMS", createLayout())
    {
        // Default groove: four-on-the-floor, backbeat snare, eighth hats.
        for (int s = 0; s < steps; ++s)
        {
            pattern[0][s] = (s % 4 == 0);
            pattern[1][s] = (s % 8 == 4);
            pattern[2][s] = (s % 2 == 0);
        }
    }

    static juce::AudioProcessorValueTreeState::ParameterLayout createLayout()
    {
        juce::AudioProcessorValueTreeState::ParameterLayout layout;

        layout.add (std::make_unique<juce::AudioParameterFloat> (
            "tempo", "Tempo", juce::NormalisableRange<float> (60.0f, 180.0f, 1.0f), 120.0f,
            juce::AudioParameterFloatAttributes().withLabel ("BPM")));
        layout.add (std::make_unique<juce::AudioParameterBool> ("run", "Run", true));
        layout.add (std::make_unique<juce::AudioParameterFloat> (
            "level", "Level", juce::NormalisableRange<float> (0.0f, 1.0f, 0.01f), 0.8f));

        return layout;
    }

    void prepareToPlay (double sr, int) override
    {
        sampleRate = sr;
        sampleCounter = 0;
        kickEnv = snareEnv = hatEnv = 0.0f;
    }

    void releaseResources() override {}

    bool isBusesLayoutSupported (const BusesLayout& layouts) const override
    {
        return layouts.getMainOutputChannelSet() == juce::AudioChannelSet::stereo();
    }

    void setPattern (int row, int step, bool on)
    {
        if (row >= 0 && row < rows && step >= 0 && step < steps)
            pattern[row][step].store (on);
    }

    void processBlock (juce::AudioBuffer<float>& buffer, juce::MidiBuffer&) override
    {
        juce::ScopedNoDenormals noDenormals;
        buffer.clear();

        const bool run = state.getRawParameterValue ("run")->load() >= 0.5f;
        const float tempo = state.getRawParameterValue ("tempo")->load();
        const float level = state.getRawParameterValue ("level")->load();
        const auto samplesPerStep = juce::jmax (1, int (sampleRate * 60.0 / tempo / 4.0));

        auto* left = buffer.getWritePointer (0);
        auto* right = buffer.getNumChannels() > 1 ? buffer.getWritePointer (1) : nullptr;
        auto& random = juce::Random::getSystemRandom();

        for (int i = 0; i < buffer.getNumSamples(); ++i)
        {
            if (run)
            {
                if (sampleCounter == 0)
                {
                    const int step = currentStep.load();
                    if (pattern[0][step].load()) { kickEnv = 1.0f; kickPhase = 0.0; }
                    if (pattern[1][step].load()) { snareEnv = 1.0f; snarePhase = 0.0; }
                    if (pattern[2][step].load()) hatEnv = 1.0f;
                }
                if (++sampleCounter >= samplesPerStep)
                {
                    sampleCounter = 0;
                    currentStep.store ((currentStep.load() + 1) % steps);
                }
            }

            float mix = 0.0f;

            // Kick: a sine whose pitch falls 120 → 40 Hz as its envelope dies.
            if (kickEnv > 0.001f)
            {
                const auto hz = 40.0 + 80.0 * kickEnv;
                kickPhase += hz / sampleRate;
                mix += kickEnv * 0.9f * std::sin (float (kickPhase * juce::MathConstants<double>::twoPi));
                kickEnv *= 1.0f - 9.0f / float (sampleRate);
            }

            // Snare: noise burst plus a 180 Hz thump.
            if (snareEnv > 0.001f)
            {
                snarePhase += 180.0 / sampleRate;
                mix += snareEnv * (0.5f * (random.nextFloat() * 2.0f - 1.0f)
                                   + 0.3f * std::sin (float (snarePhase * juce::MathConstants<double>::twoPi)));
                snareEnv *= 1.0f - 18.0f / float (sampleRate);
            }

            // Hat: highpassed noise, very short.
            if (hatEnv > 0.001f)
            {
                const float noise = random.nextFloat() * 2.0f - 1.0f;
                hatLow += 0.25f * (noise - hatLow);
                mix += hatEnv * 0.3f * (noise - hatLow);
                hatEnv *= 1.0f - 70.0f / float (sampleRate);
            }

            const float sample = mix * level;
            left[i] = sample;
            if (right != nullptr) right[i] = sample;
            peakLevel = juce::jmax (peakLevel, std::abs (sample));
        }

        outputLevel.store (juce::jmax (peakLevel, outputLevel.load() * 0.86f));
        peakLevel *= 0.5f;
    }

    juce::AudioProcessorEditor* createEditor() override;
    bool hasEditor() const override { return true; }

    const juce::String getName() const override { return "VSReacT Drums"; }
    bool acceptsMidi() const override { return false; }
    bool producesMidi() const override { return false; }
    bool isMidiEffect() const override { return false; }
    double getTailLengthSeconds() const override { return 0.5; }
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
    std::atomic<int> currentStep { 0 };
    std::atomic<float> outputLevel { 0.0f };
    std::atomic<bool> pattern[rows][steps];

private:
    double sampleRate = 48000.0;
    int sampleCounter = 0;
    float kickEnv = 0.0f, snareEnv = 0.0f, hatEnv = 0.0f;
    double kickPhase = 0.0, snarePhase = 0.0;
    float hatLow = 0.0f;
    float peakLevel = 0.0f;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR (DrumsProcessor)
};

//==============================================================================
class DrumsEditor final : public juce::AudioProcessorEditor,
                          private juce::Timer
{
public:
    explicit DrumsEditor (DrumsProcessor& p)
        : AudioProcessorEditor (&p), processor (p), bridge (p.state)
    {
        vsreact::RootOptions options;
        options.bundleFile = juce::File (juce::String (DRUMS_EXAMPLE_BUNDLE_PATH));
        options.watchForChanges = true;
        options.onNativeCall = [this] (const juce::String& name, const juce::var& args) -> juce::var
        {
            if (name == "drums:cell")
            {
                processor.setPattern (int (args.getProperty ("row", 0)),
                                      int (args.getProperty ("step", 0)),
                                      bool (args.getProperty ("on", false)));
                return true;
            }
            if (name == "drums:pattern")
            {
                // The UI announces itself with its full grid on mount.
                if (auto* rowsVar = args.getProperty ("rows", juce::var()).getArray())
                    for (int r = 0; r < rowsVar->size(); ++r)
                        if (auto* row = (*rowsVar)[r].getArray())
                            for (int s = 0; s < row->size(); ++s)
                                processor.setPattern (r, s, bool ((*row)[s]));
                return true;
            }
            if (auto handled = bridge.handleNativeCall (name, args)) return *handled;
            return {};
        };

        root = std::make_unique<vsreact::RootView> (std::move (options));
        bridge.attach (*root);
        addAndMakeVisible (*root);
        setSize (520, 330);
        startTimerHz (30);
    }

    void resized() override { root->setBounds (getLocalBounds()); }

private:
    void timerCallback() override
    {
        auto* payload = new juce::DynamicObject();
        payload->setProperty ("n", processor.currentStep.load());
        payload->setProperty ("level", processor.outputLevel.load());
        root->sendNativeEvent ("step", juce::var (payload));
    }

    DrumsProcessor& processor;
    vsreact::ParameterBridge bridge;
    std::unique_ptr<vsreact::RootView> root;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR (DrumsEditor)
};

juce::AudioProcessorEditor* DrumsProcessor::createEditor() { return new DrumsEditor (*this); }

juce::AudioProcessor* JUCE_CALLTYPE createPluginFilter() { return new DrumsProcessor(); }
