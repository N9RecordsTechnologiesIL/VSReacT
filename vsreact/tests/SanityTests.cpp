#include <vsreact/vsreact.h>

class FrameworkSanityTests final : public juce::UnitTest
{
public:
    FrameworkSanityTests() : juce::UnitTest ("VSReacT framework sanity") {}

    void runTest() override
    {
        beginTest ("QuickJS and Yoga link and initialise");
        expect (vsreact::frameworkSanityCheck());
    }
};

static FrameworkSanityTests frameworkSanityTests;
