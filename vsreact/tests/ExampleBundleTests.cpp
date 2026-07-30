#include <vsreact/vsreact.h>

#include <iostream>

// Headless smoke test: every example's built UI bundle must evaluate in
// QuickJS, emit a first commit, and raise no JS error. This catches the class
// of failure where a plugin launches but never shows an editor (the bundle
// threw or hung during the RootView constructor's evaluate()), which is
// otherwise only visible by launching a GUI.
//
// Bundles are built artifacts, so a missing one skips rather than fails.
class ExampleBundleTests final : public juce::UnitTest
{
public:
    ExampleBundleTests() : juce::UnitTest ("vsreact::ExampleBundles") {}

    void runTest() override
    {
        const juce::File examples { juce::String (VSREACT_EXAMPLES_DIR) };

        for (const auto* name : { "gain", "drums", "channel", "delay" })
        {
            beginTest (juce::String ("bundle evaluates: ") + name);

            const auto bundle = examples.getChildFile (name).getChildFile ("ui/build/main.js");

            if (! bundle.existsAsFile())
            {
                logMessage ("skipped (not built): " + bundle.getFullPathName());
                continue;
            }

            juce::String error, errorStack;
            int flushes = 0, createOps = 0;

            // Drive the ops into a real ShadowTree, lay it out, and paint it —
            // the RootView pipeline. Evaluating alone misses hangs/faults in
            // layout and painting, which is exactly where an editor that never
            // appears goes wrong.
            vsreact::ShadowTree tree;
            const int editorW = 900, editorH = 600;

            vsreact::JsRuntime::Callbacks cbs;

            cbs.onError = [&] (const juce::String& m, const juce::String& s) { error = m; errorStack = s; };

            cbs.onFlush = [&] (const juce::String& opsJson)
            {
                ++flushes;
                // Count node creations so "it rendered something" is measured,
                // not assumed.
                const auto ops = juce::JSON::parse (opsJson);
                if (auto* arr = ops.getArray())
                    for (const auto& op : *arr)
                        if (auto* one = op.getArray(); one != nullptr && one->size() > 0
                            && (*one)[0].toString() == "create")
                            ++createOps;

                tree.applyOpsJson (opsJson);
            };

            // Enough of the host surface that a real UI can start up.
            cbs.onLog = [] (const juce::String&, const juce::String&) {};
            cbs.onSetTimer = [] (int, int) {};
            cbs.onClearTimer = [] (int) {};
            cbs.onNativeCall = [] (const juce::String&, const juce::var&) { return juce::var(); };

            // Register fonts for real and activate the registry, as RootView
            // does — otherwise custom-typeface text silently falls back to a
            // system font and this never exercises the real paint path.
            vsreact::FontRegistry fonts;
            int fontsRegistered = 0, fontsFailed = 0;

            cbs.onRegisterFont = [&] (const juce::String& fam, const juce::String& src, int w)
            {
                if (fonts.registerFont (fam, src, w)) ++fontsRegistered;
                else ++fontsFailed;
            };

            const auto source = bundle.loadFileAsString();
            const auto started = juce::Time::getMillisecondCounterHiRes();

            vsreact::JsRuntime js { cbs };
            const bool ok = js.evaluate (source, bundle.getFileName());

            const auto evalMs = juce::Time::getMillisecondCounterHiRes() - started;

            // Layout, then paint into an offscreen image — timed separately so a
            // slow/hanging stage is identifiable.
            const auto laidOutAt = juce::Time::getMillisecondCounterHiRes();
            tree.computeLayout ((float) editorW, (float) editorH);
            const auto layoutMs = juce::Time::getMillisecondCounterHiRes() - laidOutAt;

            const auto paintStart = juce::Time::getMillisecondCounterHiRes();
            {
                vsreact::Style::setActiveFontRegistry (&fonts);
                juce::Image target (juce::Image::ARGB, editorW, editorH, true,
                                    juce::SoftwareImageType());
                juce::Graphics g (target);
                vsreact::Painter::paint (g, *tree.root(), target);
                vsreact::Style::setActiveFontRegistry (nullptr);
            }
            const auto paintMs = juce::Time::getMillisecondCounterHiRes() - paintStart;

            std::cout << "BUNDLE " << name << ": eval=" << juce::String (evalMs, 1)
                      << " ms layout=" << juce::String (layoutMs, 1)
                      << " ms paint=" << juce::String (paintMs, 1)
                      << " ms, flushes=" << flushes << ", creates=" << createOps
                      << ", fonts=" << fontsRegistered << "/" << (fontsRegistered + fontsFailed)
                      << (error.isNotEmpty() ? (", ERROR: " + error) : juce::String())
                      << std::endl;

            if (error.isNotEmpty())
                logMessage ("stack: " + errorStack);

            expect (ok, juce::String (name) + ": evaluate() failed");
            expect (error.isEmpty(), juce::String (name) + ": JS error: " + error);
            expect (createOps > 0, juce::String (name) + ": rendered no nodes");
        }
    }
};

static ExampleBundleTests exampleBundleTests;
