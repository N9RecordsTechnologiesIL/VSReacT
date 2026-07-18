// VSReacT example synth: 8 sine voices with a linear ADSR, pitch bend,
// mod-wheel vibrato, and a one-pole lowpass. The UI is React — the
// keyboard plays through native calls, the meter rides native events,
// and PostHog analytics run through vsreact::PostHogBridge.

#include <juce_audio_utils/juce_audio_utils.h>
#include <vsreact/vsreact.h>

class SynthProcessor final : public juce::AudioProcessor
{
public:
    SynthProcessor()
        : AudioProcessor (BusesProperties().withOutput ("Output", juce::AudioChannelSet::stereo(), true)),
          state (*this, nullptr, "PARAMS", createLayout())
    {}

    static juce::AudioProcessorValueTreeState::ParameterLayout createLayout()
    {
        juce::AudioProcessorValueTreeState::ParameterLayout layout;
        auto norm = [] (const char* id, const char* name, float def)
        {
            return std::make_unique<juce::AudioParameterFloat> (
                id, name, juce::NormalisableRange<float> (0.0f, 1.0f, 0.001f), def);
        };

        layout.add (norm ("attack", "Attack", 0.15f));
        layout.add (norm ("decay", "Decay", 0.35f));
        layout.add (norm ("sustain", "Sustain", 0.7f));
        layout.add (norm ("release", "Release", 0.3f));
        layout.add (norm ("cutoff", "Cutoff", 0.8f));
        layout.add (norm ("bend", "Pitch Bend", 0.5f));
        layout.add (norm ("mod", "Mod Wheel", 0.0f));
        layout.add (norm ("level", "Level", 0.75f));
        return layout;
    }

    void prepareToPlay (double sr, int) override
    {
        sampleRate = sr;
        for (auto& voice : voices)
            voice = {};
    }

    void releaseResources() override {}

    bool isBusesLayoutSupported (const BusesLayout& layouts) const override
    {
        return layouts.getMainOutputChannelSet() == juce::AudioChannelSet::stereo();
    }

    /** The UI keyboard plays through here (message thread). */
    void queueNote (int note, bool on)
    {
        const juce::ScopedLock lock (noteLock);
        pendingNotes.add ({ note, on });
    }

    void processBlock (juce::AudioBuffer<float>& buffer, juce::MidiBuffer& midi) override
    {
        juce::ScopedNoDenormals noDenormals;
        buffer.clear();

        {
            const juce::ScopedLock lock (noteLock);
            for (const auto& pending : pendingNotes)
                handleNote (pending.note, pending.on);
            pendingNotes.clearQuick();
        }
        for (const auto metadata : midi)
        {
            const auto message = metadata.getMessage();
            if (message.isNoteOn()) handleNote (message.getNoteNumber(), true);
            else if (message.isNoteOff()) handleNote (message.getNoteNumber(), false);
        }

        const float attack = state.getRawParameterValue ("attack")->load();
        const float decay = state.getRawParameterValue ("decay")->load();
        const float sustain = state.getRawParameterValue ("sustain")->load();
        const float release = state.getRawParameterValue ("release")->load();
        const float cutoff = state.getRawParameterValue ("cutoff")->load();
        const float bend = state.getRawParameterValue ("bend")->load();
        const float mod = state.getRawParameterValue ("mod")->load();
        const float level = state.getRawParameterValue ("level")->load();

        // Stage rates: 1ms..2s per full swing, linear segments.
        const auto rateFor = [this] (float t) {
            return 1.0f / float (juce::jmax (1.0, sampleRate * (0.001 + 2.0 * t * t)));
        };
        const float attackRate = rateFor (attack);
        const float decayRate = rateFor (decay);
        const float releaseRate = rateFor (release);
        const float bendMultiplier = std::pow (2.0f, (bend - 0.5f) * 4.0f / 12.0f); // ±2 st
        const float filterCoefficient = juce::jlimit (0.001f, 0.99f, cutoff * cutoff);

        auto* left = buffer.getWritePointer (0);
        auto* right = buffer.getNumChannels() > 1 ? buffer.getWritePointer (1) : nullptr;

        float peak = 0.0f;
        for (int i = 0; i < buffer.getNumSamples(); ++i)
        {
            lfoPhase += 5.0 / sampleRate; // 5 Hz vibrato
            if (lfoPhase >= 1.0) lfoPhase -= 1.0;
            const float vibrato = 1.0f + mod * 0.006f * std::sin (float (lfoPhase * juce::MathConstants<double>::twoPi));

            float mix = 0.0f;
            for (auto& voice : voices)
            {
                if (voice.stage == Voice::idle) continue;

                if (voice.stage == Voice::attackStage)
                {
                    voice.env += attackRate;
                    if (voice.env >= 1.0f) { voice.env = 1.0f; voice.stage = Voice::decayStage; }
                }
                else if (voice.stage == Voice::decayStage)
                {
                    voice.env -= decayRate;
                    if (voice.env <= sustain) { voice.env = sustain; voice.stage = Voice::sustainStage; }
                }
                else if (voice.stage == Voice::sustainStage)
                {
                    voice.env = sustain;
                }
                else if (voice.stage == Voice::releaseStage)
                {
                    voice.env -= releaseRate;
                    if (voice.env <= 0.0f) { voice = {}; continue; }
                }

                const auto hz = 440.0 * std::pow (2.0, (voice.note - 69) / 12.0) * bendMultiplier * vibrato;
                voice.phase += hz / sampleRate;
                if (voice.phase >= 1.0) voice.phase -= 1.0;
                mix += voice.env * std::sin (float (voice.phase * juce::MathConstants<double>::twoPi));
            }

            filtered += filterCoefficient * (mix * 0.22f - filtered);
            const float sample = filtered * level;
            left[i] = sample;
            if (right != nullptr) right[i] = sample;
            peak = juce::jmax (peak, std::abs (sample));
        }

        outputLevel.store (juce::jmax (peak, outputLevel.load() * 0.86f));
    }

    juce::AudioProcessorEditor* createEditor() override;
    bool hasEditor() const override { return true; }

    const juce::String getName() const override { return "VSReacT Synth"; }
    bool acceptsMidi() const override { return true; }
    bool producesMidi() const override { return false; }
    bool isMidiEffect() const override { return false; }
    double getTailLengthSeconds() const override { return 2.0; }
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
    std::atomic<float> outputLevel { 0.0f };

private:
    struct Voice
    {
        enum Stage { idle = 0, attackStage, decayStage, sustainStage, releaseStage };
        int note = -1;
        int stage = idle;
        float env = 0.0f;
        double phase = 0.0;
    };

    struct PendingNote { int note; bool on; };

    void handleNote (int note, bool on)
    {
        if (on)
        {
            for (auto& voice : voices)
            {
                if (voice.stage == Voice::idle)
                {
                    voice.note = note;
                    voice.stage = Voice::attackStage;
                    voice.env = 0.0f;
                    voice.phase = 0.0;
                    return;
                }
            }
            voices[0] = { note, Voice::attackStage, 0.0f, 0.0 }; // steal
        }
        else
        {
            for (auto& voice : voices)
                if (voice.note == note && voice.stage != Voice::idle && voice.stage != Voice::releaseStage)
                    voice.stage = Voice::releaseStage;
        }
    }

    std::array<Voice, 8> voices;
    juce::CriticalSection noteLock;
    juce::Array<PendingNote> pendingNotes;
    double sampleRate = 48000.0;
    double lfoPhase = 0.0;
    float filtered = 0.0f;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR (SynthProcessor)
};

//==============================================================================
class SynthEditor final : public juce::AudioProcessorEditor,
                          private juce::Timer
{
public:
    explicit SynthEditor (SynthProcessor& p)
        : AudioProcessorEditor (&p), processor (p), bridge (p.state)
    {
        // Put YOUR project's API key here (PostHog → Settings → Project).
        // It's a client-side ingestion token, but it's yours — don't ship
        // someone else's, and don't commit a real one to a public repo.
        vsreact::PostHogBridge::Options analytics;
        analytics.apiKey = "phc_YOUR_PROJECT_API_KEY";
        analytics.host = "https://eu.i.posthog.com";
        analytics.stateFile = juce::File::getSpecialLocation (juce::File::userApplicationDataDirectory)
                                  .getChildFile ("VSReacT Examples").getChildFile ("synth-posthog-id.txt");
        posthog = std::make_unique<vsreact::PostHogBridge> (analytics);

        vsreact::RootOptions options;
        options.bundleFile = juce::File (juce::String (SYNTH_EXAMPLE_BUNDLE_PATH));
        options.watchForChanges = true;
        options.onNativeCall = [this] (const juce::String& name, const juce::var& args) -> juce::var
        {
            if (name == "synth:noteOn") { processor.queueNote (int (args.getProperty ("note", 60)), true); return true; }
            if (name == "synth:noteOff") { processor.queueNote (int (args.getProperty ("note", 60)), false); return true; }
            if (auto handled = posthog->handleNativeCall (name, args)) return *handled;
            if (auto handled = bridge.handleNativeCall (name, args)) return *handled;
            return {};
        };

        root = std::make_unique<vsreact::RootView> (std::move (options));
        bridge.attach (*root);
        addAndMakeVisible (*root);
        setSize (560, 430);
        startTimerHz (30);
    }

    void resized() override { root->setBounds (getLocalBounds()); }

private:
    void timerCallback() override
    {
        auto* payload = new juce::DynamicObject();
        payload->setProperty ("level", processor.outputLevel.load());
        root->sendNativeEvent ("meter", juce::var (payload));
    }

    SynthProcessor& processor;
    vsreact::ParameterBridge bridge;
    std::unique_ptr<vsreact::PostHogBridge> posthog;
    std::unique_ptr<vsreact::RootView> root;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR (SynthEditor)
};

juce::AudioProcessorEditor* SynthProcessor::createEditor() { return new SynthEditor (*this); }

juce::AudioProcessor* JUCE_CALLTYPE createPluginFilter() { return new SynthProcessor(); }
