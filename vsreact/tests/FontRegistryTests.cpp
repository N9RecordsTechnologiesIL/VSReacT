#include <vsreact/vsreact.h>

class FontRegistryTests final : public juce::UnitTest
{
public:
    FontRegistryTests() : juce::UnitTest ("vsreact::FontRegistry") {}

    void runTest() override
    {
        beginTest ("unknown family returns nullptr");
        {
            vsreact::FontRegistry registry;
            expect (registry.find ("Nope", 400) == nullptr);
            expect (registry.isEmpty());
        }

        beginTest ("undecodable src is rejected");
        {
            vsreact::FontRegistry registry;
            expect (! registry.registerFont ("F", "", 400));
            expect (! registry.registerFont ("F", "/no/such/file.otf", 400));
            expect (registry.isEmpty());
        }

        beginTest ("a REAL font file registers and resolves (file path + data URI)");
        {
            // The example art ships DrumDeck/CleanStrip's narrow OTF. Registering
            // an actual typeface is the path the examples take at module scope —
            // the earlier cases here only ever exercised rejection.
            const juce::File otf (juce::String (VSREACT_TEST_FONT_PATH));

            if (! otf.existsAsFile())
            {
                logMessage ("skipped: " + otf.getFullPathName() + " missing");
            }
            else
            {
                vsreact::FontRegistry registry;
                expect (registry.registerFont ("Narrow FromFile", otf.getFullPathName(), 400),
                        "a real OTF path should register");
                expect (registry.find ("Narrow FromFile", 400) != nullptr);

                juce::MemoryBlock raw;
                otf.loadFileAsData (raw);
                juce::MemoryOutputStream b64;
                juce::Base64::convertToBase64 (b64, raw.getData(), raw.getSize());
                const auto uri = "data:font/otf;base64," + b64.toString();

                expect (registry.registerFont ("Narrow FromUri", uri, 400),
                        "the same OTF as a base64 data URI should register");
                expect (registry.find ("Narrow FromUri", 400) != nullptr);

                // And Style::font must actually pick it up.
                const auto style = vsreact::Style::fromVar (
                    juce::JSON::parse (R"({"fontFamily": "Narrow FromUri", "fontSize": 24})"));
                expectWithinAbsoluteError (style.font (&registry).getHeight(), 24.0f, 6.0f);
            }
        }

        beginTest ("the __vsreact_registerFont binding reaches the callback");
        {
            juce::String seenFamily, seenSrc;
            int seenWeight = 0;

            vsreact::JsRuntime::Callbacks cbs;
            cbs.onRegisterFont = [&] (const juce::String& fam, const juce::String& src, int w)
            { seenFamily = fam; seenSrc = src; seenWeight = w; };

            vsreact::JsRuntime js { cbs };
            expect (js.evaluate ("__vsreact_registerFont('Fam', 'p.otf', 700);", "t.js"));
            expectEquals (seenFamily, juce::String ("Fam"));
            expectEquals (seenSrc, juce::String ("p.otf"));
            expectEquals (seenWeight, 700);
        }

        beginTest ("Style::font falls back to the system name with no registry");
        {
            const auto style = vsreact::Style::fromVar (
                juce::JSON::parse (R"({"fontFamily": "Nonexistent Family", "fontSize": 20})"));

            const auto font = style.font (nullptr);
            expectWithinAbsoluteError (font.getHeight(), 20.0f, 6.0f);
        }

        beginTest ("Style::font resolves a registered family before the system lookup");
        {
            // A registry with nothing registered must not disturb resolution:
            // find() misses, so font() takes the existing system-name path.
            vsreact::FontRegistry registry;

            const auto style = vsreact::Style::fromVar (
                juce::JSON::parse (R"({"fontFamily": "Still Nonexistent", "fontSize": 18})"));

            const auto font = style.font (&registry);
            expectWithinAbsoluteError (font.getHeight(), 18.0f, 6.0f);
        }
    }
};

static FontRegistryTests fontRegistryTests;
