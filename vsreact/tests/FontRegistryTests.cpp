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

        beginTest ("Style::font falls back to the system name with no registry active");
        {
            vsreact::Style::setActiveFontRegistry (nullptr);

            const auto style = vsreact::Style::fromVar (
                juce::JSON::parse (R"({"fontFamily": "Nonexistent Family", "fontSize": 20})"));

            const auto font = style.font();
            expectWithinAbsoluteError (font.getHeight(), 20.0f, 6.0f);
        }

        beginTest ("Style::font resolves a registered family before the system lookup");
        {
            // A registry with nothing registered must not disturb resolution:
            // find() misses, so font() takes the existing system-name path.
            vsreact::FontRegistry registry;
            vsreact::Style::setActiveFontRegistry (&registry);

            const auto style = vsreact::Style::fromVar (
                juce::JSON::parse (R"({"fontFamily": "Still Nonexistent", "fontSize": 18})"));

            const auto font = style.font();
            expectWithinAbsoluteError (font.getHeight(), 18.0f, 6.0f);

            vsreact::Style::setActiveFontRegistry (nullptr);
        }
    }
};

static FontRegistryTests fontRegistryTests;
