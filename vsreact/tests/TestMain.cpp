#include <juce_gui_basics/juce_gui_basics.h>

int main()
{
    juce::ScopedJuceInitialiser_GUI juceInit;

    juce::UnitTestRunner runner;
    runner.setAssertOnFailure (false);
    runner.runAllTests();

    int failures = 0;

    for (int i = 0; i < runner.getNumResults(); ++i)
    {
        const auto* result = runner.getResult (i);
        failures += result->failures;

        if (result->failures > 0)
        {
            std::cout << "FAIL: " << result->unitTestName
                      << " / " << result->subcategoryName << std::endl;

            for (const auto& message : result->messages)
                std::cout << "  " << message << std::endl;
        }
    }

    if (failures > 0)
    {
        std::cout << failures << " test failure(s)" << std::endl;
        return 1;
    }

    std::cout << "All tests passed" << std::endl;
    return 0;
}
